# Java Core

## 1. What is SOLID principle?

- **single responsibility:** a class should have only one reason to change. Do not let a `UserService` handle database logic, send email, parse JSON.
- **open-closed:** software entities should be open for extension, but closed for modification. If you need to add a new payment method, you should be able to add a new class that implements a `PaymentStrategy` interface rather than rewriting an if-else block in the existing service.
- **Liskov's substitution:** objects of a superclass should be replaceable with objects of its subclass without breaking the app. If class B extends class A, you should be able to pass B into any method that expects A without throwing `RuntimeException`.
- **Interface segregation:** no clients should be forced to depend on methods it does not use. Instead of one `Worker` interface with `work()`, `eat()` and `sleep()`, split them into `Workable` and `Eatable`. A `Robot` class should not be forced to implement an `eat()` method it doesn't need.
- **Dependency inversion:** depend on abstractions, not concretions. The Controller should depend on a Service interface, not the `ServiceImpl` class.

## 2. What is OOP?

- **abstraction:** hiding implementation using interface or abstract class and providing functionality
- **polymorphism:** redefining a single action in different ways.
- **inheritance:** is-a relationship, a subclass can inherit the features of its superclass and add its own modifications.
- **encapsulation:** bundling data and methods into one class and restricting access by providing getters and setters.

## 3. What is the is-a and has-a relationship in Java?

- is-a is inheritance, a subclass can inherit the features of the superclass and add its own modifications
- has-a is aggregation, a class has an entity reference, e.g. `Employee` has an `Address`

## 4. What is method overriding and method overloading?

- **overloading (compile time):** a class has multiple methods sharing the same name but different signatures (different number and data types of parameter)e.g. `findUser()` by `id` and by `username`
- **overriding (runtime):** a method in the subclass has the same signature as in the superclass, with different implementation, e.g. `public int compare()` when using a custom Comparator to sort collections

## 5. Difference between interface and abstract class

- **purpose:** interface defines a contract (what to do, not how), abstract class defines a base identity (is-a), provides shared code for subclasses
- **field:** interface can only have constants that don't hold state (`public static final`), abstract class can have instance variables
- **method:** interface can only have public abstract methods, abstract class can have both abstract and concrete methods
- **constructor:** interface cannot have constructors, abstract class can
- **inheritance:** a class can inherit multiple interfaces, but can extend only one abstract class

## 6. What is the diamond problem? How to solve?

It's multiple inheritance in OOP: a class inherits from 2 parent classes that both inherit from a single grandparent class.

Java prevents it by disallowing multiple inheritance. If a class implements 2 interfaces that share the same default method signature, you must explicitly override the conflicting method in the child class and use `Interface.super.methodName()` to tell the compiler which implementation to use.

## 7. Is Java passing by value or passing by reference?

By value. For Primitives, pass copy of values. For Objects, pass copy of references.

## 8. Difference between `Array` and `ArrayList`

| Feature     | Array                            | ArrayList                                                |
| ----------- | -------------------------------- | -------------------------------------------------------- |
| nature      | static                           | dynamic                                                  |
| size        | fixed size                       | resizable                                                |
| type        | can store primitives and objects | can only store objects                                   |
| performance | faster, less overhead            | slower, `O(n)` for resizing                              |
| methods     | basic                            | built-in `add()`, `remove()`, `contains()`, `iterator()` |

## 9. Difference between `ArrayList` and `LinkedList`

| Feature        | ArrayList                       | LinkedList                         |
| -------------- | ------------------------------- | ------------------------------------ |
| data structure | dynamic array                   | doubly linked list                 |
| access         | `O(1)`                          | `O(n)`                             |
| manipulation   | `O(n)`                          | `O(1)`                             |
| memory         | lower overhead                  | higher overhead                    |
| iterating      | cache-friendly, because data is | less cache-friendly, because nodes |
|                | stored in contiguous memory     | are scattered across the Heap      |

## 10. What is an immutable class? How to create?

It's an object whose internal state cannot be changed after construction.

How to create:

- declare the class as final
- make all fields private and final
- no setter methods
- initialize through an all-args constructor
- if fields are references to other mutable objects, return a deep copy in getters

