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

## 8. What is `m0`, and what is its purpose?

## 9. What is `g0`, and what is it used for?

## 10. How does the Go runtime switch between the `g0` stack and a user goroutine's stack?
