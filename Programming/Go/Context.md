# Context

## 1. What is `Context` in Go?

A `Context` or `context.Context` is an interface designed to pass request-scoped metadata, cancellation signals, and deadlines acrosss API boundaries and between goroutines.
When building a backend service in Go, `Context` is the foundation tool used to control the lifecycle of the concurrent processes.

### Core purpose

A web server receives an HTTP request. To process it, the server spawns a goroutine.
The goroutine calls a db, which might spawn another goroutine to handle a network timeout.
If the client suddenly closes their browser tab or disconnects halfway through, the main goroutine will stop.
However, without a coordination mechanism, the background db goroutines will keep running, burning CPU and db connection pools for a request that nobody cares about anymore.
This is called a **goroutine leak**.
`Context` solves this by forming a hierarchical tree.
When the top-level context is cancelled, that cancellation signal cascades down to every single child context, telling background goroutines to stop executing and return.

### 4 methods of the `Context` interface

```go
type Context interface {
    Deadline() (deadline time.Time, ok bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
```
- Signal gate `Done()`: It returns a receive-only channel (`<-chan struct{}`). When the context is cancelled or times out, this channel is closed. Because reading from a closed channel returns instantly, goroutines use a `select` block to listen to this channel and abort early.
- Reason `Err()`: Returns `nil` if the context is still active. If `Done()` is closed, it returns `context.Canceled` (manual cancel) or `context.DeadlineExceeded` (timeout).
- Clock `Deadline()`: Returns the exact time this context will be automatically destroyed, allowing operations to pace themselves.
- Carrier `Value()`: Used to look up request-scoped metadata passing through the call stack.

### Construct the context tree

Go provides 2 root contexts to kick off the tree:
- `context.Background()` used at the absolutely entry point of the app, like `main()`
- `context.TODO()` used as a placecholder if you are not sure which context to use

You can derive child contexts using 4 structural constructors:
- `context.WithCancel(parent)`: Creates a child context and returns a `cancel()` function. Calling `cancel()` manually closes the `Done()` channel of this child and all of its descendants.
- `context.WithTimeout(parent, duration)`: Automatically cancels the context after a relative duration, e.g. `500 * time.Millisecond`. Essential for bounding outbound HTTP or SQL db calls.
- `context.WithDeadline(parent, absoluteTime)`: Identical to `WithTimeout`, but takes a absolute target time, e.g. `time.Now().Add(5 * time.Minute)`.
- `context.WithValue(parent, key, value)`: Associates an immutable key-value pair with the context.

### Canonical pattern

How a background worker goroutine safely listens to a context to intercept an operation early:
```go
func QueryDatabase(ctx context.Context) ([]string, error) {
	// Create a channel to catch our slow DB results
	resultChan := make(chan []string, 1)

	go func() {
		// Simulate a slow database disk read
		time.Sleep(2 * time.Second)
		resultChan <- []string{"UserA", "UserB"}
	}()

	// The Select block waits on whichever channel responds first
	select {
	case <-ctx.Done():
		// The client left, or our timeout expired! Return early.
		return nil, ctx.Err()
	case res := <-resultChan:
		// The operation completed successfully before the context expired
		return res, nil
	}
}
```

### Critical production rules of context

- pass as the 1st argument: Context should always be passed explicitly as the very first parameter of a function, conventionally named `ctx`. Never store a context inside a struct field unless you're implementing a specific library wrapper like `http.Request`.
- never pass `nil`: If a function requires a context but you don't have one available, pass `context.TODO()` instead of `nil` to prevent runtime nil-pointer panics.
- values are for metadata, not args: Do not use `context.WithValue` to pass optional function parameters or business logic dependencies, e.g. db connection pools or config structs. Context values should be strictly reserved for request-scoped transient metadata, such as tracing IDs (`X-Request-ID`), authentication tokens, or IP addresses for telemetry logging.
- always call cancel: When using `WithCancel`, `WithTimeout`, or `WithDeadline`, always call the returned `cancel()` via a `defer` block. If you omit the cancel call, the child context will remain attached to the parent in memory until the entire parent scope dies, triggering severe memory leaks.

## 2. What are the uses of `Context` in Go?

See **core purpose** above.

## 3. How to look for `Context.Value`?

To look up a value inside a `context.Context`, you call its `Value(key)` method.
But this doesn't work like a hash map lookup. Instead, the context executes a linear, recursive search traveling upward from the current child node back to the root node.
Because `Context.Value()` returns data as an empty interface `any`, you must always use a Go Type Assertion to safely cast the returned value to its original concrete type/