## 11. Why is `String` immutable?

String pool: if String is mutable, changing the value of one reference would change every other part pointing to that pool entry.

Security: Strings are heavily used as parameters in sensitive operations, e.g. db connection urls, username and pwd. If String is mutable, the attacker can change the string value to a sensitive path when performing security checks, i.e. a Time-of-Check to Time-of-Use vulnerability.

Thread Safety: Don't need to worry about race conditions where 2 threads are trying to update the same String at once.

## 12. Difference between `==` and `equals()`

`==` compares primitive values and object references

`equals()` compares values inside objects

## 13. Difference between `String`, `StringBuilder`, and `StringBuffer`

| Feature       | `String`                     | `StringBuilder`                | `StringBuffer`                  |
| ------------- | ---------------------------- | ------------------------------ | ------------------------------- |
| mutability    | immutable                    | mutable                        | mutable                         |
| thread safety | safe                         | not safe                       | safe (methods are synchronized) |
| performance   | slowest for frequent updates | fast for single-threaded tasks | slower due to locking overhead  |
| storage       | String Pool / Heap           | Heap                           | Heap                            |

## 14. Difference between `default` and `protected` access modifier

| modifier  | class | package | subclass | global |
| --------- | ----- | ------- | -------- | ------ |
| public    | T     | T       | T        | T      |
| protected | T     | T       | T        | F      |
| default   | T     | T       | F        | F      |
| private   | T     | F       | F        | F      |

## 15. How does `HashMap` work internally?

A bucket array and hash function

Each bucket index ties a `LinkedList`, if exceeds the threshold, turn `LinkedList` to Red-Black Tree

## 16. How does `HashSet` work internally?

A `HashMap` using element as the key, a private static dummy object as value

## 17. Difference between `HashMap`, `SynchronizedMap`, and `ConcurrentHashMap`

| Feature           | `HashMap`       | `SynchronizedMap`          | `ConcurrentHashMap`   |
| ----------------- | ------------------------------------ | ------------------------------------ | ---------------------------------- |
| thread safety     | No                                   | Yes, use a single object-level lock  | Yes, use fine-grained bucket-level |
|                   |                                      |                                      | locking (CAS/volatile)             |
| locking mechanism | None                                 | locks the entire map for every r/w   | only locks the bin being updated   |
| performance       | fastest (only for single threads)    | slow, only one thread can access     | high throughput, multiple threads  |
|                   |                                      | the map at a time                    | can r/w concurrently               |
| null keys/values  | allow 1 null key, multiple values    | allow                                | not allowed, throws                |
|                   |                                      |                                      | `NullPointerException`             |
| iterator type     | fail fast, throws                    | fail fast, requires manual           | fail safe, weakly consistent,      |
|                   | `ConcurrentModificationException`    | synchronization during iteration     | throw no exceptions if map changes |

## 18. Difference between `List`, `Set`, `Map`, `Queue`

| Feature    | List            | Set           | Map        | Queue          |
| ---------- | --------------- | ------------- | ---------- | -------------- |
| duplicates | allowed         | not allowed   | keys not   | allowed        |
| ordering   | insertion order | varies        | varies     | FIFO           |
| access     | `O(1)`          | `O(1)`-`O(n)` | `O(1)`     | head/tail only |
| interface  | `Collection`    | `Collection`  | standalone | `Collection`   |

## 19. What are types of Exception?

- unchecked: any classes extends `RuntimeException`, checked by JVM at runtime, e.g. `NullPointerException`, `ArrayIndexOutOfBoundsException`, `ArithmeticException`
- checked: other than unchecked, checked by compiler at compile time, e.g. `IOException`, `SQLException`, `FileNotFoundException`

## 20. How do you handle exceptions in Java?

- try/catch/finally
- throw: explicitly throw an exception.
- throws: added to the method signature to let the caller know what exception the method can throw.

checked exceptions must be explicitly declared using `throws` and handled by the caller.

unchecked exceptions automatically propagate without requiring declaration.

customized exception (can be checked/unchecked) uses `throw` keyword.

## 21. How do you handle exceptions in your web application?

