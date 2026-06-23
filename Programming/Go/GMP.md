# GMP

## 1. What is Go's GMP model?

It's the architectural backbone of the runtime's concurrent scheduling engine.
It's a highly optimized M:N scheduler, i.e. it multiplexes N green threads (goroutines) onto M physical OS threads.

### Core Components

**G: goroutine**

A **G** represents a single goroutine. It's not an OS thread. It's a lightweight user-space thread.
It contains its own execution stack (starting at 2KB), its current program counter (PC) tracking what line of code it's running, and its internal status, e.g. `_Grunning` or `_Gwaiting`.

**M: machine (OS thread)**

An **M** represents a physical OS thread, created and managed by the OS kernel.
It's the actual worker that executes compiled assembly instructions on a physical CPU core. To do any work, an M must be assigned a P.

**P: processor (the logical context)**

A **P** represents a logical processor or scheduling context. The number of P instances is strictly capped by your machine's CPU core config (via `GOMAXPROCS`).
P acts as the brains of the operation. It holds the **Local Run Queue (LRQ)**, a thread-safe queue of goroutines that are ready to execute. An M cannot execute a goroutine unless it captures a P.

**The strict 1:1 monogamy rule at runtime**

The relationship between an active thread (M) and a processor (P) is strictly 1:1 and exclusive.
- Multiple Ms never drain the same P's LRQ simultaneously.
- While an M holds a P, no other thread in the OS is allowed to look inside, read from, or write to that P's LRQ.

The _pool_ behavior is serial, not concurrent. A P can be held by different Ms over time, but never at the exact same instant.

### Global vs. Local Run Queues

To distributes work across the computer without introducing lock contention, the GMP scheduler splits goroutine traffic into 2 layers:
- **local run queue (LRQ)**: Every P has its own local queue that holds up to 256 runnable goroutines. Because an M owns its assigned P, it can pop goroutines off its LRQ completely lock-free, resulting in sub-nanosecond scheduling decisions.
- **global run queue (GRQ)**: If a local queue overflows, or if goroutines are spawned globally, they enter the GRQ. Accessing the GRQ requires acquiring a global mutex lock, making it slower. To prevent goroutines in the GRQ from starving, an M will check the GRQ once every 61 ticks.

### Core Optimization Strategies

If a goroutine locks up on an intensive math calculation, or makes a blocking system call (e.g. reading a file from disk), the GMP model uses 2 strategies to keep the machine running at 100% capacity.

**A. Work Stealing (Balancing the Load)**

If an M finishes executing all the goroutines inside its P's LRQ, it doesn't sit idle. It executes a work stealing algo:
- It looks at the other P contexts in the system.
- It attempts to steal half of the runnable goroutines from a sibling P's local queue to distribute the workload evenly across all CPU cores.

The LRQ inside P is implemented as a specialized **lock-free circular ring buffer** using atomic memory operations `LFQueue`.
The ring buffer separates access by opposite ends of the queue:
- the owner thread (M1): Always pops goroutines from the head of its own P's queue.
- the thief thread (M2): Always steals goroutines from the tail of the sibling P's queue.
Because the owner is busy at the head and the thief is quietly harvesting at the tail, they can manipulate the pointers using atomic CPU instructions `sync/atomic` without ever colliding, requiring a mutex lock, or breaking the owner's execution flow.

**B. Hand-Off (Handling Blocking Syscalls)**

If a running goroutine G1 executes a blocking syscall (e.g. synchronous file I/O), the OS thread M1 must freeze and wait for the hardware disk to return data.
To prevent the other goroutines stuck in P's queue from freezing alongside, the Go runtime triggers a hand-off:
- M1 detaches from its logical context P.
- M1 stays asleep with G1, waiting for the kernel.
- The runtime wakes up or allocates a different OS thread M2 and hands ownership of P over to it.
- M2 instantly resumes executing the rest of the queue, ensuring zero app stall time.

