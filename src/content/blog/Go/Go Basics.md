---
title: 'Go Basics'
description: 'Go fundamentals: language strengths, syntax, and tooling.'
pubDate: 2026-07-11
tags: ['go']
---
# Go Basics

## 1. What are the pros of using Go compared to other languages?

- simplicity, maintainability, scale: minimal syntax and strict tooling
- high-performance concurrency: goroutines
- efficient memory management
- build for cloud native and distributed systems

## 2. What is goroutine?

It's a lightweight thread of execution managed entirely by Go runtime, rather than OS.
- A goroutine starts with a small dynamic stack of only 2KB. It grows and shrinks in the heap as needed, so you can run lots of goroutines simultaneously on a small server.
- Creating an OS thread requires a costly system call via the OS kernel. Goroutines are created and destroyed via the Go runtime user space, which is faster and cheaper.
- Switching context between 2 goroutines involves saving only a few registers, making it faster than OS switching context between 2 threads.

Go handles this massive scaling through a runtime scheduler GMP:
- G (goroutine): goroutine itself, its stack, its current execution state
- M (machine / OS thread): a physical OS thread created and managed by the kernel
- P (processor): a logical processor or context required to execute Go code.
Instead of mapping 1 Goroutine to 1 OS thread, the Go runtime multiplexes N Goroutines onto M OS threads (M:N).

How GMP handles blocking:
- network/channel blocking: If a goroutine blocks on a network read or a channel operations, the scheduler detaches the goroutine from the thread (M) and parks it. The thread keeps running other active goroutines. Once the network data arrives, the parked goroutine is woken up and placed back in a run queue.
- syscall blocking: If a goroutine makes a blocking OS syscall (e.g. reading a file from disk), the thread (M) will block. The scheduler detects this, detaches the processor (P) from the blocked thread, and attaches P to a new or idle OS thread to keep running other goroutines.
- work-stealing: If a particular processor (P) runs out of goroutines to execute in its local queue, it will attempt to steal half of the goroutines from another P's queue to balance the CPU load across cores.

```go
package main

import (
	"fmt"
	"time"
)

func computeTask(id int) {
	fmt.Printf("Task %d started\n", id)
	time.Sleep(500 * time.Millisecond) // Simulating an I/O bound database call
	fmt.Printf("Task %d finished\n", id)
}

func main() {
	// Spawning 3 concurrent tasks using the 'go' keyword
	for i := 1; i <= 3; i++ {
		go computeTask(i)
	}

	// If we don't pause the main goroutine, the program will terminate
	// before the asynchronously spawned goroutines have a chance to execute.
	time.Sleep(1 * time.Second)
	fmt.Println("Main program exiting.")
}
```
When you execute the `go computeTask(i)` command lines inside the loop, the task does not run instantly.
Instead, the Go scheduler performs the following steps:
- It creates a new goroutine structure G.
- It assigns the `computeTask` function pointer to that G.
- It places that G onto the back of the current P's LRQ.
This entire tracking process takes a fraction of a microsecond. The loop spins 3 times, dumps 3 G structures into the local queue, and then immediately hits the next line of code in `main()`.
If the sleep line is deleted, the `main` goroutine finishes so rapidly that the underlying Ms never even get a chance to pop `G1`, `G2`, or `G3` off the queue and context-switch into them.
This is a classic data race between the termination of the main goroutine and the scheduling of the worker goroutines, the output is non-deterministic.

## 3. What are the differences between goroutine, thread, and process?

| Dimension | Process | Thread | Goroutine |
| --- | --- | --- | --- |
| Managed By | OS kernel | OS kernel | Go runtime scheduler |
| Memory Allocation | dedicated address space (isolated) | shared heap within process; fixed 1-2 MB stack | shared heap within process; dynamic 2 KB starting stack |
| Creation/Switch Cost | extremely high, requires page table swaps | medium, requires kernel-space transition | extremely low, happens entirely in user space |
| Communication Mechanism | IPC (sockets, pipes, shared memory) | shared memory with synchronization (mutexes) | channels (CSP model) or mutexes |
| Scale Capacity | hundreds per machine | thousands per machine | hundreds of thousands per machine |

