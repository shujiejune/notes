# Sync

### 1. How to safely read or write shared variables other than mutex?

3 primary alters to standard mutex locks:
- atomic operations: For primitive data types, the highest-performance alter is `sync/atomic` package. Instead of locking an entire code block at the software level, atomic operations hook directly into low-level CPU hardware instructions.
```go
package main

import (
	"fmt"
	"sync"
	"sync/atomic"
)

type MetricsServer struct {
	// Using a specialized atomic type instead of a standard int64
	requestCount atomic.Int64
}

func (s *MetricsServer) HandleRequest() {
	// Increments safely at the hardware layer in a single CPU clock cycle
	s.requestCount.Add(1)
}

func (s *MetricsServer) GetCount() int64 {
	// Reads safely without a lock, ensuring cache line consistency across cores
	return s.requestCount.Load()
}
```
A mutex forces a goroutine to block, context switch, and go to sleep if the lock is held, which costs thousands of CPU cycles. Atomic operations are lock-free. The hardware CPU handles the isolation simultaneously at the cache-line tier, making them fast for **counters, state flags, and metric trackers**.

- channels (CSP): Instead of letting multiple goroutines access a shared variable and protecting it with a lock, you can delegate ownership of that variable to one single coordinator goroutine and communicate updates via channels.
```go
package main

import "fmt"

type UpdateRequest struct {
	Amount int
	Reply  chan int // Channel to pass the updated balance back safely
}

func bankAccountGuard(transactions <-chan UpdateRequest) {
	// The variable lives strictly inside this function's stack memory.
	// No other thread or goroutine can see or touch it!
	var balance int

	for tx := range transactions {
		balance += tx.Amount
		tx.Reply <- balance // Sending back the new state safely
	}
}

func main() {
	txChan := make(chan UpdateRequest)
	go bankAccountGuard(txChan) // Spin up the single guardian routine

	// Worker goroutines update state by passing messages, not modifying memory
	reply := make(chan int)
	txChan <- UpdateRequest{Amount: 100, Reply: reply}
	
	fmt.Println("New Balance:", <-reply) // Output: New Balance: 100
}
```
This eliminates data racesby enforcing single ownership. Since the variable never crosses a thread boundary, you don't need locks, and the app layout scales cleanly into pipeline-driven architectures.

- read-write mutexes: if you have a complex data structure (e.g. a large struct, map, or slice) that cannot be handled by simple `sync/atomic` primitives, you can use `sync.RWMutex`. It splits access controls into 2 distinct tracks: multiple readers or one single writer.
```go
type SecurityCache struct {
	sync.RWMutex
	tokenData map[string]string
}

// Read Operation: Multiple goroutines can run this simultaneously!
func (c *SecurityCache) GetToken(user string) string {
	c.RLock()         // Acquires a shared Read Lock
	defer c.RUnlock()
	return c.tokenData[user]
}

// Write Operation: Completely exclusive. Blocks all readers and other writers.
func (c *SecurityCache) SetToken(user, token string) {
	c.Lock()          // Acquires an exclusive Write Lock
	defer c.Unlock()
	c.tokenData[user] = token
}
```
In many backend microservices, data caches are read thousands of times per second but only updated once every few minutes. A standard `sync.Mutex` forces all those parallel read requests to line up sequentially, causing severe latency degradation. An `RWMutex` allows thousands of readers to inspect the map simultaneously without blocking each other, onlu locking up execution when an active write occurs.

### 2. How does Go implement atomic operations?

`sync/atomic` package is implemented as a direct partnership between the Go compiler and optimized CPU assembly language.
When you invoke an operation like `atomic.AddInt64()`, Go bypasses the software-level OS thread scheduler and executes lock-free hardware primitive instructions.

