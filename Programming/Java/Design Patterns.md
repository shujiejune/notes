# Design Patterns

## 1. What design patterns have you used?

Builder, Factory, Singleton, Proxy, CircuitBreaker, Gateway, Saga

## 2. What is the Singleton Design Pattern?

A class only has one instance and provides a global point of access to that instance.

- private constructor: prevents other classes from instantiating the class using `new` keyword
- static variable
- static factory method: usually `getInstance()`

## 3. How to create a `Singleton`? (eager initialization and lazy initialization)

- eager initialization: the instance is created as soon as the class is loaded
  - pros: simple, thread-safe without synchronization
  - cons: instance is created even if the app never uses it
- lazy initialization: the instance is created only when it is requested for the first time
  - use double-checked locking for safety and performance in multithreads

```java
public class EagerSingleton {
  private static final EagerSingleton INSTANCE = new EagerSingleton();
  private EagerSingleton() {}  // private constructor
  public static EagerSingleton getInstance() {
    return INSTANCE;
  }
}

public class LazySingleton {
  private static volatile LazySingleton instance;
  private LazySingleton() {}
  public static LazySingleton getInstance() {
    if (instance == null) {
      synchronized (LazySingleton.class) {
        if (instance == null) {
          instance = new LazySingleton();
        }
      }
    }
    return instance;
  }
}

// Best way
public enum Singleton {
  INSTANCE;
  public void doSomething() {}
}
```

## 4. Is `Singleton` thread safe?

It depends on implementation. Eager initialization is thread-safe, and lazy initialization with `synchronized` is also thread-safe.

## 5. How to make `Singleton` thread safe (for both eager and lazy)?

```java
public class Singleton {
  private Singleton() {}

  // this inner class is not loaded into memory until getInstance() is called
  private static class SingletonHelper() {
    private static final Singleton INSTANCE = new Singleton();
  }

  public static Singleton getInstance() {
    return SingletonHelper.INSTANCE;
  }
}
```

## 6. How to prevent Singleton Pattern from Reflection, Serialization and Cloning?

The enum implementation as above.

## 7. What is the factory design pattern? Why do we use factories? How do you use this design pattern in your application?

Provides an interface of creating objects in a superclass but allows subclasses to alter the type of objects that will be created. Used in `SessionFactory`, `BeanFactory`, etc.

Why use Factory:

- loose coupling: the client code doesn't need to know the class it's instantiating, just needs to know the interface
- encapsulation: hides the complex creation logic
- consistency: ensures the objects are created in a specific valid state every time
- abstraction: follows the dependency inversion principle, depends on abstractions, not concretions

How it works:

- product (interface)
- concrete products: actual implementations
- Factory class: contains the logic to decide which product to create based on a parameter

## 8. Provide a code example for factory design pattern

```java
public class NotificationFactory {
  public Notification createNotification(String type) {
    if (type == null || type.isEmpty()) return null;

    return switch (type.toUpperCase()) {
      case "EMAIL" -> new EmailNotification();
      case "SMS" -> new SMSNotification();
      case "PUSH" -> new PushNotification();
      default -> throw new IllegalArgumentException("Unknown type: " + type);
    };
  }
}
```

## 9. Difference between factory vs. abstract factory design pattern

Factory: 1-1 relationship between the factory and the product type

Abstract Factory: 1-n relationship, an interface to create families of related or dependent objects

## 10. Provide a code example for builder design pattern

```java
// Entity
public class User {
  private final String firstName;  // Required
  private final String lastName;   // Required
  private final String email;      // Required
  private final String phone;
  private final String address;

  private User(UserBuilder builder) {
    this.firstName = builder.firstName;
    this.lastName = builder.lastName;
    this.email = builder.email;
    this.phone = builder.phone;
    this.address = builder.address;
  }

  public static class UserBuilder {
    private final String firstName;
    private final String lastName;
    private final String email;
    private String phone;
    private String address;

    public UserBuilder(String firstName, String lastName, String email) {
            this.firstName = firstName;
            this.lastName = lastName;
            this.email = email;
        }

        public UserBuilder phone(String phone) {
          this.phone = phone;
          return this;
        }

        public UserBuilder address(String address) {
            this.address = address;
            return this;
        }

        public User build() {
          return new User(this);
        }
  }

  @Override
  public String toString() {
        return "User: " + firstName + " " + lastName + " (" + email + ")";
    }
}

// Service
User user = new User.UserBuilder("Fedora", "Immigrant", "fedora@example.com")
                    .phone("123-456-7890")
                    .address("Los Angeles, CA")
                    .build();
```

In Spring project, just use `@Builder` in the Lombok library

## 11. Explain the API gateway design pattern

It introduces a single entry point sitting between the client and the internal microservices.

It acts as a reverse proxy, routing requests, aggregating results, and handling cross-cutting concerns.

## 12. Explain the circuit breaker design pattern

It prevents cascading failure by tripping the connection to a failing service, allowing the system to failing fast and recover gracefully. 3 states:

- closed (normal): requests flow through to the backend service. The breaker counts the number of failures.
- open (tripped): if the failure rate crosses a threshold (e.g. 50%), the breaker trips and enters the open state. For a set period, all requests fail immediately without hitting the backend.
  - fallback mechanism: when the breaker is open, you can return
    - cached data: “Here is the last known location of your package”
    - default values: “shipping cost is currently unavailable”
    - a simplified service: directing the user to a static page
- half-open (testing): after a timeout, the breaker allows a small number of test requests through. If they succeed, return to closed. If they fail, return to open.

```java
@Service
public class ShippingService {

    @CircuitBreaker(name = "shippingService", fallbackMethod = "fallbackShipping")
    public String getShippingStatus(String id) {
        // Call to an external gRPC or REST service
        return restTemplate.getForObject("/api/external-shipping/" + id, String.class);
    }

    // This runs when the breaker is OPEN or the call fails
    public String fallbackShipping(String id, Throwable t) {
        return "Shipping information is currently offline. Please try again in 5 minutes.";
    }
}
```

## 13. Explain proxy design pattern

It provides a surrogate for another object to control access to it.

The proxy and the real subject both implements the same interface.

- Subject (interface): defines the common operations
- Real Subject: the actual object that performs the business logic
- Proxy: maintains a reference to the Real Subject and controls the access to it

Proxy in Spring:

- `@Transactional`: Spring creates a proxy that opens a db connection, starts a transaction, calls the method, and then commits or rolls back.
- AOP: Spring uses JDK Dynamic Proxies or CGLIB to inject cross-cutting concerns into the beans.

## 14. Explain Observer design pattern

It's a behavioral pattern used to define a one-to-many dependency between objects.

How it works:

- Subject: maintains a list of observers and provides methods to attach, detach, and notify them.
- Observer: defines an interface for objects that should be notified of changes.
- Concrete Observers: implement the update logic.

How to use in Spring:

- event (message): any standard Java object (POJO)
- publisher: inject an `ApplicationServicePublisher` in the service layer
- listener: add `@EventListener` to a method inside a bean, and also add `@Async` to make it non-blocking (`@EnableAsync` to main function)

## 15. Explain Chain of Responsibility design pattern

It's a behavioral design pattern that allows you to pass requests along a chain of handlers. Upon receiving a request, each handler decides either to process the request or to pass it to the next handler in the chain.

Example:

- `SecurityFilterChain`: a chain of responsibility that checks for CSRF, JWT, and session cookies
- try-catch-finally