**Process:** an OS-level abstraction representing an executing instance of a program
- memory isolation: every process gets its own dedicated virtual address space, containing its own code, data, heap, and stack. a process cannot r/w to another process's memory without inter-process communication (IPC).
- resource ownership: OS allocates system resources, e.g. file descriptors, network ports, security contexts, memory, directly to the process.
- overhead: creating, destroying, or context-switching between processes is expensive because the OS kernel must completely swap out memory page tables and hardware registers.

**Thread:** the smallest unit of execution that an OS kernel can schedule.
- shared memory: all threads within the same process share the process's virtual address space (heap, global vars, file descriptors). but each thread retains its own private stack to track function calls and local vars.
- concurrency: because of shared memory, threads can communicate with each other fast. but this introduces risk of data races and requires sync primitives like mutexes and semaphores.
- overhead: lighter than process, still heavy. it requires entering kernel space, and the fixed stack size of thread limits the number of concurrent threads.

**Goroutine:** a lightweight, user-space thread managed entirely by Go runtime.
- M:N scheduler: Go runtime uses an internal scheduler to map N goroutines onto M OS threads. Os kernel only knows about the M threads, has no idea the goroutines even exist.
- dynamic stacks: a goroutine starts with a 2 KB stack, Go runtime dynamically grows and shrinks this stack in the heap as needed.
- ultra-low context switching: switching between goroutines happens entirely in user space. it only requires saving and restoring a few CPU registers.

## 4. What are the differences between `make` and `new`?

- `new`: when you call `new(T)`, Go runtime allocates enough memory to fit a value of type `T`, initializes that memory to the type's **zero value**, and returns a pointer to it (*T).
- `make`: a special allocator reserved only for Go's 3 built-in reference/composite collection types: `Slice`, `Map`, `Channel`. Unlike a primitive integer or a basic struct, the 3 types are descriptor structures under the hood. They contain internal pointers, lengths, capacities, or runtime tracking structures (e.g. hash buckets inside a map or the ring buffer queues inside a channel). `make` initialized these internal state machines so they are ready for runtime operations.
```go
type User struct {
    Name string
    Age  int
}

// Allocates memory for a User struct and zeroes it out
uPtr := new(User)

fmt.Printf("%T\n", uPtr) // Output: *main.User (It's a pointer!)
fmt.Println(uPtr.Name)   // Output: "" (Zero value for string)
fmt.Println(uPtr.Age)    // Output: 0  (Zero value for int)

// Allocates and initializes a map descriptor with room for 10 elements
m := make(map[string]int, 10)

m["key"] = 100            // Perfectly valid!
fmt.Printf("%T\n", m)    // Output: map[string]int (It's the actual value/header, not a pointer)

// Contrast with new:
badMapPtr := new(map[string]int) // Allocates space for a map pointer and zeroes it
// *badMapPtr = make(map[string]int) // You would have to manually initialize it first
// (*badMapPtr)["key"] = 100     // PANIC: assignment to entry in nil map!
```

Primitive: fixed-size type whose data is stored directly within the variable's allocated memory block.
`int`, `int32`, `uint64`, `float32`, `float64`, `bool`, `string`
While a Go sring header contains a pointer to an immutable underlying byte array, it behaves as a read-only primitive type.
- direct value storage
- pass by value
- stack-friendly: since their sizes are known at compile time, primitives are highly optimized for allocation directly onto the fast execution stack rather than the heap.

Descriptor: a small, fixed-size structural metadata object that manages a dynamic, complex data structure living elsewhere in memory (usually on heap).
`slice`, `map`, `channel`
Instead of a variable holding the actual collection data directly, the variable holds a descriptor header. This header acts as a state machine coordinating with Go runtime.
- slice descriptor: for a contiguous segment of an underlying array. takes exactly 24 bytes on a 64-bit architecture.
  - pointer: a memory address pointing to the 1st element of the underlying array
  - length (`len`): an integer tracking how many elements are currently in the slice
  - capacity (`cap`): an integer tracking the maxium total elements the array can hold before resizing
- map descriptor: a pointer to a complex runtime descriptor struct called `hmap`.
  - number of elements currently in the map
  - a log-scale integer representing the number of hash buckets
  - a pointer to the memory block holding the hashing buckets
  - tracking flags for concurrent iteration or map writing (used to trigger thread-safety panics)
- channel descriptor: a pointer to an `hchan` descriptor struct, managing concurrent communication.
  - a circular ring-buffer queue tracking sent data elements
  - a mutex lock protecting the channel state during concurrent operations
  - wait-queues tracking blocked goroutines waiting to send (`sendq`) or receive (`recvq`) data