**Follow-up:** Does the CPU freeze the entire computer's memory bus when a Go atomic operation runs?
Historically, yes. CPU would assert a hardware signal on the system bus, preventing all other processors from talking to RAM, which killed system performance.
Modern CPUs used by Go runtimes optimize this via **cache locking** backed by MESI Cache Coherency Protocol:
- If the memory address is already loaded inside Core 1's local L1/L2 cache, the CPU avoids locking the system bus entirely.
- Core 1 asserts an exclusive lock over that specific **64-byte cache line** in its silicon.
  - CPU cache does not track memory byte-by-byte or variable-by-variable. Instead, CPU organizes its cache into fixed-size blocks calles cache lines. The standard size of a single cache line is 64 bytes.
  - When your Go program requests or modifies an 8-byte atomic variable, the CPU physically cannot fetch or lock just 8 bytes. The hardware infra is wired to pull the entire 64-byte cache line containing that variable from RAM into the CPU core's L1 cache all at once.
- Using the MESI protocol, it broadcasts an instantaneous invalidation signal to all other CPU cores, forcing them to mark their local copies of that cache line as `Invalid (I)`.
- Core 1 performs the modification instantly inside its cache and marks the state as `Modified (M)` or `Exclusive (E)`.
- Because everything happens within the CPU's local cache layers at the nanosecond scale, the operation completes without ever touching slow, external system RAM.
- False sharing:
```go
type HighThroughputMetrics struct {
    Core1Counter int64 // 8 Bytes (64 bits)
    Core2Counter int64 // 8 Bytes (64 bits)
}
```
These 2 variables are highly likey to land inside the same cache line.
The performance crash:
- Core 1 executes an atomic operation on `Core1Counter`. To do this, it locks and invalidates the entire cache line.
- Core 2 simultaneously tries to execute an atomic operation on `Core2Counter`. Even though it is touching a different variable, its local cache line has just been marked `Invalid` by Core 1.
- Core 2 is forced to halt, wait, and re-fetch the cache line from L2/L3 cache or main RAM.
Fix: injecting cache line padding to force independent concurrent variables onto separate cache lines.
```go
type HighThroughputMetrics struct {
    Core1Counter int64
    _            [56]byte // 56 bytes of blank padding! (8 + 56 = 64 bytes)
    Core2Counter int64
}
```

### 3. What are the differences between atomic operation and lock?

Locks are a software-level coordination framework managed by the go runtime, whereas Atomics are hardware-level instructions executed directly by the CPU.

| Dimension | Atomic Operations (`sync/atomic`) | Software Locks (`sync.Mutex`) |
| --- | --- | --- |
| Layer | Hardware | Software |
| Granularity | Low level. Protects exactly one primitive value or pointer address. | High level. Protects entire blocks of code or complex structs. |
|  Blocking State  |  lock-free, non-blocking. goroutines never sleep.  |  blocking. goroutines are parked and context-switched if a conflict occurs.  |
| Execution Cost | negligible (1 to a few CPU clock cycles). | high if contested (thousands of CPU clock cycles due to scheduling overhead). |
| Deadlock Risk | 0. there is no "held" state to cause a circular lock dependency. | high. brittle code can easily trigger mutual exclusion deadlocks. |

Lock (`sync.Mutex`): when a goroutine attempts to acquire a mutex lock that is already held by another thread, it cannot proceed.
- Go runtime steps in and changes the goroutine's state to blocked (`gopark`).
- Go scheduler detaches the goroutine from the active OS thread and puts it to sleep inside a wait queue.
- The thread is then forced to perform **context switch** to find a different, runnable goroutine to execute.
- This cycle of parking, scheduling, and waking up goroutines introduces significant latency, consuming thousands of CPU clock cycles.
Atomic operation (`sync/atomic`): when a goroutine executes an atomic instruction, it never talks to the OS or the Go scheduler, and it never goes to sleep.
- The operation is dispatched to the CPU core as a single, indivisible hardware instruction.
- The CPU handles the synchronization using local cache lines. The goroutine executes the modification and moves to the next line of code without interruption.

### 4. How is `sync.Mutex` implemented under the hood?

A `sync.Mutex` consists of 2 fields.
```go
type Mutex struct {
    state int32  // Bits 0-31 tracking state, locks, and waiter queues
    sema  uint32 // Operating system semaphore acting as a sleep/wake queue
}
```