try-catch

create custom exceptions and handle them in a centralized `GlobalExceptionHandler` with Spring AOP, `@ControllerAdvice` , `@ExceptionHandler`

return proper message and proper error code to client

## 22. Explain Exception propagation

When an exception occurs, JVM searches for a matching catch block in the current method

If not found, the exception is propagated to the caller method

This process continues until the exception is handled, or reaches the `main()` method

If unhandled, JVM terminates the program and prints the stack trace

## 23. How to create customized exceptions?

- extend `Exception` for checked exceptions
- extend `RuntimeException` for unchecked exceptions

## 24. Difference between `final`, `finally`, `finalize`

`final` is a modifier to make variables, methods, classes immutable (cannot be changed, overridden, extended)

`finally` is a block used in exception handling, ensures a section of code is always executed

`finalize` is a protected method defined in the `Object` class, traditionally used to cleanup before an object is destroyed by garbage collector, now deprecated.

## 25. How to create a thread?

- extends the `Thread` class and overrides the `run()` method
  - pros: simple for small, isolated tasks
  - cons: Java only supports single inheritance, if the class extends `Thread`, it cannot extend other classes, like a `BaseService`
- implements the `Runnable` functional interface and overrides the `run()` method
  - pros: separate the task from the runner, can extend other classes
  - cons: the `run()` method cannot return a result or throw checked exceptions
- uses `ExecutorService` to manage a pool of threads that can be reused
  - pros: efficient resource management, allows you to use `Callable` which can return a value and throw exceptions

```java
class MyThread extends Thread {
  @Override
  public void run() {
    System.out.println("Thread is running...");
  }
}

class MyRunnable implements Runnable {
  @Override
  public void run() {
    System.out.println("Thread is running...");
  }
}

ExecutorService executor = Executors.newFixedThreadPool(10);
executor.execute(() -> {
  System.out.println("Task running in a thread pool");
});
executor.shutdown();
```

Difference between `start()` and `run()`:

- `start()` creates a new thread and calls the `run()` method inside the new thread
- `run()` executes the method in the current thread without creating a new thread

## 26. Difference between `Runnable` and `Callable`

- `Runnable` has the `run()` method that returns `void`, `Callable` has a `call()` method that returns `V` (generic type)
- `Runnable` cannot throw checked exceptions, must handle them using try-catch inside the `run()`. `Callable` can propagate checked exceptions up to the caller by declaring `call()` with `throws`.
- `Runnable` can be executed with `Thread` class or `ExecutorService`, while `Callable` can only be executed by `ExecutorService`.

```java
// Runnable
Runnable logTask = () -> {
  System.out.println("Logging login event at " + System.currentTimeMillis());
};
new Thread(logTask).start();

// Callable
Callable<List<String>> permissionTask = () -> {
  Thread.sleep(1000);
  return List.of("READ_PRIVILEGE", "WRITE_PRIVILEGE");
};
ExecutorService executor = Executors.newSingleThreadExecutor();
Future<List<String>> future = executor.submit(permissionTask);
List<String> permissions = future.get();  // blocks until the result is ready
```

## 27. Why `wait()` and `notify()` are in the `Object` class, not in the `Thread` class?

They are used for inter-thread communication, which happens around a shared resource, i.e. monitor.

Since any Java object can be a monitor, the methods must be available to every object.

There can be multiple threads waiting on the state of an object. If they were in the `Thread` class, then the shared object would have to know which threads are waiting on it, i.e. tight coupling.

When a thread calls `object.wait()`:

- it gives up the lock it holds on that specific object
- it goes to sleep

## 28.What is `join()`?

- is defined in `java.lang.Thread` class
- allows one thread to wait for the completion of another
- `join(timeout)`: the main thread will wait for the new thread to finish for up to `timeout` ms. Afterwards, if the new thread is still running, the main thread will resume.

## 29. Explain thread life cycle

Thread Scheduler of JVM manages the state of thread

- `NEW`: just created but not started
- `RUNNABLE`: created, started and able to run
  - `RUNNING`: is currently running