### Cooperative vs. Preemptive Scheduling

- **Old Go behavior (cooperative)**: Historically, a goroutine would only give up its CPU core if it hit a "safepoint", e.g. calling a func, allocating memory, or reading a channel. If a goroutine ran an infinite loop like `for {}` containing pure math, it would hijack the CPU core forever, starving other threads.
- **Modern Go behavior (preemptive)**: Go utilizes **Async Preemption**. The runtime runs a background monitor thread called **sysmon** that doesn't need a P. If `sysmon` detects that a single goroutine has been hogging a CPU core for more than 10 ms, it emits an async OS signal `SIGURG` to that thread. The CPU core intercepts the signal, safely pauses the runaway goroutine, pushes it back to the GRQ, and schedules a different task.

## 2. What is the Go Scheduler?

The Go scheduler is the internal engine inside the Go runtime that allocates your goroutines onto your computer's CPU cores.
If you write `go doSth()`, the Go scheduler handles its entirely in user space, bypassing the OS kernel to achieve massive concurrency scales.

### Why not use OS threads?

In trad langs like Java / C++, concurrency is usually achieved by mapping one app thread directly to one OS thread. This introduces 3 severe scaling bottlenecks:
- **memory footprint**: An OS thread requires a fixed stack size of 1-2 MB. If you spawn 10 000 threads,  your system will instantly crash from running out of gigabytes of RAM.
- **context switching overhead**: When the OS switches from executing Thread A to Thread B, it must save a massive amount of CPU register state, drain hardware caches, and jump between user space and kernel boundaries. This costs thousands of CPU clock cycles.
- **lack of Go-specific insight**: The OS kernel does not understand Go concepts. It cannot optimize for channel operations, garbage collection cycles, or network polling loops.

**The Golden Rule:** An OS thread (M) cannot execute any Go code unless it captures a logical processor (P).

## 3. What scheduling strategy does Go use for goroutines?

See above.

## 4. Under what circumstances does the Go scheduler perform a context switch?

In the Go runtime, a context switch occurs when the scheduler decides to detach a goroutine (G) from its executing OS thread (M) and logical processor (P), putting it into a waiting or runnable state so another goroutine can take over.
Because Go scheduler operates in user space, these context switches are lightweight (100-200 CPU clock cycles, compared to thousands for an OS kernel thread switch).

### 5 circumstances to trigger context switch

- **Blocking Channel Operations (r/w)**: Channels are the primary synchronization primitive in Go. When a goroutine attempts to send data to a full channel, or read data from an empty channel, it cannot proceed.
	- **mechanism**: The channel internal structure tracks the blocked goroutine in a wait queue `sudog`. The runtime changes the goroutine's status from `_Grunning` to `_Gwaiting` and calls `gopark()`.
	- **switch**: The scheduler detaches the blocked goroutines from the thread (M) and schedules the next runnable goroutine from the logical processor's (P) LRQ.
- **Synchronous System Calls (Blocked I/O)**: When Go code interacts with the outside world via the OS kernel, e.g. reading a file from a disk, making a blocking network call, or allocating raw OS memory, the underlying thread (M) itself is forced to freeze and block.
	- **mechanism**: To prevent this blocking call from starving all the other ready goroutines sitting in that processor's queue, the scheduler executes a hand-off.
	- **switch**: The executing thread (M) and the blocked goroutine (G) stay bundled together and plunge into the OS kernel wait state. Meanwhile, the logical processor (P) cleanly detaches itself from the blocked thread and attaches to fresh or idle OS thread (M) to keep executing the remaining LRQ.