State:
- bit 0 (`mutexLocked`): Is the mutex currently locked? 1 = yes, 0 = no.
- bit 1 (`mutexWoken`): Set to 1 when an unlocking goroutine has already signaled a sleeping waiter to wake up, telling newly arriving gorotines to avoid wasting CPU time spinning.
- bit 2 (`mutexStarving`): Tracks whether the mutex has transitioned into starvation mode, 1 = active.
- bits 3-31 (`mutexWaiterShift`): Holds the total integer count of every goroutine currently put to sleep inside the semaphore queue.

Multi-tier lock strategy (`Lock()` flow):
When a goroutine executes `mu.Lock`, Go runtime transitions through 3 aggressive phases to minimize execution cost.
- the inline fast path (0-latency CAS): If the mutex is uncontested, Go executes a fast path using hardware-level Compare-And-Swap (CAS). It attempts to instantly flip bit 0 from 0 to 1. If it succeeds, the method returns immediately in a single CPU instruction.
```go
// Fast Path (Inlined directly into your code)
if atomic.CompareAndSwapInt32(&m.state, 0, mutexLocked) {
    return
}
```
- active CPU spinning: If the fast path fails because another goroutine holds the lock, Go does not immediately put the current goroutine to sleep. Instead, if the runtime notices that the holder of the lock is currently running on another CPU core and the local queue isn't overloaded, it triggers active spinning. The goroutine executes a series oflow-level CPU yield instructions (`PAUSE` or `procyield`) for up to a few dozen cycles, hoping the lock holder will release it within microseconds.
- the slow path (parking via semaphore): If active spinning cycles exhaust and the lock is still held, the goroutine must yield. It increments the waiter count bits (bits 3-31) inside `m.state`. Then it invokes `runtime_SemacquireMutex(&m.sema)`, parking the goroutine into a `_Gwaiting` sleep state. The scheduler unlinks it from the OS thread, allowing other workloads to run.

### 5. What are the modes of mutex?

To balance maximum app throughput with worst-case latency mitigation, Go implements a hybrid fairness engine with 2 operation configs.
- Normal mode (throughput-optimized): waiting goroutines are stored inside a FIFO queue in the semaphore block. However, when a sleeping waiter is woken up, it does not automatically own the lock. It is forced to compete with newly arriving goroutines that are hitting the lock at that exact microsecond. New goroutines have a massive advantage: they are already running on the CPU core, whereas the woken-up waiter is still context switching back from sleep.
- Starvation mode tail-latency guard): to prevent infinite starvation, every time a parked waiter wakes up, it checks how long it has been waiting. If a waiter fails to acquire the lock for more than 1 millisecond, it forcefully flips bit 2 (`mutexStarving`) to 1. When starvation mode activates
  - Newly arriving goroutines are completely banned from grabbing the lock or spinning, even if bit 0 is open. They are sent directly to the tail of the semaphore queue.
  - When the current holder executes `Unlock()`, it executes a direct handoff: it transfers ownership of the lock to the `sudog` sitting at the front of the waiter queue.
  -  The mutex stays locked down in starvation mode until the waiter queue drains, or an incoming waiter (head of the waiter queue) reports it has been in queue for less than 1 ms, at which point it shifts back to normal mode.

### 6. Would a spnning goroutine on a mutex consume a lot of resources?

Yes, active spinning inside a mutex consumes a high amount of CPU resources.
When a goroutine spins, it doesn't just sit idle. It runs what is called a busy-wait loop. It stays actively pinned to a CPU core, consuming 100% of that core's computational capacity or the duration of the spin.
Go runtime code for spinning executes a tight loop containing the `PAUSE` instruction (on x86_64) or the `YIELD` instruction (on ARM64).
```go
// Inside src/runtime/proc.go - The active spin loop
for i := 0; i < active_spin_cycles; i++ {
    procyield(30) // Executes 30 CPU PAUSE instructions in a row
}
```
The `PAUSE` instruction tells the CPU core: pipeline a minor delay here. This saves power and prevents pipeline flushes, but the goroutine is still actively hoarding that CPU core.