## 5. What are the differences between array and slice?

| Feature | Array | Slice |
| --- | --- | --- |
| type definition | size is explicit: `[5]int` | size is omitted: `[]int` |
| size flexibility | fixed at compile time, cannot be changed | dynamic, can grow using `append()` |
| variable nature | value type, stores data directly | reference descriptor, stores pointer to data |
| function passing | copies the whole data payload (heavy) | copies only the 24-byte descriptor (light) |
| initialization | safe to use immediately with zeroed values | zero value is `nil`. best initialized via `make`, literal, or slicing an array |

## 6. When using `for range`, will the address of the variable change?

Since Go 1.22, the address of the variable changes with every single iteration.
The compiler treats the `for range` loop variable as a completely new variable instance created specifically for that iteration. Each iteration gets its own unique memory address on the stack.

But in Go 1.21 and before, the address stayed exactly the same across all iterations. On every iteration, Go simply overwrote the value inside that memory slot.

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    nums := []int{10, 20, 30}

    for _, v := range nums {
        // Go 1.22
        fmt.Printf("Value: %d, Address: %p\n", v, &v)

        // Go 1.21
        // By the time the goroutine executed, v had already been overwitten by the last element (30).
        go func() {
            fmt.Println(v)
        }
    }
    // Go 1.21
    time.Sleep(100 * time.Millisecond)
}
```

In Go 1.22+, `for range` always iterates over a copy of the elements, not the original elements.
So if we use `for _, p := range products`, the pointer `&p` is referencing transient loop structure. If those memory scopes clear or alter, we risk data bugs. It's better to use `for i := range products` and `&products[i]`.

## 7. How to concatenate strings efficiently?

Under the hood, a Go string is a read-only slice of bytes. Every time you alter a string, Go cannot modify the existing memory block, it must allocate a brand new byte array on the heap and copy the old contents over.
`string.Builder` maintains an internal mutable byte slice `[]byte` to accumulate the content. It allows you to pre-allocate memory. When you call `.String()`, it performs an unsafe pointer conversion to return the string without allocating a fresh copy of the backing array.
```go
package main

import (
    "strings"
    "fmt"
)

func main() {
    var builder strings.Builder

    // Optimization: pre-allocate memory to achieve exactly 0 allocations inside the loop
    builder.Grow(32)

    for i := 0; i < 5; i++ {
        builder.WriteString("go")
    }

    result := builder.String()
    fmt.Println(result)
}
```

If the string components are already packed inside a slice or an array, `strings.Join` is fastest and cleanest.
```go
elements := []string{"microservice", "gateway", "database"}
// Allocates memory exactly once
result := strings.Join(elements, "->")
```

## 8. What's the execution order of `defer`? What are the effects of `defer` and what are the use cases?

execution order: LIFO
When the surrounding function finishes executing, the deferred calls are popped off the stack.
```go
package main

import "fmt"

func main() {
	fmt.Println("Start")

	defer fmt.Println("First Defer")
	defer fmt.Println("Second Defer")
	defer fmt.Println("Third Defer")

	fmt.Println("End")
}

// --- Output ---
// Start
// End
// Third Defer
// Second Defer
// First Defer
```

Rules:
- arguments are evaluated immediately, not at execution time
- `defer` can modify named return values

```go
func evaluationDemo() {
	i := 0
	defer fmt.Println("Deferred value of i:", i) // i is evaluated and captured as 0 HERE

	i++
	fmt.Println("Current value of i:", i)
}
// --- Output ---
// Current value of i: 1
// Deferred value of i: 0

func namedReturnDemo() (result int) {
	defer func() {
		result++ // Modifies the named return variable directly
	}()
	return 5 // 1. 'result' is assigned 5 -> 2. defer runs (result becomes 6) -> 3. returns 6
}
// namedReturnDemo() returns 6!
```

Use cases:
- `defer close` files, db connections, sockets, HTTP response bodies after opening
- `defer c.mu.Unlock()` release a sync lock to prevent deadlocks
- panic recovery
- avoid `defer` in long loops

## 9. What is `rune` type?

It's a built-in data-type as an alias for `int32`.
A `rune` represents a single Unicode code point.
A standard Go string is a read-only slice of bytes encoded in UTF-8, but a Chinese char or an emoji can take up multiple bytes. But a `rune` allocates 32 bits (4 bytes) of memory, large enough to hold any Unicode code point.
```go
package main