- **Asynchronous Preemption (Time Slicing)**: To maintain absolute fairness and prevent a rogue goroutine from hijacking a CPU core forever, e.g. executing an infinite loop like `for {}` performing heavy mathematical operations, Go employs async preemption.
	- **mechanism**: The Go runtime spins up a background system monitor thread called `sysmon` (which runs without a P). `sysmon` continuously audits execution durations.
	- **switch**: If `sysmon` discovers that a single goroutine has continuously held a CPU core for more than 10 ms, it emits a low-level OS signal `SIGURG` directly to that thread. The CPU core catches the signal, triggers an interrupt handler, safely changes the runaway goroutine's state to `_Grunnable`, moves it to the GRQ, and executes a context switch to allow a different task onto the core.
- **Explicit Synchronization & Network Polling (`sync` & `net`)**: Whenever a goroutine encounters complex coordination primitives or enters network-bound waiting states, the runtime will proactively context-switch to keep hardware utilization optimized.
	- **Mutex / WaitGroup contention**: If a goroutine tries to acquire a locked `sync.Mutex` and fails its brief active spinning phase, or blocks on a `sync.WaitGroup.Wait()`, it is parked via a runtime semaphore queue.
	- **network I/O (`netpoller`)**: Go handles network connections asynchronously using a highly optimized internal component called the **Netpoller**, which wraps native OS engines like `epoll` on Linux or `kqueue` on macOS. If a goroutine reads from a network socket that doesn't have data ready yet, it context-switches immediately. The goroutine registers its file descriptor with the Netpoller and sleeps until the OS network stack signals that bytes have arrived.
- **Runtime Boundary Hooks (GC & Co-ops)**: There are explicit architectural events written into standard Go code where the runtime forces context-switching for maintainence or structural cooperation.
	- **GC assist**: When Go's concurrent tri-color GC is active, the runtime may execute a context switch to turn an aggressive, memory-allocating goroutine into a Mark Assist worker, forcing it to help find and mark memory objects before it is allowed to continue its own tasks.
	- **manual yielding (`runtime.Gosched()`)**: If a developer explicitly calls `runtime.Gosched()`, the current goroutine voluntarily gives up its turn. It detaches from the core, moves to the tail of the GRQ, and lets the scheduler pick another runnable candidate.

## 5. How does an M find a runnable G?

When an OS thread (M) is ready to execute work, it enters the core execution loop of the Go scheduler (specifically the internal `findrunnable()`  func in the runtime).
An M must always have an attached P to run Go code. To find a runnable G, the M executes a strict, highly optimized priority search sequence designed to minimize lock contention and maximize CPU cache locality.

### The 7-step search sequence

**1. The 61-tick global queue check (anti-starvation)**

Before checking its own local queue, the M checks a counter. Exactly 1 out of every 61 scheduling ticks, it bypasses the local queue and checks the centralized GRQ first.
If a P has an endless stream of local goroutines, it could theoretically run forever without ever touching the GRQ. This check guarantees that global goroutines aren't starved of CPU time.

**2. Check the LRQ**

If it isn't the 61st tick, or if the global check comes up empty, the M looks inside its own attached P's LRQ.
This queue holds up to 256 goroutines. Because this queue is owned exclusively by this specific P, the M can pop a G off the head of the queue lock-free using atomic operations, bypassing global mutex synchronization.

**3. Check the Netpoller (non-blocking)**

If the LRQ is empty, the M checks Go's network I/O engine, the Netpoller. It performs a rapid, non-blocking check to see if any network sockets have received data from the OS kernel. If a network-bouund goroutine has been woken up by an incoming network packet, the M grabs it and executes it immediately.

**4. Work stealing (siblnig queues)**

If the M still hasn't found work, it enters work stealing mode. It randomly selects another P in the system and inspects its LRQ.
If it finds a sibling queue with active work, it steals exactly half of that sibling's runnable goroutines and moves them into its own local queue, instantly re-balancing the cluster's workload.

**5. Check the GRQ (full lock)**

If work stealing fails (all other local processor queues are drained), the M falls back to the GRQ.
It acquires the global scheduler mutex lock, inspects the queue, and grabs a batch of goroutines to populate its empty local queue.

