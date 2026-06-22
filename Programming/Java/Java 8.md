---
type: Note
---
# Java 8

### 1. What features of Java 8 are you familiar with?

- Lambda, functional interface
- Stream API
- `Optional`
- `default` method
- new Date Time API
- `CompletableFuture`, `@Async`

### 2. What is Lambda expression?

Anonymous method consists of 3 parts:

- argument list
- arrow 
- body

Can only be used where a functional interface is expected.

### 3. What is functional interface?

It's an interface that contains exactly one abstract method.

`@FunctionalInterface` is not strictly required, but we can use it to tell the compiler to throw an error if someone accidentally adds a second abstract method. 

Standard functional interfaces in Java 8:

- `Predicate<T>`: takes one input, returns a boolean, e.g. `user.isActive()`
- `Function<T, R>`: takes one input, returns a result, e.g. converts a `UserEntity` to a `UserDTO`
- `Consumer<T>`: takes one input, returns nothing, e.g. logging a Kafka message
- `Supplier<T>`: takes no input, returns a result, e.g. creates a new `ArrayList`

```java
// Predicate
public class ValidationService {
	public static boolean validateUser(User user, Predicate<User> rule) {
		return rule.test(user);
	}
	
	public static void main(String[] args) {
		User user = new User("Fedora", 25, "Active");
		boolean isActive = validateUser(user, u -> u.getStatus().equals("Active"));
		boolean isAdult = validateUser(user, u -> u.getAge() >= 18);
	}
}

// Function
public class UserMapper {
	public static void main(String[] args) {
		UserEntity entity = new UserEntity(101, "Fedora", "secret_pass", "fedora@example.com");
		Function<UserEntity, UserDTO> convertToDTO = ent -> new UserDTO(
			ent.getUsername(),
			ent.getEmail()
		);
		UserDTO dto = convertToDTO.apply(entity);
	}
}
```

Why need it:

- enable lambda expressions, so that we don't need to create a whole class to define an action
- engine behind Stream API, e.g. passing a `Predicate` to use `.filter()`, passing a `Function` to use `.map()`
- decouple business logic, e.g. create a `ValidationService` that takes a `Predicate<User>` as an arg without changing the service code, following the open-closed principle

### 4. How do lambda expressions and functional interfaces work together?

A functional interface tells the Java compiler what the input and output of a function should be like.

Lambda expression is the implementation of the only abstract method in the functional interface.

```java
@FunctionalInterface
interface EmployeeFilter {
	boolean check(Employee e);
}

EmployeeFilter isSenior = (emp) -> emp.getYOE() > 5;
EmployeeFilter isRemote = (emp) -> emp.getLocation.equals("Remote");

public List<Employee> filterStaff(List<Employee> staff, EmployeeFilter filter) {
	return staff.stream().filter(filter::check).toList();
}
```

### 5. `Comparator` vs `Comparable`

`Comparable` is an interface that a class implements to define its natural ordering.

`Comparator` is a class or Lambda used to define multiple, custome sorting sequences without modifying the original class.

### 6. What is Stream API

A stream is a sequence of objects that supports various methods which can be pipelined to produce the desired result.

It's not a data structure, but takes input from `Collections`, `Arrays`, or I/O channels. It doesn't modify the original data source, but produce a new result based on a pipeline of operations.

A stream pipeline follows 3 steps:

- source: where the data comes from, e.g. `list.stream()`, `Arrays.stream()`
- intermediate operations: workstations that transform the stream, lazy (do nothing until a terminal operation is called)
- terminal operations: end of the belt, triggers the processing and produces a result

### 7. What is terminal operation and what is intermediate operation? Name some you used.

- intermediate operation: takes a stream, returns a stream
  - when you call intermediate operations, they are stored in the memory and executed when the terminal operation is called on the stream.
  - `map(), filter(), distinct(), sorted(), limit(), skip()` 
- terminal operation: marks the end of the stream, returns the actual result
  - `forEach(), toArray(), collect(), min(), count(), anyMatch()`

### 8. Differences between stream and collection

| Feature      | Collection (`List, Set, Map`)               | Stream (`java.util.stream`)                      |
| ------------ | ------------------------------------------- | ------------------------------------------------ |
| goal         | data storage                                | data processing                                  |
| memory       | eager: holds all elements in memory at once | lazy: doesn't store elements, computed on demand |
| modification | add, remove, update                         | cannot modify                                    |
| iteration    | `for`, `while` loop                         | API handles looping                              |
| reusability  | can be traversed multiple times             | can only be traversed once                       |

### 9. Is stream API sequential or parallel? How do we do parallel streams?

It can be both sequential (by default) and parallel. 

- sequential streams: elements are processed one after another in a single thread, no thread management overhead
- parallel streams: uses `ForkJoinPool.commonPool()` to partition the source data into multiple chunks, each chunk is processed in a separate thread, and results are combined back together at the end

How to create: `stream().parallel()` or `.parallelStream()`

### 10. What is `flatMap`?

It's an 1-to-N transformation that flattens the nested structure.

It takes one element, transforms it into s Stream of element, and then flattens all those individual streams into a single, continuous stream.

### 11. What is the `default` method and what is the `static` method?

- `default` method: an instance method in an interface that has a default implementation
  - can add new functionality to the existing interfaces without breaking the classes that already implement them, e.g. add `.stream()` to the `Collection` interface
  - can be overriden
- `static` method: in an interface belongs to the interface class itself, not to the objects that implement it
  - used for helper methods that are relevant to the interface's domain
  - cannot be overriden

```java
interface Vehicle {
	void drive();  // abstract method
	
	default void honk() {  // default implementation
		System.out.println("Beep beep!");
	}
	
	static void checkMaintenance() {
		System.out.println("Performing global maintenance check...");
	}
}

class Car implements Vehicle {
	public void drive() {
		System.out.println("Car is driving");
	}
	// no need to implement honk() unless you want a custom sound
}
```

### 12. What is `Optional`

It's a container object (wrapper) which may or may not contain a non-null value.

- `ofNullable(T value)`
- `ifPresent()`
- `orElse(T other)`
- `orElseThrow()`