import "fmt"

func main() {
	str := "Go世界"

	// Cast the string to a slice of runes
	runes := []rune(str)

	fmt.Println(len(runes)) // Output: 4 (Correct! There are 4 distinct Unicode characters)

	// Now indexing works perfectly
	fmt.Printf("%c\n", runes[2]) // Output: 世
}
```

## 10. What are the uses of tags in Go?

Struct tags are strings of metadata attached to the fields of a struct definition.
They provide instructions to other packages (e.g. encoders, decoders, ORMs, validators) on how to handle, convert, or validate that specific field at runtime using **reflection**.

Use cases:
- JSON and XML serialization / deserialization
- ORM data mapping
- request body validation

```go
// serialization
type Product struct {
    Name     string `json:"product_name"`
    Quantity int    `json:"qty,omitempty"` // Dropped from JSON if Quantity == 0
    Secret   string `json:"-"`             // Never exposed in JSON payloads
}

// ORM
type Order struct {
    OrderID   string    `gorm:"column:order_id;primaryKey;type:uuid"`
    Amount    float64   `gorm:"column:total_amount;type:decimal(10,2)"`
    CreatedAt time.Time `gorm:"column:created_at;index"`
}

// validation
type RegistrationRequest struct {
    Username string `json:"username" validate:"required,alphanum,min=4"`
    Age      int    `json:"age"      validate:"required,gte=18,lte=120"`
}
```
Reflection comes with computational overhead, so major production packages (e.g. `encoding/json`) optimize execution by caching struct tag analysis results in internal maps.

## 11. What are the differences between `%v`, `%+v`, and `%#v` during printing?

When printing complex data types like structs, arrays, maps, etc.
`%v` prints only the raw structual values of the fields.
`%+v` prints the structural values plus the names of the fields.
`%#v` prints the value formatted as a Go syntax literal, showing the exact type definition and field assignments as if you were writing it in source code.

```go
package main

import "fmt"

type Account struct {
	Username string
	ID       int64
	IsActive bool
}

func main() {
	user := Account{
		Username: "fedora",
		ID:       99012,
		IsActive: true,
	}

	// 1. Standard Value Formatter
	fmt.Printf("Using %%v:  %v\n", user)

	// 2. Plus Field Name Formatter
    // Logging standard
	fmt.Printf("Using %%+v: %+v\n", user)

	// 3. Go Syntax Representation Formatter
    // For deep debugging
	fmt.Printf("Using %%#v: %#v\n", user)
}

// --- Output ---
// Using %v:  {fedora 99012 true}
// Using %+v: {Username:fedora ID:99012 IsActive:true}
// Using %#v: main.Account{Username:"fedora", ID:99012, IsActive:true}
```

## 12. Does empty `struct{}` occupy memory?

It occupies 0 bytes of memory.
Go runtime allocates memory for variables using an internal global variable `zerobase`. It's a single, opaque `uintptr`, i.e. an integer representation of a memory address, used as a placeholder for every single zero-sized allocation.
It you create multiple independent empty structs, their pointers all point to the exact same `zerobase` memory address.

## 13. What are the uses of empty `struct{}`?

- implementing a set: Go doesn't have a native `set` collection, but using a `map` to build a set. If use a boolean as the map value (`map[string]bool`), each entry still consumes 1 byte for the value slot. By using `struct{}`, it takes up 0 bytes.
```go
// Highly optimized Set implementation
set := make(map[string]struct{})

// Adding items
// struct{} is a data type, defining an empty structure that contains 0 fields.
// struct{}{} is a value instance, initializing the struct{} type with no values.
set["user_123"] = struct{}{}
set["user_456"] = struct{}{}

// Checking existence (Highly performant, 0 extra memory consumed)
if _, exists := set["user_123"]; exists {
    fmt.Println("User exists!")
}
```
- channel signaling: When you use a channel purely to signal that an async task has finished, you don't care about the data inside the channel, but only care about the event of the channel receiving a value or closing. Using `chan struct{}` ensures the signal carries zero data weight.
```go
func worker(done chan struct{}) {
    // Perform complex background business logic...
<<<<<<< HEAD

    // Send an empty struct signal to wake up the main program
    done <- struct{}{}
}
```

## 14. When is `init()` executed?

