# Garbage Collection

## 1. What are the common implementations of garbage collection?

Across systems engineering, engines use 4 GC strategies.
Runtimes often layer these strategies to achieve distinct balancing points across latency, throughput, and memory footprint.

### Mark-and-Sweep (Tracing GC)

Mark-and-Sweep forms the foundational architecture for the majority of tracing garbage collectors. It approaches memory management from a perspective of reachability.
If an object cannot be traced back to an app root, its address space is considered free.

How it works
- mark phase: The collector pauses execution or uses synchronization barriers to walk the active object graph. It starts at the GC Roots (active thread stacks, local registers, and global parameters) and traverses pointers recursively, marking a metadata bit on every discovered object to track its status as _live_.
- sweep phase: The engine iterates sequentially across the physical heap blocks. If a memory slot doesn't have its live bit marked, the collector unlinks it and drops its address boundary back into a free memory structure.
- where it's used: Go,JavaScript v8, early Lisp runtimes.

### Copying /Semi-Space Collectors

Copying collectos eliminate the problem of memory fragmentation by actively restructuring how data sits in RAM. Instead of leaving objects in place, it physically migrates them to new locations during collection cycles.

How it works: The allocator divides the available virtual heap space into 2 uniform regions: From-Space and To-Space.
- All new vars are sequentially allocated inside the active From-Space.
- When the space fills up, the collector scans the root pointers.
- Every live object discovered is cleanly copied over into a contiguous block inside the To-Space, packing them tightly together to eliminate holes.
- The pointers on the app stack are updated to match the new memory locations.
- The tracking tags swap definitions: teh old From-Space is wiped clean in a single operation, instantly becoming the new standby destination.
- where it's used: manage the Young Generation inside the JVM and the Microsoft .NET CLR.

### Mark-Compact Collectors

Mark-Compact combines the targeted, in-place evaluation of a tracking mark-and-sweep collector with the defragmentation performance of a copying allocator. It acts like a defragmentation utility for a physical hard drive.

How it works
- It executes a traditional tracing mark phase to flag reachable allocations.
- Instead of sweeping dead objects to create isolated free pockets,a sliding algo shifts all live marked items toward the absolute beginning of the heap allocation segment, creating a single, continuous block of data.
- The remaining trailing memory area is marked as a single free block, resetting the allocation pointer.
- where it's used: deployed as a fallback mechanism for Old Generation inside the JVM or .NET when memory fragmentation becomes critical.

### Reference Counting

Reference counting sidesteps global tracing cycles.
Instead of running a decoupled, periodic background collection sweep, it tracks allocations deterministically in real-time.

How it works: Every object on the heap is given an integrated intger counter field.
- Whenever a pointer copies or references that object, its counter incremented by 1.
- Whenever a pointer leaves a code block or reassign its target, the counter decrements by 1.
- The moment an object's tracking counter drops to 0, its memory is instantly freed back to the system.
- where it's used: Swift (automatic reference counting /ARC), Python (combines reference counting with a cyclic-marking engine), Objective-C, C++ smart pointers `std::shared_ptr`.

The major flow: cyclic references
If object A holds a pointer to object B, and object B holds a pointer to object A, their reference counts will never drop below 1, even if the entire app loses access to both of them. 
Runtimes must use complex cycle-detection graphs or explicit weak-pointer definitions to prevent severe memory leaks.

## 2. What garbage collection algorithm does Go use?

## 3. Can you explain tri-color marking?

## 4. What are the root objects in Go's garbage collector?

## 5. What does STW (Stop-The-World) mean?

## 6. What are the challenges of concurrent mark-and-sweep garbage collection?

## 7. How does Go handle concurrent modifications to object references during concurrent mark-and-sweep GC?

## 8. What are write barriers and hybrid write barriers? How are they implemented?

## 9. What is the garbage collection process in Go?

## 10. What conditions trigger a GC cycle?

## 11. What metrics are important for evaluating Go's garbage collector?

## 12. Why can memory leaks still occur even though Go has garbage collection?

## 13. How would you optimize Go's garbage collector?

## 14. What tools and metrics do you use to monitor Go's garbage collector?