If spinning hoards 100% of a CPU core, why does Go do it?
Because putting a goroutine to sleep is even more expensive.
When a goroutine cannot spin and is forced to park:
- Go runtime must lock the scheduling queue.
- It changes the goroutine state to `_Gwaiting` and detaches it from the OS thread.
- The OS thread must execute a context switch to load a different goroutine.
- This entire software-level teardown and reconstruction phase can consume thousands of CPU clock cycles and disrupt the CPU's local L1/L2 caches.

The cost of spinning: ~30-120 CPU cycles
The cost of parking/waking up: 2000+ CPU cycles

### 7. Say a mutex is locked by a goroutine, other goroutine have to keep waiting. After this mutex is released, which one among the waiting goroutines can acquire this mutex?

Normal mode: when `Unlock()` is called:
- The releasing goroutine looks at the head of the FIFO semaphore queue and wakes up the goroutine that has been waiting the longest (the woken waiter).
- However, the woken waiter does not automatically receive ownership of the lock. It is merely shifted to a runnable state and must context switch back onto a CPU core.
- While that context switch is happening, newly arriving goroutines (or goroutines currently in their active CPU spinning phase) hit the `Lock()` statement at that exact microsecond.
- Usually, oneof the newly arriving or spinning goroutine wins, because they are already running on a CPU core, and they can execute a hardware atomic operation and claim the lock instantly, before the woken waiter even finishes waking up.

Starvation mode: if a parked goroutine gets stuck at the front of the queue and fails to acquire the lock for more than 1ms:
- The releasing goroutine executes a direct handoff.
- It bypasses any newly arriving or spinning goroutines. New arrivals are blocked from spinning entirely and are sent straight to the tail of the queue.
- The lock is transferred directly and exclusively to the woken waiter sitting at the head of the FIFO queue.
- The longest-waiting goroutine at the head of the queue is guaranteed to win. No competition is allowed.

### 8. What's the underlying implementation and use cases of `sync.Once`?

A `sync.Once` object is composed of 2 fields totaling 8 bytes:
```go
type Once struct {
    done uint32     // Atomic flag tracking completion (1 = done, 0 = pending)
    m    Mutex      // Software lock protecting the initialization function
}
```

The entire logic of `sync.Once` is encapsulated in its `Do(f func())` method, implemented using a double-checked locking pattern.
```go
func (o *Once) Do(f func()) {
    // 1. THE FAST PATH: Atomic load check
    if atomic.LoadUint32(&o.done) == 0 {
        // 2. THE SLOW PATH: Fallback to mutual exclusion
        o.doSlow(f)
    }
}

func (o *Once) doSlow(f func()) {
    o.m.Lock()
    defer o.m.Unlock()

    // Double-check the flag after securing the lock!
    if o.done == 0 {
        defer atomic.StoreUint32(&o.done, 1) // Mark as completed after f() finishes
        f()
    }
}
```

**A. Fast path optimization**

In a high-thoughput backend service, a singleton resource (e.g. a db connection pool) might be checked millions of times per second. If Go forced every single call to acquire a `sync.Mutex` lock just to see if initialization was complete, it would cause severe CPU cache line thrashing and block execution paths.
To prevent this, Go uses a lock-free fast path. `atomic.LoadUint32(&o.done)` executes an atomic hardware read. If `done == 1`, initialization finished long ago. The function returns instantly within 1-2 CPU clock cycles, bypassing the mutex.

**B. Slow path optimization & mutual exclusion guard**

If `done == 0`, multiple competing goroutines might hit the lock at the exact same microsecond.
- Goroutine A wins the mutex lock `o.m.Lock()`.
- Goroutine B blocks and is put to sleep waiting for the mutex.
- Goroutine A executes the custom function `f()`. Once `f()` successfully finishes, Go calls `atomic.StoreUint32(&o.done, 1)`, flips the bit, and releases the lock.

**Why double check is critical?**

When goroutine B is finally woken up and enters `doSlow`, it secures the mutex. If the second check `if o.done == 0` did not exist, goroutine B would blindly execute `f()` a second time, defeating the purpose of `sync.Once`.

#### Use Cases
**A. Thread-safe lazy initialization (singleton pattern)**