`init()` executes after package-level variables are evaluated and initialized, but before the `main()` function begins executing.
Startup lifecycle of a Go program:
- import packages
- initialize package variables
- execute `init()` functions inside the loaded packages
- execute `main.main()`
If there are multiple packages nested across dependencies, Go evalutes them in depth-direst order based on the import graph. Go runtime resolves down to the deepest independent package first, runs its `init()`, then moves back up to the upstream package, runs its `init()`, until it finally handles the `main` package.

## 15. Can we compare 2 interfaces?

Yes, we can compare 2 interfaces using `==` and `!=`.
An interface is represented as a 2-word data structure containing 2 pointers:
- dynamic type (`_type` or `tab`): a pointer to the metadata describing the underlying concrete type
- dynamic value: (`data`): a pointer to the actual concrete value or data instance assigned to it

2 interfaces are considered equal **if and only if** their dynamic types are identical and dynamic values are equal.

An interface is only equal to `nil` if both its dynamic tyoe and dynamic value are `nil`. If you assign a typed pointer that happens to be `nil` to an interface, the interface itself is not `nil`.

2 interfaces are equal if they are both `nil`.

If the dynamic type assigned to the interface is not comparable (e.g. slice, map, function), attempting to compare the interfaces will compile prefectly but cause an immediate **runtime panic**.


## 16. Can 2 `nil` not equal to each other?

Yes.
- typed `nil` pointer and literal `nil`
```go
package main

import "fmt"

type CustomError struct {
    Message string
}

func (e *CustomError) Error() string {
    return e.Message
}

func main() {
    // a concrete pointer initialized to nil
    var concretePtr *CustomError = nil
    // an interface initialized to that concrete pointer
    var err error = concretePtr

    fmt.Println("Is concretePtr nil?", concretePtr == nil)  // true
    fmt.Println("Is interface err nil?", err == nil)        // false
}
```
- 2 typed `nil` interfaces with different types
```go
package main

import "fmt"

type Worker interface{ Work() }
type Reader interface{ Read() }

type Employee struct{}
func (e *Employee) Work() {}

type Document struct{}
func (d *Document) Read() {}

func main() {
	var w Worker = (*Employee)(nil) // Type: *Employee, Value: nil
	var r Reader = (*Document)(nil) // Type: *Document, Value: nil

	// Converting one interface to an empty interface to allow comparison
	fmt.Println(interface{}(w) == interface{}(r)) // Output: false!
}
```

## 17. Does Go pass by value or by reference?

Pass by value.
For primitive types or basic structs, Go copies the data bytes directly onto the function's stack frame. Modifying it inside the function has zero effect on the caller.
For pointers, Go copies the memory address pointer by value.
```go
func modifyPointer(ptr *int) {
	*ptr = 999 // Dereferences the copy of the pointer to alter the source data
	ptr = nil  // Overwrites the local copy of the pointer variable itself
}

func main() {
	num := 10
	modifyPointer(&num)
	fmt.Println(num) // Output: 999 (The value was changed!)
}
```
For slice, map, channel, Go copies the small descriptor header by value.

## 18. How do we know if an object is allocated on the stack or on the heap?

We cannot know where the objects live by looking at the syntax declarations.
Go compiler executes an automated phase called **Escape Analysis** at compile time:
- If a variable will never be referenced outside the execution scope of the function it was created in, it's allocated on the stack. Stack memory is incredibly fast and self-cleans immediately when the function returns.
- If a variable escapes the boundary of its parent function, the compiler must allocate it on the heap. Heap memory is managed by Garbage Collector (GC), which adds tracking and runtime cleaning overhead.

Scenarios:
- If a function creates a local variable and returns its memory address, that variable escaps to the heap.
- If you pass a stack-allocated variable to a function that takes an empty interface (`interface{}` or `any`), the dynamic type descriptor wrapper forces the variable to escape to the heap.
- If you initialze a slice or a map with a size that is completely variable, or if the size exceeds a specific stack architecture threshold, the backing array will be sent straight to the heap.
```go
size := 10
s := make([]int, size) // size is a variable, not a constant, escapes to the heap
```
- If you store a pointer to variable `B` inside variable `A`, and variable `A` escapes to the heap, then variable `B` is forced to escape to the heap along with it, regardless of its local scope.

## 19. How to implement multiple return values in Go?