- `BLOCKED`, `WAITING`, `TIME_WAITING`: created, started, but unable to run, because it's waiting for some event to occur
  - `BLOCKED`: waits to acquire a lock, e.g. synchronized
  - `WAITING`: waits indefinitely, e.g. `join()`, `wait()`
  - `TIMED_WAITING`: waits for a specific time, e.g. `sleep()`, `wait(ms)`, `join(ms)`
- `TERMINATED`: has finished or is stopped

## 30. Difference between `sleep()` and `wait()`

| Feature      | `object.wait()`                       | `Thread.sleep()`                         |
| ------------ | ------------------------------------- | ---------------------------------------- |
| class        | `java.lang.Object`                    | `java.lang.Thread`                       |
| lock release | releases the lock so others can enter | holds the lock and no one else can enter |
| condition    | waits for a `notify()` call           | waits for a specific duration            |
| context      | must be inside a synchronized block   | can be called anywhere                   |

## 31. What is `countDownLatch`?

It's a synchronization aid that allows one or more threads to wait until a set of operations being performed in other threads completes.

- initialize `countDownLatch` with a counter
- the main thread calls `await()`, which blocks it until the counter reaches 0
- other worker threads perform their tasks and call `countDown()` when they finish
- once the counter hits 0, the waiting thread is released and continues its execution

## 32. What is semaphore?

It's a thread synchronization utility that maintains a set of permits. It's used to restrict the number of threads that can access a particular resource simultaneously.

`java.util.concurrent.Semaphore` class provides 2 primary methods:

- `acquire()`: requests a permit. If a permit is available, the thread takes it and the count decreases. If no permit is available, the thread blocks until one is released.
- `release()`: returns a permit back to the semaphore and increases the count. This potentially wakes up a waiting thread.

## 33. Difference between `Future` and `CompletableFuture`

| Feature            | `Future`                                 | `CompletableFuture`                                  |
| ------------------ | ---------------------------------------- | ---------------------------------------------------- |
| chaining           | not possible                             | possible using `.thenApply()`, `.thenAccept()`       |
| blocking           | Yes, requires `.get()` to see the result | No, uses callbacks to process results asynchronously |
| exception handling | must handle inside the task              | has `.exceptionally()` for recovery logic            |
| combining tasks    | difficult                                | easy, can wait for all or any tasks to finish        |

## 34. Advantage of `ExecutorService` instead of creating a new thread and running it

- maintains a thread pool, reuses a fixed number of threads to execute tasks
- allows task queue when all threads in a pool are busy
- decouples task and execution, only cares about how (deciding which thread runs it, managing lifecycle, handling shutdown)
- uses `Callable` to return a `Future` (or `CompletableFuture`*), to see if the task is done, wait for the result, or handle exception
- provides clean methods like `.shutdown()` or `.shutdownNow()`

Actually, `ExecutorService.submit(Callable)` strictly returns a `Future` interface.
If you need a `CompletableFuture` that runs your task inside a specific `ExecutorService`, use one of the following design patterns.

### Pass the thread pool directly into the `CompletableFuture` factory methods

```java
ExecutorService executor = Executors.newFixedThreadPool(4);

// This automatically routes the task to your custom executor
CompletableFuture<String> completableFuture = CompletableFuture.supplyAsync(() -> {
  return "Task Result";
}, executor);
```

### Handle checked exceptions with an adapter

If your existing `Callable` throws checked exceptions, you can wrap it inside a `CompletableFuture.supplyAsync` call by catching and rethrowing it as a `CompletionException`.

```java
Callable<String> myCallableTask = () -> {
  if (somethingFails) throw new IOException("Disk error");
  return "Success";
};

CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
  try {
    return myCallableTask.call();
  } catch (Exception e) {
    throw new CompletionException(e);
  }
}, executor);
```

## 35. What is a deadlock? How to handle deadlock?

Necessary conditions:

- mutual exclusion (only 1 process can use a resource at a given time)
- hold and wait
- no preemption
- circular wait

Solutions:

- try lock with timeout and retry
- lock ordering
- minimize the number of locks a thread needs at once

## 36. What is synchronization? How to do that?

It's the mechanism that ensures only one thread can access a shared resource at a time.

