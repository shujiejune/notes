# Memory Management

## 1. How does Go allocate memory?

Go's memory allocator is designed for low-latency, high-concurrency systems. It's inspired by TCMalloc (thread-caching malloc), which focuses on avoiding global thread locks by dividing memory management into a localized hierarchy.

To achieve this, the Go runtime shifts from a massive global heap to layered, thread-safe memory chunks called `mspans`, distributed across 3 major architectural pools: `mcache`, `mcentral`, `mheap`.

### The core unity of currency: `mspan`

Go does not allocate raw bytes arbitrarily. Instead, it breaks memory down into pages, each page is exactly 8 KB on standard architectures.
An `mspan` (memory span) is a double-linked list that wraps one or more contiguous pages of memory.
To minimize internal fragmentation (wasted space inside an allocated block), Go splits `mspans` into 67 distinct size classes.
- Size class 1 handles objects up to 8 bytes.
- Size class 2 handles objects up to 16 bytes, and so on, up to 32 KB.
- Every `mspan` is dedicated exclusively to one size class. If an `mspan` is assigned to size class 2, it is chopped up into uniform 16-bytes slots, and it can only store 16-byte objects.

### 3-tier allocation hierarchy

**A. `mcache` (thread-local, lock-free)**

Every logical processor (P) in the GMP model owns its own dedicated local storage cache called an `mcache`.
When a goroutine running on a thread needs to allocate a small object (e.g. a 24-byte struct), it requests space from its assiged P's `mcache`.
Because the current thread has exclusive monopoly ownership over that P, the allocation happens lock-free, executing at near-instantaneous CPU speeds.

**B. `mcentral` (the shared size pools)**

Eventually, a local `mcache` will run out of empty slots inside its `mspans`. When this happens, it reaches up to the `mcentral` layer to harvest a fresh, pre-formatted `mspan`.
There are exactly 134 `mcentral` pools inside the runtime, 2 for each of the 67 size classes: one for objects containing pointers that the garbage collector must scan, and one for noscan primitive types like strings or byte arrays.

**C. `mheap` (the global arena)**

If an `mcentral` pool runs dry, it must request raw unformatted memory pages from the base layer of the system: the `mheap`.
The `mheap` manages a massive global collection of memory pages grouped into Arenas (64 MB chunks on 64-bit systems).
Accessing the `mheap` requires acquiring a heavy, global runtime mutex lock. If the `mheap` is out of virtual memory pages, it calls low-level OS kernels (like `mmap` on Linux or `VirtualAlloc` on Windows) to claim fresh address space from the host hardware.

### Allocation strategy based on object size

When you allocate an object in Go, the runtime performs a micro-optimization check, bucketing the allocation into one of three execution categories based on its size.
- tiny allocations (less than 16 bytes): For tiny objects that don't contain pointers (e.g. small integers or brief booleans), Go uses a sub-allocator called the tiny allocator. It takes multiple tiny objects and packs them tightly into a single 16-byte slot inside the `mcache`, preventing massive byte fragmentation on the heap.
- small allocations (between 16 bytes and 32 KB): The object is rounded up to the hearest available size class. The runtime fetches an empty slot from the corresponding `mspan` inside the local `mcache` (or climbs up to `mcentral` if the local span is full).
- larger allocations (greater than 32 KB): Objects larger than 32 KB are too massive to fit into pre-formatted size classes. They bypass the `mcache` and `mcentral` layers. The runtime talks directly to the global `mheap`, carving out a dedicated, custom-sized `mspan` composed of the exact number of 8 KB pages required to host that specific giant object.


### Gatekeeper:escape analysis:

Before any of the hierarchy listed above is utilized, Go runs a compile-time optimization pass called Escape Analysis.
Go does not force you to declare whether a var belongs on the stack or the heap using syntax (like `new` or `malloc`). Instead, the compiler analyzes your code syntax to see if this var outlive the lifecycle of the func that created it.
```go
func StayOnStack() int {
    x := 42 // 'x' never leaves this function scope.
    return x // Allocated on the blazingly fast STACK frame.
}

func EscapeToHeap() *int {
    y := 100
    return &y // ◄── ESCAPES! Downstream functions need this pointer.
              //     The compiler forces 'y' onto the HEAP allocator.
}
```