Historically, Go uses a **stack-based calling convention**, passing everything via the stack memory frame.
Go 1.17 introduced a **register-based calling convention** for 64-bit architectures.
- The compiler maps each return value to a specific, standard CPU register in sequence.
- The executing function writes the return values directly into these registers.
- The function issues a CPU `RET` instruction to pop the instruction pointer back to the caller.
- The caller function reads the values directly out of those CPU registers.
This mechanism is incredibly fast because it happens entirely within the CPU at zero-memory-access cost.

If you return more values than the number of available CPU registers, or if the structures you are returning are too large to fit in a 64-bit register, the compiler triggers **stack spilling**, falling back to standard stack-frame space reservation.
- compile time analysis: the caller function computes exactly how much space its arguments and the child's return values will require. It grows its own stack frame downwards to reserve an explicit, contiguous block of memory for the incoming return values.
- runtime execution: the caller executes the `CALL` instruction, jumping execution to the child function. The child function executes its business logic.
- stack unwinding: the child function destroys its local stack frame by moving the stack pointer back up. It then issues a `RET` command. The caller immediately reads the populated slots inside its own frame scope.
Because the caller reserves the return space up front, Go avoids the performance penalty of having the child allocate memory and push it back up, or having to allocate temporary heap objects.

```go
package main

import "fmt"

// Signature defines TWO return types: (int, int)
func calculate(a int, b int) (int, int) {
	sum := a + b
	product := a * b

	return sum, product // Returns both values simultaneously
}

func main() {
	// Receiving multiple return values
	s, p := calculate(5, 10)

	fmt.Printf("Sum: %d, Product: %d\n", s, p)
}
```

## 20. What are the uses of `_` in Go?

It's a built-in keyword known as the **blank identifier**.
It tells the Go compiler: I'm required by syntax to put a variable name here, but I have no intention of even reading from it, so discard it completely.
Because Go has a strict compiler design that throws an error if any declared variable or package import got unused.

Use cases:
- discarding unwanted return values
- blank package imports: if you import a package but never invoke any of its exported functions (e.g. just want to trigger its `init()` pipeline)
- compile-time interface verification: Go interfaces are implemented implicitly, use a `_` assignment global declaration to catch implementationn errors at compile time.

```go
package repository

import "context"

type UserRepository interface {
	GetUser(ctx context.Context, id string) (*User, error)
}

type PostgresSecretStore struct{}

func (p *PostgresSecretStore) GetUser(ctx context.Context, id string) (*User, error) {
	return nil, nil
}

// Global Compile-Time Guard:

// If PostgresSecretStore ever stops satisfying UserRepository,
// this line will fail to compile. The '_' ensures 0 bytes of memory are allocated.
var _ UserRepository = (*PostgresSecretStore)(nil)
```
- shadowing variables to unlink state: explicitly signal that a specific variable from an outer block should be ignored or reset inside a local nested block.

## 21. What are the differences between normal pointers and `unsafe.Pointer`?

Normal pointers: declare a pointer like `*int` or `*MyStruct`, a type-safe tracking address.
- strict type restriction: you cannot convert a `*int` to a `*float64` directly. The compiler blocks this to prevent data corruption.
- no pointer arithmetic: Go explicitly forbids shifting pointers  using arithmetic operations, e.g. you cannot write `ptr++` to move to the next memory address.
- garbage collector tracking: Go runtime tracks normal pointers. If an object escapes to the heap, the GC knows exactly which pointers are keeping that object alive.

`unsafe.Pointer`: an integer representation of a memory address that can hold a pointer to any type. It acts as a universal bridge, allowing you to convert any regular pointer into any other regular pointer.
- bypass compile time type safety: it tells the compiler to turn off its safety checks for that variable.
- enable pointer arithmetic: by converting an `unsafe.Pointer` into a `uintptr`, you can add or substract bytes to manually navigate across memory structures.
It's similar to `void*` in C.

## 22. What are the differences and relations between `unsafe.Pointer` and `uintptr`?

`unsafe.Pointer` is an active pointer tracked by GC. If an object is only referenced by an `unsafe.Pointer`, the GC will not garbage collect it.
`uintptr` is a plain number (a raw mathematical integer representation of an address). It's a snapshot of a memory address at a single point in time. The GC doesn't track it.
- bypass compile time type safety: it tells the compiler toturn off its safety checks for that variable.
- enable pointer arithmetic: by converting an `unsafe.Pointer` into a `uintptr`, you can add or substract bytes to manually navigate across memory structures.
It's similar to `void*` in C.