Instead of forcing the microservice to connect to externel databases or load heavy JSON config files into memory at startup, you can defer initialization until the very first API request arrives.
```go
type DBConnection struct{ *sql.DB }

var (
	instance *DBConnection
	once     sync.Once
)

func GetDB() *DBConnection {
	// Only connects on the very first invocation across the service lifecycle
	once.Do(func() {
		db, _ := sql.Open("postgres", "connection_string")
		instance = &DBConnection{db}
	})
	return instance
}
```
**B. Safe channel closure in multi-worker teardowns**

Closing a closed channel will immediately crash the app. If you have multiple independent worker goroutines that could all trigger a system shutdown, wrap your teardown sequence in a `sync.Once`.
```go
type WorkerPool struct {
    shutdownChan chan struct{}
    closeOnce    sync.Once
}

func (wp *WorkerPool) Close() {
    // Guarantees close() is called exactly once, preventing duplicate closure panics
    wp.closeOnce.Do(func() {
        close(wp.shutdownChan)
    })
}
```

#### Traps
1. Never call `once.Do` recursively inside itself, this will cause a deadlock. The outer block holds the mutex and the inner block waits for it forever.
2. If your initialization function `f()` panics or encounters a db network error, `sync.Once` still considers it completed. It will flip `done` to 1. Subsequent calls will return instantly, leaving your system running with a permanently broken, half-baked nil resource instance. If initialization can fail, you should handle retries manually using an `RWMutex` instead.

### 9. How does `WaitGroup` enable goroutine waiting?

`sync.WaitGroup` acts as a structural concurrent counter. It allows a main orchestrator goroutine to pause and wait until a collection of background worker goroutines finishes executing.
```go
type WaitGroup struct {
    noCopy noCopy      // Compile-time guard preventing passing WaitGroup by value
    state1 uint64      // 64-bit combined atomic counter (Counter + Waiter Count)
    state2 uint32      // 32-bit operating system semaphore acting as the sleep queue
}
```
The 64-bit `state1` variable is split into 2 distinct 32-bit integers.
- the worker counter (high 32 bits): Tracks the total number of active delta jobs currently executing. This is what changes when you call `wg.Add(1)` or `wg.Done()`.
- the worker counter (low 32 bits): Tracks the total number of orchestrator goroutines currently blocked and asleep waiting for the jobs to finish. This changes when a routine invokes `wg.Wait()`.

Orchestrator: the goroutine whose job is to manage the lifecycle of other goroutines. It doesn't do the heavy background processing, it
- spawns the worker threads.
- directs traffic.
- pauses its own execution until all its spawned workers complete their tasks.
In 99% of Go apps, the `main()` goroutine acts as the primary orchestrator.

#### Mechanics of the 3 primitives
- registering work `wg.Add(delta)`: When you call `wg.Add(1)`, Go performs an atomic hardware-level addtion `atomic.AddUint64` to shift the high 32 bits of the state counter upward. If the worker counter climbs above 0, nothing happens, the gate remains open. If your code passes a negative number or miscounts, causing the high 32 bits to drop below zero, the runtime instantly triggers an uncoverable crash: `panic: sync: negative WaitGroup counter`.
- parking the orchestrator `wg.Wait()`: When the main routine reaches `wg.Wait()`, it executes an atomic read of the state.
  - If the worker counter (high 32 bits) is already 0, it means all workers finished before `Wait()` was even reached. The function returns instantly without blocking.
  - If the worker counter is greater than 0, the orchestrator must go to sleep. It atomically increments the waiter counter (low 32 bits) by 1.
  - It then invokes `runtime_Semacquire(&wg.state2)`. This drops execution (of the orchestrator) into the Go scheduler, parking the goroutine into a `_Gwaiting` sleep state and detaching it from the active OS thread so other processes can use the CPU core.
- wakeup evaluation `wg.Done`: `wg.Done` is simply an inline shortcut that executes `wg.Add(-1)`. Everytime a background worker finishes and triggers `wg.Done()`, the high 32 bits of the counter decrement atomically by 1.
  - If the counter drops from 2 to 1, the worker exits cleanly, leaving the orchestrator asleep.
  - Zero-crossing handshake: The exact microsecond a worker executes `wg.Done()` and drives the worker counter down to exactly 0, it takes on the responsibility of the cleanup coordinator.