```go
package main

import (
	"context"
	"fmt"
)

// 1. Define a custom, unexported type for the key to prevent naming collisions
type contextKey string

const traceIDKey contextKey = "trace_id"

func ProcessRequest(ctx context.Context) {
	// 2. Look up the value using our unique key type
	rawVal := ctx.Value(traceIDKey)
	if rawVal == nil {
		fmt.Println("Trace ID not found in context")
		return
	}

	// 3. Use a Type Assertion to safely convert 'any' back to 'string'
	traceID, ok := rawVal.(string)
	if !ok {
		fmt.Println("Context value is not a string!")
		return
	}

	fmt.Printf("Processing with Trace ID: %s\n", traceID)
}
```

### Under the Hood: Upward Search

When you add a value to a context using `context.WithValue(parent, key, val)`, Go creates a new child struct node called a `valueCtx`.
```go
// Inside src/context/context.go
type valueCtx struct {
    Context          // Embeds the parent context node
    key, val any     // Stores EXACTLY ONE key-value pair
}
```
Every single time you call `WithValue`, you add a single new layer to a linked list that points backward to its parent.
When you call `ctx.Value(targetKey)`, the runtime executes the following algo:
- It inspects the current `valueCtx` node. Does its local `key` match your `targetKey`? If yes, it returns `val` and exits.
- If it does not match, it follows the internal `Context` pointer to step one level up to the parent node.
- It repeats this check recursively, climbing all the way up the tree until it either finds a matching key or strikes the root `context.Background()`. If it reaches the root without a match, it returns `nil`.

### 3 Golden Rules

**A. Always use custom types for keys**

Never use raw string types or integers as a context key,e.g. `context.WithValue(ctx, "user_id", 123)`.
If an imported open-source lib also uses the raw string `"user_id"`, it will collide with your key and overwrite your data during the upward lookup loop.
Always declare a dedicated, unexported local type exclusively for context keys.
```go
type rawKey string // WRONG: Accessible across packages
type contextKey struct{} // CORRECT: Completely unique to this package
```

**B. Data must be immutable and request-scoped**

Context travels across multiple parallel goroutines simultaneously.
Because `Context` provides zero internal locking protections, any data stored within it must be 100% immutable (read-only).
If you store a standard pointer or a slice inside a context and let multiple goroutines write to it concurrently, you will trigger a severe data race and corrupt your memory.

**C. Never pass control dependencies**

Do not use `Context.Value` to pass optional function parameters, db connection pools, or config structs down your call stack, e.g. `ctx.Value("mysql_client")`.
It hides your code's architectural dependencies inside an opaque interface. A dev looking at your function signature won't know they need to pre-load a db into the context, turning compile-time safety checks into unexpected runtime panics.
Dependencies should always be passed explicitly as structural args or method receivers.

## 4. How to cancel `Context`?

There is no `ctx.Cancel()` method. Instead, a context is cancelled by invoking a unique `CancelFunc` returned to you when the child context was first created.
It ensures that only the goroutine that created the context has the authority to tear it down.
- The runtime locates the `cancelCtx` node in memory and instantly closes its internal `done` channel.
- It loops through a private internal map of the context's children and recursively calls `cancel()` on every single one of them. This ensures the cancellation signal propagates down the entire sub-tree branch instantly.
- It sets the context's internal `err` field to `context.Canceled` or `context.DeadlineExceeded` if triggered by a timeout.
- Finally, the child context unlinks itself from its parent context's child-tracking map. This breaks the heap reference link, allowing the Go GC to instantly sweep and reclaim the memory allocated to the dead child nodes.
No matter for `context.WithCancel`, `context.WithTimeout`, or `context.WithDeadline`, you must call the manual `cancel()` function. This shuts off the internal runtime timer. If you forget to call it, the timer stays alive and will cause memory and timer leaks.

### Production Rules

**A. Idiomatic variable naming**

The `CancelFunc` should always be explicitly named `cancel`.
```go
ctx, cancel := context.WithTimeout(parent, 2 * time.Second) // Correct
```

**B. Immediate defer pattern**

Always write `defer cancel()` on the very next line after initializing a cancelable context.

**C. Check context viability in long loops**

If a background worker is processing data in a tight loop, e.g. reading lines from a massive file or processing streaming messages, check the context state on every iteration so you can stop work immediately if the client disconnects.
```go
for {
    if err := ctx.Err(); err != nil {
        return err // Abort loop if context was cancelled
    }
    processNextItem()
}
```