**6. Check the Netpoller (blocking)**

If absolutely no work exists anywhere in the local, sibling, or global queues, the M performs one final, desparate check on the Netpoller, but this time it allows a blocking or polling state. If any network activity completes during this brief window, it claims the unblocked goroutine.

**7. Release P and go to sleep**

If all 6 steps yield zero runnable goroutines, the app has officially hit a low-concurrency lull.
The thread (M) detaches from its P, returns the P to the idle processor pool `pidle`, changes its own state to idle, and plunges into an OS thread sleep state until a new goroutine is spawned (`go func()`) and wakes it up.

## 6. Can the P layer be removed from the GMP model? What would happen if it were?

It's theoretically possible to remove the P layer, because early version of Go (before 1.1) didn't have it. The runtime used a simple GM model where goroutines were mapped directly to OS threads.
However, removing the P layer would destroy Go's ability to scale to millions of concurrent requests.

### Historical GM

In GM model, all runnable goroutines were stored in a single, centralized global queue.
Every time an M wanted to run a goroutine, it had to acquire a global mutex lock, pop a G off the central queue, and release the lock.
As CPUs added more cores, performance actually degraded. If you had 32 CPU cores, you had 32 OS threads (M) all violently thrashing the exact same memory cache line, fighting over a single mutex lock just to find their next instruction. The scheduler spent more time executing lock synchronization than running actual app code.

> Dmitry Vyukov, a core Go runtime engineer, realized this model was broken and introduced the P layer in a famous 2012 design doc titled _Scalable Go scheduler Design_.

### What would happen if we removed P today?

4 major system failures would occur instantly.

**A. Catastrophic lock contention**

Without P, there would be no LRQ. Every thread-safe spawning `go func()`, channel unblocking, or network wakeup would have to register its target task back onto a single global queue. Your high-throughtput web service would spend almost all its CPU cycles stalled in a hardware mutex queue.

**B. Complete loss of CPU cache locality**

A P tries to keep related goroutines bound to the same physical thread and CPU core. When G1 spawns G2, G2 is immediately pushed onto the LRQ of the current P.
Because the current CPU core already has G1's data loaded into its high-speed L1/L2 hardware caches, running G2 next on the same core is extremely fast. Without P, G2 would be dumped into a global bucket and likely picked up by a different thread on a different physical CPU socket, forcing an expensive L1/L2 cache flush and a slow RAM reload.

**C. Severe thread bloat during system calls**

When a goroutine executes a blocking file read, its thread (M) freezes. The P layer allows Go to detach the remaining 250 ready goroutines and hand them off to a running thread.
If there were no P layer, those 250 tasks would be stranded on the frozen thread. The runtime would be forced to spawn a massive number of raw OS threads to keep the system moving, blowing past your system memory limits and causing thread starvation.

## 7. At what point does the Go runtime create Ps and Ms?

### Startup Phase

When you click run on a compiled Go binary, the OS bootstrap loads the executable into memory and jumps to the runtime initialization code `src/runtime/proc.go`.
At this moment, `main()` hasn't started yet. The runtime executes the following strict chronological sequence:
1. Hardware Inspection (`schedinit`): The runtime calls `runtime.NumCPU()` to look at the machine's hardware and count its logical hyper-threads.
2. Read Configuration: It checks if you have overriden the CPU ceiling using the environment variable `GOMAXPROCS`. If not, it sets `GOMAXPROCS` to match your machine's logical threads.
3. Allocate the P Array (`procresize`): The runtime executes an internal function called `procresize()`. The function allocates a static, fixed-size slice in memory to hold the Ps.
4. Instantiate the Ps: The runtime instantiates exactly `GOMAXPROCS` number of P structures inside that slice. It fully hooks up their LRQs, their memory allocation blocks `mcache`, and their local GC tracking metadata.