```go
package main

import (
	"fmt"
	"sync"
	"time"
)

func main() { // ◄── THIS IS THE ORCHESTRATOR GOROUTINE
	var wg sync.WaitGroup

	// ==========================================
	// STEP A: wg.Add(2)
	// ==========================================
	// INTERNAL: Go executes an atomic hardware add on the high 32 bits of state1.
	// State Tracker Changes: [Worker Counter: 2] [Waiter Counter: 0]
	wg.Add(2)

	// Spawn Worker 1
	go func() {
		defer wg.Done() // ◄── STEP C (Worker 1 Executes this at the end)
		time.Sleep(100 * time.Millisecond) // Simulate work
	}()

	// Spawn Worker 2
	go func() {
		defer wg.Done() // ◄── STEP C (Worker 2 Executes this at the end)
		time.Sleep(200 * time.Millisecond) // Simulate work
	}()

	// ==========================================
	// STEP B: wg.Wait()
	// ==========================================
	// INTERNAL: The Orchestrator reads state1. It sees [Worker Counter: 2].
	// Because it is > 0, the Orchestrator increments the low 32 bits.
	// State Tracker Changes: [Worker Counter: 2] [Waiter Counter: 1]
	//
	// The Orchestrator triggers `gopark()`. It is put to sleep inside the
	// semaphore queue (`state2`). The main() goroutine is now frozen here.
	wg.Wait()

	// This line cannot execute until the final worker wakes the orchestrator up.
	fmt.Println("Orchestrator Resumed: All workers finished cleanly!")
}
```

**What happens internally during `wg.Done()`?**

Timeline T1: Worker 1 finishes
- Worker 1 completes its sleep and hits `wg.Done()`.
- Under the hood, this executes `wg.Add(-1)`.
- The high 32 bits decrement.
- State tracker: [Worker Counter: 1] [Waiter Counter: 1].
- Because the worker counter is still > 1, worker 1 simply exits. The orchestrator stays asleep.

Timeline T2: Worker 2 finishes
- Worker 2 completes its sleep and hits `wg.Done()`.
- Under the hood, this executes `wg.Add(-1)`.
- The high 32 bits decrement from 1 to 0.
- State tracker: [Worker Counter: 0] [Waiter Counter: 1].
- Worker 2 notices that the worker counter has hit exactly 0, and it sees that the waiter counter is 1.
- Worker 2 takes n the role of the cleanup crew. It bypasses everything else and calls `runtime_Semrelease(&wg.state2)`.
- This instruction signals the Go scheduler: Find the orchestrator goroutine inside the `state2` semaphore pool and change its status back to `_Grunning`.
- The scheduler schedules the orchestrator back onto an open CPU core. The orchestrator picks up exactly where it left off, passing past the `wg.Wait()` line to execute the final `fmt.Println`.

#### Production Architecture Traps
**A. The anti-pattern of passing by value**
A `sync.WaitGroup` must never be passed into a function by value: `func worker(wg sync.WaitGroup)`.
Doing so causes Go to create a shallow memory copy of the entire struct header. When the worker calls `wg.Done()`, it decrements the counter on its local copy on the stack. The original `WaitGroup` inside the main function never receives the signal, causing `wg.Wait()` to freeze and deadlock the app permanently.
Always pass `WaitGroup` via pointer: `func worker(wg *sync.WaitGroup)`.
**B. Asynchronous `Add` placement race conditions**
You must always execute `wg.Add(1)` inside the parent/coordinating goroutine **before** calling the `go` keyword to launch the background thread.
```go
// INCORRECT RACE PATTERN
for i := 0; i < 3; i++ {
    go func() {
        wg.Add(1) // ◄── CRITICAL BUG: The loop might finish and hit wg.Wait() before this thread even schedules!
        defer wg.Done()
        process()
    }()
}
wg.Wait()
```
If the parent loop executes quickly, it might hit `wg.Wait()` while the worker counter is still 0 because the OS scheduler hasn't initialized the background threads yet. `wg.Wait()` will pass instantly, and the main routine will exit before a single background job runs.

### 10. Explain the underlying mechanism of `sync.Map`.