## 2. What is memory escape in Go? Under what circumstances does memory escape occur?

Memory escape (Escape Analysis) is a staic optimization phase executed by the Go compiler during the build process. Its job is to determine whether a var can be dafely allocated on the goroutine's fast local stack, or if it must escape to the global heap.
Unlike C/C++ where the dev manually conrols allocation via `malloc` and `free`, and unlike Java where objects are almost universally dumped onto the heap, Go analyzes the source code to make the decision.

### Stack vs. Heap

- Stack: If a var stays confined within its function scope, it stays on the goroutine's local stack. Allocation on a stack frame is cheap. The CPU simply shifts its stack pointer register. When a func finished execution, its entire stack frame is wiped out instantly as the pointer moves back up. Stack memory requires zero work from the GC.
- Heap: If a var is returned as a pointer, captured by a closure,or wrapped inside an interface container, it escapes to the heap. Allocation on the heap requires climbing Go's multi-tiered memory allocator (`mcache`->`mcentral`->`mheap`). More importantly, vars on the heap stay alive indefinitely until the GC conducts a full concurrent scan to prove they are dead. This burns CPU cycles and introduces latency.

The compiler's core goal: Keep as many vars as possible on the stack. Only let a var escape to the heap if it's absolutely mathematically necessary.

### Under what circumstances does memory escape occur

Golden Rule: If a variable outlives the lifecycle of the function stack frame that created it, it must escape to the heap.

**A. Returning pointers from a function**

```go
func EscapePointer() *int {
		x := 42
		return &x // <- ESCAPES! Downstreams callers need access to 'x
}
```

**B. Sending pointers through channels**

```go
func EscapeChannel(ch chan *string) {
		msg := "System Alert"
		ch <- &msg // <- ESCAPES! Handed off to an unpredictable concurrent timeline
}
```

**C. Storing pointers inside map values or slices**

```go
func EscapeContainer() {
		m := make(map[string]*int)
		val := 100
		m["key"] = &val // <- ESCAPES! Bound to a dynamic map container
}
```
If you append a pointer to a slice of pointers, or store a pointer inside a map, the target payload escapes. Slices and maps are dynamically resizable, header-backed pointer structures that live fluidly across memory boundaries.

**D. Assigning variables to interfaces `any`**

```go
import "fmt"

func EscapeInterface() {
		secretNumber := 777
		// fmt.Println accepts 'any' (interface{})
		// This forces secretNumber to escape to the heap
		fmt.Println(secertNumber) // <- ESCAPES!
}
```
As an interface uses an `unsafe.Pointer` to track its data payload, the compiler cannot statically guarantee the underlying lifespan or exact types crossing an interface boundary, assigning a concrete value to an interface almost always triggers an escape to the heap.

**E. Massive allocations or dynamic slice backings**

```go
func EscapeSize() {
		// 1. Dynamic Escape: Size isn't known until runtime
		dynamicSize := 10
		sliceA := make([]int, dynamicSize) // <- ESCAPES!
		
		// 2. Volume Escape: Exceeds teh compiler's safe stack thresholds
		sliceB := make([]int, 100000) // <- ESCAPES! (Too massive for the stack)
}
```
Even if a var never leaves its parent function, it will escape to the heap if it's too large for the stack, or if its size is unkown at compile time. Go stack frames are kept intentionally lean.

### How to audit escapes: compiler tooling

The Go toolchain allows you to audit the compiler's exact escape decisions by running your build or test commands with the optimization flags `-gcflags` set to trace memory movements.
```sh
go build -gcflags="-m" main.go
```

## 3. What are the consequences of memory escape?

## 4. Are channels allocated on the stack or on the heap?

## 5. Under what circumstances can memory leaks occur in Go?

## 6. How do you locate and optimize memory leaks in Go?