Once `procresize()` finishes during startup, the number of P structures is locked down. They are recycled, detached, and re-attached continuously, but no new Ps will ever be created or destroyed for the remainder of your app's lifespan.

### Lifespan Phase

Unlike the rigid allocation of Ps, Ms are spawned adaptively. The Go runtime creates an M under 4 circumstances.

**A. Bootstrap `mcommoninit`**

During the same startup phase where Ps are being built, the Go runtime spawns M0 (the absolute first OS thread) to handle the bootstrap loop. M0 captures P0, creates the first goroutine which wraps your `main.main` func, and kicks off the execution pipeline.

**B. The syscall hand-off trigger**

As the app runs, if a goroutine executes a blocking OS call, the thread M1 holding that goroutine freezes.
- P1 unlinks from M1 to save its remaining 250 local goroutines.
- The scheduler looks at the system's global idle thread pool `pidle`. If there are no idle Ms available to take over P1, the runtime instantly calls the host OS's kernel API (like `pthread_create` on Linux) to spawn a brand new physical thread M2 to keep the queue moving.

**C. Work spawning (`newobject` / `wakehandler`)**

Whenever your code spawns a new goroutine using the `go` keyword, the runtime adds the new G to a run queue. If there are idle P contexts sitting around but not enough active threads to cover them, the runtime immediately wakes up or allocates a new M to pair with the idle P and start chewing through the newly added task backlog.

**D. The sysmon safety net**

Go runs a background system monitor thread `sysmon` that operates outside the P constraint. Every few milliseconds, `sysmon` audits the app cluster. If it notices that a P has been stranded or neglected because its corresponding threads are trpped or deadlocked, `sysmon` will invoke a runtime call to forge a fresh M and forcefully attach it to the abandoned P.

### Production Summary Matrix

| Runtime Layer | Allocation Point | Allocation Frequency | Bound By |
| P (logical processor) | App Initialization, inside `schedinit` / `procresize` before `main()` executes. | Static & fixed. Created exactly once. | Capped strictly by `GOMAXPROCS`. |
| M (OS thread) | Dynamic & Adaptive. Spawned whenever a P is orphaned by a blocking syscall or work surges. | Variable. Created on-demand as workloads shift. | Capped by a default maximum safety ceiling of 10 000 threads. |

## 8. What is `m0`, and what is its purpose?

`m0` is the absolute 1st thread created when a Go program boots up. It's a unique, statically allocated OS thread.
While ordinary Ms are allocated dynamically on the heap as your app runs, `m0`'s memory is built into the program's compiled binary data section.

### Purpose: Bootstraping the world

When you execute a compiled Go binary, the OS kernel reads the file, sets up a raw process, and hads control over to the Go runtime's assembly entry point.
At this point, the Go runtime's complex features do not exist yet. There is no memory allocator, no GC, and no scheduler. An ordinary M cannot be created because the heap allocator isn't running yet to give it memory.

### `m0` Startup Timeline

When your program launches, `m0` performs a strict chronoligical sequence of tasks to build the env:
1. `mcommoninit`: `m0` initialzes itself and links into the global runtime tracker.
2. `schedinit`: `m0` calls the core scheduler initialization. It counts your CPU cores, sets `GOMAXPROCS`, and creates the fixed array of Ps.
3. capture `P0`: `m0` binds itself to the very first `P0`.
4. create the runtime goroutine `g0`: `m0` initializes a special coordination goroutine called `g0` (which owns a massive, fixed stack used exclusively for scheduling logic rather than user code).
5. spawn `main`: using `g0`, `m0` creates the first official user goroutine that wraps your actual `main.main()` func.
6. start the engine: `m0` begins executing the scheduler loop, which picks up the `main` goroutine and brings your app to life.

### After startup

Once the startup phase is complete, `m0` loses its special status and becomes just another regular thread in the GMP scheduler pool.
It's not destroyed, and it doesn't stay trapped running only the main thread, It behaves exactly like other M.