A standard Go `map` is unsafe for concurrent use. If multiple goroutines attempt to r/w to the same map simultaneously, the runtime will crash with panic: `concurrent map read and map write`.
While you can wrap it in a `sync.Mutex`, high-frequency backend services can suffer severe latency under heavy read because every read request is forced to queue up behind the lock.
To solve this, Go provides `sync.Map`, a specialized, thread-safe map achieving near-lock-free O(1) read via 2 map layers and a double-checked r/w splitting architecture.

#### struct

```go
// src/sync/map.go
type Map struct {
    mu Mutex
    read atomic.Value // Holds a readOnly struct (100% lock-free)
    dirty map[any]*entry // Standard Go map (requires mutex lock to touch)
    misses int // Tracks read misses on the read cache
}
```

#### 2 internal maps

**Map A: `read` (fast path)**

This map is read-only and wrapped in an `atomic.Value`. Because its contents never change structurally, any number of goroutines can read from it simultaneously without a mutex lock. It acts as a super-fast cache layer.

**Map B: `dirty` (slow path)**

This is a standard, mutable Go map. Every time you insert a brand new key-value pair via `Store()`, it gets written directly into this map. Accessing or mutating the `dirty` map requires acquiring the companion `sync.Mutex` (`mu`).

#### 3 main operations

**A. Read Flow (`Load`)**

When you look up a key `m.Load("key")`, Go follows a strict tiered retrieval sequence:
- It checks the atomic `read` map first. If the key exists, it returns the value instantly with zero locking overhead.
- If the key is not in the `read` map, execution falls back to the slow path: Go acquires the mutex by `mu.Lock()` and double-checks the `read` map again to ensure another thread didn't just move it here.
- If the key is still missing from `read`, Go looks inside the `dirty` map.
- If Go successfully finds the key inside `dirty`, it increments the `misses` counter.
The exact moment `misses >= len(dirty)`, Go realizes its read cache is out of date. It promotes the entire `dirty` map to become the new atomic `read` map, resets the `misses` counter to 0, and clears out the old dirty pointer.

**B. Write Flow (`Store`)**

Writing a value using `m.Store("key", value)` triggers 2 different memory paths depending on whether the key already exists.
- Scenario 1 Updating an existing key: If the key is already present in the atomic `read` map, Go doesn't lock anything. It uses a hardware-level atomic pointer swap `atomic.CompareAndSwapPointer` to overwrite the pointer address of the value directly inside the `read` map slot. Both maps share pointers to the same values, so updating `read` automatically updates `dirty`.
- Scenario 2 Inserting a new key: If the key is new, Go acquires the mutex lock, writes the key and value directly into the `dirty` map, and leaves the `read` map untouched.

**C. Delete Flow (lazy)**

Deleting an item via `m.Delete("key")` also avoids instant locking when possible.
- If the key sits in the `read` map, Go doesn't delete the entry. Instead, it uses an atomic operation to set the value pointer to `nil` or `expunged`.
- The key container shell stays in the map, but it points to nothing. The physical memory cleanup is deferred until the next time the map undergoes a promotion cycle, minimizing inline latency.

### 11. What's the relationship between `read` map and `dirty` map?

It's a classic **master-replica** architecture optimized for high-speed read operations.
They are 2 separate pointer indexes that point to the exact same underlying values on the heap.

3 characteristics:
- **data overlap**: The `dirty` map is always the source of truth for the entire dataset. It contains 100% of the active keys currently inside the map struct. The `read` map is a read-optimized subset/snapshot of the `dirty` map.
- **pointer sharing**: The keys in both `read` and `dirty` point to the exact same `entry` struct on the heap. An `entry` is simply a wrapper around an unsafe pointer pointing to the actual value data.
- **promotion and reconstruction lifecycle**: The relationship between the 2 maps changes over time through a 2-phase cyclical handshake.
  - Phase A Promotion (`dirty` -> `read`): The exact moment `misses >= len(dirty)`, Go runtime triggers a promotion.
    - It copies the pointer reference of `dirty` and assigns it to the atomic `read` variable slot. This is O(1).
    - `read` now contains 100% of the keys, including all the new ones.
    - The `dirty` pointer variable is reset to `nil`, and the `misses` counter drops back to 0.
  - Phase B Reconstruction (`read` -> `dirty`): After a promotion, `dirty` is `nil`. What happens if you suddenly try to store a new key? Go cannot write to a `nil` map, so it triggers a reconstruction under a mutex lock.
    - It instantiates a brand new, empty standard Go map for the `dirty` slot.
    - It loops through `read` and copies all active key pointers back into the new `dirty`.
    - If any keys in the `read`were deleted by your code earlier, their pointers were marked as `expunged`. During the reconstruction loop, Go skips those `expunged` keys, effectively purging them from memory so they don't leak into the new `dirty` map.