How to do sync:

- add `synchronized` keyword to method signature
- instance method: locks the current instance (`this`)
- static method: locks the `Class` object
- synchronized block: locks the specific lines of code that handle shared data
- reentrant lock: more flexible than `synchronized` keyword, e.g. checks if a lock is available without blocking

## 37. What is `readWriteLock`?

A standard `ReentrantLock` is exclusive even if others just want to read.

`readWriteLock` allows multiple readers to access the data simultaneously.

## 38. What is a marker interface? Provide an example and explain how it works.

An interface that contains no methods or constants.

The sole purpose is to mark a class so that JVM can treat objects of that class differently.

Examples:

- `Serializable`: tells the JVM that this object can be converted into a byte stream
- `Cloneable`: indicates it's legal to use `Object.clone()` on instances of this class
- `Remote`: used in RMI (remote method invocation) to identify interfaces whose methods may be invoked in a non-local virtual machine

## 39. What does Serialization mean?

It's the process of converting the state of a Java object into a byte stream.

A byte stream can be:

- saved to a file (persistence)
- sent over a network to another JVM (communication)
- stored in a cache (memory management)

## 40. What's the purpose of transient variables?

When you mark a variable as `transient`, you tell the JVM: ignore this field during serialization, and reconstruct it to its default value during deserialization.

## 41. How to do serialization and deserialization?

### Classical Java way

```java
Employee emp = new Employee("Fedora", 101, "SecretPass");
// Serialization
try (ObjectOutputStream out = new ObjectOutputStream(new FileOutputStream("employee.ser"))) {
  out.writeObject(emp);
  System.out.println("Object has been serialized");
} catch (IOException e) {
  e.printStackTrace();
}

// Deserialization
try (ObjectInputStream in = new ObjectInputStream(new FileInputStream("employee.ser"))) {
  Employee deserializedEmp = (Employee) in.readObject();
  System.out.println("Object has been deserialized");
  System.out.println("Name: " + deserializedEmp.getName());
  // password will be null because it was marked as transient
  System.out.println("Password: " + deserializedEmp.getPassword());
} catch (IOException e) {
  e.printStackTrace();
}
```

Multiple lines in the `try` clause:
This is try-with-resources, guaranteeing the file will be closed automatically, even if an error occurs.
Without this, you would have to write a much longer `finally` block to manually close the stream.

### JSON with Jackson

```java
import com.fasterxml.jackson.databind.ObjectMapper;

ObjectMapper mapper = new ObjectMapper();
Employee emp = new Employee("Fedora", 101, "SecretPass");

// Serialization to JSON string
String jsonString = mapper.writeValueAsString(emp);
System.out.println("JSON: " + jsonString);

// Deserialization from JSON string
Employee empFromJson = mapper.readValue(jsonString, Employee.class);
```

## 42. What is memory leak? How to detect it?

It's when objects are no longer being used by the app, but garbage collector cannot remove them from the Heap because they are still referenced by other live objects.

Detect tools: VisualVM, JConsole, Java Flight Recorder, Eclipse Memory Analyzer

## 43. What are Young Generation, Old Generation, and PermGen/MetaSpace?

**YoungGen:** where all new objects are born, designed for high-speed allocation and frequent GC

**OldGen:** an object survives enough rounds of minor GC and is promoted here. Major GC happens with stop-the-world pause in the app

**PermGen:** part of the Java Heap, where JVM stores metadata about classes

**MetaSpace:** native memory (RAM outside the Java Heap)

## 44. What are the components of JVM?

3 subsystems:

- class loader: responsible for dynamic class loading, handling 3 phases
  - loading: finds the .class file and imports binary data into the memory
  - linking: verifies the bytecode is safe and follows Java's rules
  - initialization: executes static blocks and assigns values to static variables
- runtime data areas: where JVM stores data during execution
  - method area (shared): class-level data, static variables, method code
  - heap area (shared): objects and their instance variables
  - stack area (per-thread): local variables, method parameters, partial results
  - PC registers (per-thread)
  - native method stack (per-thread)
- execution engine
  - interpreter
  - JIT (just-in-time) compiler
  - GC