## 9. What is `g0`, and what is it used for?

`g0` represents the runtime system stack for an M. While regular goroutines run the app code on a highly dynamic, resizable stack (starting at 2 KB), `g0` runs the runtime's internal C-like management code on a massive, fixed-size stack (typically 8-32 KB depending on the architecture).
Any internal task that requires deep stability, cannot risk stack growth overhead, or must happen outside the context of a user task, runs on the `g0` stack.

### 4 non-scheduling jobs of `g0`

Whenever an M needs to drop out of your user app space to perform infra management, it switches its stack pointer to `g0`. This happens across 4 critical subsystems:

**A. Memory allocation `mallocgc`**

When your user code allocates memory, e.g. creating a massive slice or a new struct, the runtime checks if it can fit into the thread's local cache.
If it needs to talk to the central memory pools (`mcentral` or `mheap`) to request fresh virtual memory blocks (mspans), it switches to `g0`.
Because allocating memory can require deep, complex system calculations. If the runtime tried to compute this on a regular user stack, it might run out of space and trigger a stack split, which would require more memory allocation, causing an infinite runtime loop panic.

**B. GC Phases**

While Go uses a concurrent garbage collector, certain operations, e.g. turning on the concurrent write barriers, sweeping dead spans, or running the brief stop-the-world (STW) synchronization checkpoints, are executed on the `g0` stack.

**C. Goroutine creation `newproc`**

When you type `go doWork()`, the current user goroutine doesn't actually build the new goroutine object. Instead, the thread switches to `g0`.
The `g0` stack allocates the new `g` structure, provisions its initial 2 KB stack, and appends it to the P's run queue.

**D. Stack growth * shrinking `morestack`**

Go user stacks are dynamically resized. When a user goroutine runs out of space, it triggers a special guard instruction that calls `morestack`.
- The thread instantly switches to `g0`.
- The `g0` stack allocates a new chunk of memory that is **double the size** of the old stack.
- `g0` copies all the old stack frames into the new space, updates the internal pointers, and switches back to the user goroutine.

### How the thread switches to `g0`

Every M has exactly one unique `g0` goroutine created for it automatically when the thread is born.
When your app is executing normally, the CPU's stack pointer register is looking at your user goroutine stack. The moment a context switch, memory allocation, or syscall occurs, the runtime invokes an assembly routine called `gogo` or `mcall`.

```
USER EXECUTION                       SYSTEM PLUMBING
┌────────────────┐  runtime.mcall()  ┌────────────────┐
│ User Goroutine │ ────────────────> │    g0 Stack    │
│  (2KB Stack)   : <──────────────── :  (Fixed 8KB+)  │
└────────────────┘   runtime.gogo()  └────────────────┘
```

- `mcall(fn)`: Saves the CPU registers of the current user goroutine into its `g.sched` strucutre. It then changes the CPU's stack pointer register to look at the `g0` stack memory area and executes the runtime function `fn`.
- `gogo(g)`: The exact reverse. Once the runtime stack (e.g. finding a new runnable goroutine) is complete, `g0` calls `gogo`, which reloads a user goroutine's saved registers back into the CPU and shifts the stack pointer back to the user stack.

### User `g` vs. `g0`

| Attribute | User Goroutine `g` | System Goroutine `g0` |
| --- | --- | --- |
| Stack Type | Dynamic. Grows and shrinks at runtime. | Fixed. Explicitly bound size (8 KB or more). |
| Allocation Site | Dynamic heap allocation. | Allocated inside the M's thread descriptor. |
| Code Allowed | Any user app business logic. | Strictly un-preemptible runtime management code. |
| Quanity | Can scale to millions of active nodes. | Strictly one per physical OS thread (M). |

## 10. How does the Go runtime switch between the `g0` stack and a user goroutine's stack?

See above.