### 12. Why do we need both `nil` and `expunged` for deleted?

**3 states of an entry's value pointer `entry.p`**
- `valid`: Points to a real heap object. The key is alive and active.
- `nil`: The key was deleted, but the `dirty` map is not `nil`.
- `expunged`: The key was deleted, and the `dirty` map is `nil` (between a promotion and a reconstruction).

**2 scenarios**
A. Deleting when `dirty` still exists
If you call `m.Delete("key")` and `dirty` is active, Go uses an atomic operation to set `entry.p = nil`.
Because both `read` and `dirty` share a pointer to `entry`, both maps instantly see that it is `nil`.
The key is still physically present as an index slot in both maps, but its value is empty.
B. Deleting after a promotion, `dirty = nil`
When you call `m.Delete("key")`, Go looks at `read`, finds the entry, and sets `entry.p = nil`.
Say, now you want to store a new key `m.Store("new_key", 99)`.
Because `dirty = nil`, Go locks the mutex and triggers reconstruction to rebuild `dirty`.
It loops through `read` to copy all actives over, until it encounters the deleted `"key"` whose `p` is `nil`.
Go wants to be smart and skip it.  So the key still exists in `read` (pointing to `nil`) but does not exist in `dirty`.
If another goroutine suddenly tries to re-write or un-delete that `"key"` by `m.Store("key", 100)`, Go tries the fast path first. It checks `read` and finds `"key"`.
If its pointer was still just `nil`, the fast path would update `p` from `nil` to 100 only in `read`, because it thinks this key is shared by both maps.
But Go skipped copying this key into `dirty` during reconstruction. The `dirty` map would miss this update.
The next time a promotion occurred, `dirty` would wipe out the `read`, and the data update would vanish.

Therefore, when Go loops through `read` and decides to skip a `nil` key, it atomically changes its state from `nil` to `expunged`.
`expunged`: This key was deleted, and it has been intentionaally left out of the current `dirty` map.
Now, when a goroutine tries to un-delete that key, it sees `p == expunged`, and realizes it's not allowed to update it atomically without a lock.
The fast path aborts. Go acquires the mutex lock, writes the key into `dirty` explicitly, changes `p` from `expunged` to 100 inside `read`, and unlocks.
Data consistency is preserved perfectly.

### 13. What are the use cases of `sync.Map`?

`sync.Map` is not a general-purpose replacement for a standard map + mutex. If used in the wrong architecture layout, it can run slower than a standard locked map.

**2 precise scenarios to use `sync.Map`**
- Read-heavy, write-rare caches (read-most pattern): When a key is written once but read millions of times, e.g. loading microservice routing tables, parsing global configuration flags, building an auth token verification cache.
- Disjoint concurrent access (independent key pattern): When multiple goroutines are reading and writing to the map simultaneously, but they are all accessing independent, distinct keys, e.g. a multi-tenant app where worker A only touches key A, and worker B only touches key B.

**When to avoid `sync.Map`**
If your system architecture requires a high volume of continuous, aggressive writes and insertions of new keys, e.g. an ingestion buffer logging raw real-time streaming metrics, do not use `sync.Map`.
Constant insertions will bypass the atomic `read` cache, causing your goroutines to get trapped in an endless loop of acquiring the mutex lock, thrashing the `misses` counter, and forcing expensive map copies during promotions.
For write-heavy loops, a standard `map` protected by a sharded/striped mutex array is significantly faster.