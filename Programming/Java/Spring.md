---
type: Note
---
# Spring

### 1. Difference between Spring framework and Spring Boot

Spring is an ecosystem designed to manage DI and Inversion of Control (IoC). Spring Boot is a tool built on top of Spring.

- Spring Boot has auto-configuration
- Spring Boot has starter dependencies (a group of dependencies convenient for dev, e.g. `-web`, `-test`, `-aop`, `-data-jpa`)
- Spring Boot has embedded web servers, e.g. Tomcat, Jetty
- Spring Boot includes `Actuator` for monitoring health and metrics

### 2. What is dependency injection? Why do we need DI? How does Spring IoC Container work?

DI: a class doesn't create the objects it needs. The objects are injected into it by an external entity.

Why need DI:

- loose coupling: Separates the creation of an object from its usage. You don't need to rewrite every service that uses this dependency.
- easier testing: You can inject a mock db into the service to test logic.
- maintainability: You don't need to manually passing pbjects, the Container handles the wiring.

Spring IoC (Inversion of Control) is a design principle where the framework manages the creation and lifecycle of Beans.\
\
DI is the implementation of Spring IoC.

Spring IoC Container: where we handle Bean creation, DI, and lifecycle management, allowing devs to focus on business logic.

- read metadata: Spring looks at annotations like `@Component`, `@Service`, `@Configuration`, etc. 
- create Beans: the container creates instances of these classes
- dependency injection: Spring looks at the constructor or fields marked with `@Autowired`, finds the required Bean in its pool and injects it
- lifecycle management: Spring manages the Beans from creation until the app shuts down

### 3. How to inject Beans in Spring? 

- use `@Autowired` annotation to automatically inject a required dependency (bean) into a class
- can be used to fields, setters, and constructors. if a class has only one constructor, Spring will inject dependencies automatically without this annotation
  - differences between setter and constructor injection
    - required upon creation?
      - for constructor, dependencies are required upon creation of targets
      - for setters, no, Spring can first create the object using the no-arg constructor
    - immutability?
      - for constructor, no, once the constructor runs, the dependencies cannot be changed
      - for setters, yes, because setters are public methods
    - what if lots of beans needed for one component?
      - for constructor, it leads to constructor bloat, the class is doing too much and should be broken down into smaller services
      - for setters, you just add more setter methods
    - how it reacts to circular dependency?
      - for constructor, it fails immediately, throws a `BeanCurrentlyInCreationException`
      - for setters, Spring often resolves it by creating hollow objects and then wiring them
  - how to make setter injection mandatory
    - `@PostConstruct`: a `validate()` method runs after all injections are finished, if the dependency is still null, throw an exception manually  
    - `@Autowired(required = true)` 
    - `@Required (legacy)`

### 4. How to configure/create Beans in Spring?

- how to create
  - use `@Component` to mark a class 
    - IoC container will create a bean of that class with the lowercase camel bean id 
  - use `@Bean` to declare a method that returns a bean, inside a class marked with `@Configuration`
    - Spring executes the method, takes the returned object and registers it as a bean
    - the method name becomes the bean id by default
- how to configure
  - use a `beans.xml` (legacy way)
  - use `@Configuration` on a class to tell Spring this class contains explicit bean definition and configuration logic 

### 5. Difference between `BeanFactory` and `ApplicationContext`?

`BeanFactory` is the root interface of Spring IoC Container, provides the basic functionality for DI and managing Beans.

`ApplicationContext` extends `BeanFactory` and is the standard container used in Spring apps.

- eagerly loaded by default (loaded on start-up)
- easier integration with Spring's addtional features
- includes application-layer specific contexts such as `WebApplicationContext`

### 6. Describe Bean scopes supported by Spring

#### a.​ Singleton vs Prototype

| Feature        | Singleton                              | Prototype                                             |
| -------------- | -------------------------------------- | ----------------------------------------------------- |
| instance count | exactly one per IoC Container          | new instance every time it's requested                |
| lifecycle      | managed by Spring from start to finish | Spring initializes it, but doesn't manage destruction |
| performance    | high (cached, reused)                  | low (overhead of creating new objects)                |
| use case       | stateless services, repositories       | stateful objects, user-specific data                  |

Other scopes (only valid in a web-aware Spring `ApplicationContext`):

- request: one for a single HTTP request
- session: one for a single HTTP session
- application: one for a `ServletContext`
- websocket: one for a `WebSocket`

#### b.​ Is singleton bean thread safe?

No, it's shared across every thread in the app. If this bean has mutable fields, it's not thread-safe.

#### c.​ What’s the default bean scope?

Singleton

#### d.​ How to define the scope of a spring bean?

- annotation: `@Scope("prototype")` 
- Java configuration under `@Bean`: `@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)`

### 7. Given a Singleton Bean A and a Prototype Bean B, how do we inject A into B? What will be the behaviors of the Beans?

It's straightforward, every time B is requested, Spring creates it and injects the shared A into it.

You get many B objects, all pointing to the same A.

Use case: A `PaymentTask` (prototype) needs a `DatabaseService` (singleton).

### 8. Given a Singleton Bean A and a Prototype Bean B, how do we inject B into A? What will be the behaviors of the Beans?

Spring sees A needs B, creates one instance of B and injects into A. A uses that instance of B forever.

B behaves like a singleton because it's stuck inside A.

Use case (wrong): A `SessionData` (prototype) injected into a `UserDashboard` (singleton). Every user will end up seeing the same session data.

Solutions:

- create an abstract `getPrototype()` method in the Singleton class and annotated with `@Lookup`. Spring will override this method to return a new instance of Prototype bean from the container every time it's called. 
- instead of injecting the bean itself, inject a factory `ObjectProvider<Prototype>`
- configure the Prototype bean to use a proxy. When the Singleton calls a method on the proxy, the proxy reaches out to the Spring container to find or create the correct instance.

### 9. What’s your understanding on `@Autowired`? How does Spring know which bean to inject? What’s the usage of `@Qualifier`? `@Primary`? 

How Spring resolves `@Autowired`: 

- by type: Spring looks for a bean that matches the class or interface type of the field
- by Qualifier: if multiple beans of the type exists, Spring looks for a `@Qualifier` on the field to see if you specified a name 
- by name: if there's no `@Qualifier`, Spring tries to match the variable name with bean id 

For example, you may have a `PaymentService` interface with 2 implementations `StripeService` and `PaypalService`. If you autowired `PaymentService`, Spring will crash because it doesn't know which one to pick. Solution:

- use `@Primary` on the bean class to annotate the default choice 
- use `@Qualifier("paypalService")` at the injection point to explicitly point the bean you want. This overrides `@Primary`. 

### 10. ​ What is circular dependency?

2 or more beans dependent on each other and form a circle.

How to prevent:

- change design
- use setter injection
- mark a dependency with `@Lazy` in the constructor, so that Spring injects a proxy object

### 11. ​ What is the usage of `@SpringBootApplication`? 

It's the meta annotation that combines 3 annotations:

- `@EnableAutoConfiguration`: scans your classpath for candidate configuration classes and activates them
- `@Configuration`: allows the application class or other classes to define beans using `@Bean`
- `@ComponentScan`: scans the current package and its subpackages for your classes with other Spring annotations

Why use it:

- zero XML to wire your app
- less boilerplate
- fail-fast startup: by triggering component scanning and auto-config at the start, it ensures the application context is healthy before you process any requests

### 12. ​ What's the difference between `@Component`, `@Repository` & `@Service` annotations in Spring? Can `@Component`, `@Repository` and `@Service` annotations be used interchangeably in Spring or do they provide any particular functionality besides acting as a notation device? 

They all mark the class as a bean so that Spring IoC Container can manage them

`@Component` is generic and used for utility classes, validators, etc.

`@Service` tells others that this class handles business logic and coordinates transactions.

`@Repository` catches platform-specific exceptions (like `SQLException`) and rethrows them as Spring's unchecked `DataAccessException`.

They can be used interchangeably but not recommended. If marked with `@Component`, Spring AOP will ignore this class.

### 13. How can you handle transactions in spring boot

Place a `@Transactional` on a service method. Spring creates a proxy around the bean.

- before the method starts: the proxy opens a db connection and starts the transaction
- during the method: the business logic runs
- if the method finishes successfully: the proxy commits the transaction
- if a `RuntimeException` occurs: the proxy automatically triggers a rollback

### 14. ​ Describe Spring MVC

Spring MVC is an architecture / software design pattern that separates business logic, presentation, and data

- Model: manages data and business logic
- View: presentation / UI
- Controller: request handlers

Spring MVC workflow:

- client sends request to `DispatcherServlet`
- `DispatcherServlet` consults `HandleMapping` 
- `HandleMapping` looks at the URL, finds the corresponding Controller and the method to execute
- `DispatcherServlet` sends request to the Controller and invokes the method
- Controller packages the data into a Model and returns the logical view name (or a `MappingJacksonValue` object) as a string
- `DispatcherServlet` takes the returned data and uses Jackson (message converter) to transform Model into a JSON string, Jackson will apply `JsonView` rules to do RBAC
- JSON data sent back to the client

`DispatcherServlet` is the core component of Spring MVC, automatically configured by SpringBoot

- handle all incoming HTTP requests
- Model-View-Controller interaction
- map an HTTP request to a controller method by URL + type (e.g. URL is “/login”, type is POST)
- parse HTTP request data and headers into Data Transfer Objects (DTO) or domain objects
- handle `ModelAndView` objects returned by controller
- ask View to render the HTML page
- generate HTTP responses with the HTML page

### 15. ​What is `ViewResolver` in Spring?

It's the component responsible for translating the logical view name (returned by a Controller) into an actual view resource (e.g. a JSX, Thymeleaf file) that can be rendered to the user.

### 16. ​Difference between `@Controller` and `@RestController`  

`@Controller` is a traditional web controller that returns HTML View, typically used for MVC-based web apps. 

`@RestController` is designed for building RESTful web services that returns data (JSON/XML). It's a combination of `@Controller` and `@ResponseBody`.

### 17. ​What is RestTemplate?

Old, deprecated, used in microservices.

It's a synchronous client used to make HTTP requests. It handles the boilerplate code for:

- opening and closing HTTP connections
- message conversion: automatically converting Java objects to JSON for the request body
- response mapping: automatically converting the JSON response back to Java objects or a `ResponseEntity`

### 18. ​`@RequestBody` vs. `@ResponseBody` 

- `@RequestBody`: have the request body read and deserialized into an Object
- `@RequestHeader`: bind a request header to a method argument in a Controller

### 19. ​`@PathVariable` vs. `@RequestParam` 

- both are used to pass parameter through the request
  - `@PathVariable`: for sending must-have data, URI variables like `…/student/45`, automatically converted to the appropriate type, or `TypeMismatchException` is raised
  - `@RequestParam`: for sending optional data, key-value pairs, like `…/student?id=45`

### 20. How do you use Spring Data Repository? (pagination -> `Slice` and `Page`)

To enable pagination, the repository interface should extends `JpaRepository` or `PagingAndSortingRepository`, and add a `Pageable` parameter to the query methods.

`Page` vs `Slice`

- `Page` (specific page number)
  - executes a second query to count the total number of records
  - metadata: it provides `getTotalPages()` and `getTotalElements()`
  - cost: the `COUNT` query can be very expensive on large tables
- `Slice` (load more)
  - it simply fetches `limit + 1` rows to check if a next page exists
  - metadata: it only provides `hasNext()` and `hasPrevious()`
  - much faster for large dataset

### 21. What are different kinds of http methods? Difference between POST vs PUT vs PATCH

GET, POST, PUT, PATCH, DELETE

POST: used to create a new child resource

PUT: used to update a resource by replacing the entire thing, idempotent

PATCH: only updates the fields you provide

### 22. Difference between SOAP vs. REST

SOAP is a strict, XML-based protocol, defines how a message should be structured, including headers, bodies, and error handling. It relies on a WSDL (web service descriptive language) file as a formal contract between client and server. It's for stateful operations.

REST is not a protocol, but a set of principles. It's resource-based, meaning every URL represents an object. It's flexible, can use JSON, XML, or even plain text. It's stateless by design.

### 23. ​Is REST stateless?

Yes. The server doesn't store any session info about the client between requests.

### 24. ​ Describe the RESTful principles.

- client and server (data storage) are separate
- statelessness (make scaling easier)
- cacheablility: improve performance by allowing clients or proxies (e.g. a CDN) to reuse response data for identical requests
- uniform interface
  - resource identification: everything is a resource with a unique URL
  - manipulation through representation: if a client has a representation of a resource (JSON), it has enough info to modify or delete it
  - self-descriptive messages: each message includes enough info on how to process it, e.g. `Content-Type: application/json`
- layered system: a client cannot tell whether it is connected directly to the end server or an intermediary (a load balancer or a proxy)
- code on demand: servers can temporarily extend the functionality of a client by transferring executable code (like JavaScript)

### 25. How to validate the values of a request body? How does `BindingResult` work?

How to validate:

- add constraints to fields in DTO, e.g. `@NotNull(message = “Name cannot be null”)`, `@Size(min = 2, max = 50)` 
- use `@Valid` in Controller, before the `@RequestBody` parameter 

How `BindingResult` works:

- the `BindingResult` parameter must immediately follow the validated object in the method signature.
- call `bindingResult.hasErrors()` to see if any constraints were violated.

### 26. ​How to maintain user logged in using REST service

use authentication token like JWT

- the user sends credentials to the `/login` endpoint
- the server validates the credentials and signs a JSON Web Token (JWT), containing user claims (e.g. id and role) signed with a secret key
- the client receives the JWT and stores it in local storage or a secure cookie
- for every new request, the client sends the token in the Authorization header
- the server checks the signature, if valid, the user is logged in for that request

### 27. ​What is Spring AOP?

It's a programming paradigm that allows you to modularize cross-cutting concerns (tasks that affect multiple parts of the app but aren't core to the business logic)

AOP Concepts:

- Aspect: a modularization of a concern that cuts across multiple classes
- Join point: any point during the execution of a program
- Advice: action taken by an aspect at a particular join point
  - around
  - before
  - after
- Pointcut: a predicate (expression) used to locate the join point where the advice is injected
- Target object: an object being advised by one or more aspects
- AOP proxy: an object created by the AOP framework in order to implement the aspect contracts

Types of Advice

- `Before`: runs before the target method starts
- `After`: runs after the method finishes
- `AfterReturning`: runs only if the method completes successfully
- `AfterThrowing`: runs only if the method throws an exception
- `Around`: wraps the method call, can decide whether to run the method and can modify the return value

AOP Advice example:
```java
@Aspect
@Component
@Slf4j
public class ExceptionLoggingAspect {
    // This catches any exception thrown from the service package
    @AfterThrowing(pointcut = "execution(* com.example.hrportal.service.*.*(..))", throwing = "ex")
    public void logServiceException(JoinPoint joinPoint, Exception ex) {
        String methodName = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();
        
        log.error("EXCEPTION in Service Method: {} | Arguments: {} | Message: {}", 
                  methodName, Arrays.toString(args), ex.getMessage());
    }
}
```

How to handle exceptions in a Spring app:
- Apply `@RestControllerAdvice` to the `GlobalExceptionHandler` class. It acts as an interceptor that catches exceptions thrown by any controller in the app.
- Use Spring AOP to intercept the exceptions at the service layer before they reach the controller.
  - log the stack trace and input parameters for dev
  - track performance, see which service fails most often
  - trigger a Slack notif when a critical service fails

### 28. Talk about Spring Security

a.​ Authentication: uses `AuthenticationManager` to verify a user's identity

b.​ Authorization: uses `AccessDecisionManager` to check if the authority matches

c.​ CSRF protection: generates a random, unique CSRF token for every session. Fot any state-changing request, the client must include this token. The server compares the token in the request with the token in the session.

### 29. ​ How is JWT used with Spring Security? (JWT workflow in your app)

JWT is an open standard that defines a compact and self-contained way for securely transmitting info as a JSON object.\
\
It allows the API to be **stateless**. With traditional sessions, the server must store the user data in memory (RAM), making it difficult to scale. With JWT, the session lives in the client side, making the backend horizontally scalable.

JWT uses base64, has 3 parts:

- header: plain text, defines the hashing algorithm and the token type (JWT)
- payload: plain text, contains user claims
  - subject (sub): usually the user's email or unique id
  - issued at (iat): the timestamp the token was created
  - expiration (exp): the timestamp when the token becomes invalid
  - custom claims: extra data, e.g. `role: "ADMIN"`, `dept: "Engineering"`
- signature: hashcode, hashing header + payload with a secret key (stored in `application.yml`)

Then the 3 parts will be concatenated and encoded to be a JWT.

```java
// JWT generated in JwtService
public String generateToken(UserDetails userDetails) {
    return Jwts.builder()
            .setSubject(userDetails.getUsername()) // Sets the "sub" claim
            .setIssuedAt(new Date(System.currentTimeMillis()))
            .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 10)) // 10 hour expiration
            .signWith(getSignInKey(), SignatureAlgorithm.HS256) // Sign with your secret key
            .compact(); // Turn it into the final aaaaa.bbbbb.ccccc string
}
```

When a hacker intercepts the JWT, they can decode it to see the header and payload, and modify them.

Thus when the backend receives the JWT, it will hash the header + payload again and compare the computed hashcode with the signature to validate the JWT.

Authentication (login):

- request: the `AuthRestController` extracts the credentials (plain text, only safe when using HTTPS because TLS encryption protects the data) from the request and creates an `Authentication` object
- verification: the `AuthenticationManager` gives the `UsernamePasswordAuthenticationToken` to provider, then the `AuthenticationProvider` calls `UserDetailsService` to fetch the user credentials from db and verifies the pwd hash using `PasswordEncoder`
- token creation: upon success, a `JwtService` generates a token containing Claims (id, role, and expiration time)
- response: server returns the JWT token to client. In authentication, when the `DispatcherServlet` receives a request for `/auth/login`, it actually goes through the filter chain before the `AuthRestCnotroller`, but the `JwtFilter` ignores it because in `SecurityConfig`, there is `.requestMatchers("/auth").permitAll()`.

Authorization (subsequent requests):

- interception: the request hits the Spring Security Filter Chain, a `JwtFilter` intercepts it before it reaches the controller
- extraction: the filter looks for Authorization header and extract the String after `Bearer `
- validation: the filter calls `JwtService` to check if the signature is valid, if the token has expired, and extract the username/roles from the payload
- security context: if valid, the filter creates a `UsernamePasswordAuthenticationToken` and puts it into the `SecurityContextHolder`
- execution: Spring Security now sees the user is authenticated for this thread and allows the request to proceed to `@RestController`

| Feature  | Authentication                 | Authorization                                             |
| -------- | ------------------------------ | --------------------------------------------------------- |
| Question | Who are you?                   | What are you allowed to do?                               |
| Timing   | happens once (usually login)   | happens every request                                     |
| Artifact | produces a JWT                 | validates a JWT and checks permissions                    |
| Example  | entering username and password | checking if a user has `ROLE_ADMIN` to delete an employee |

How to handle logout:

- frontend (soft): delete JWT from the client's storage (localStorage, sessionStorage, cookies)
- backend (hard):
  - user hits the endpoint `/logout`
  - `JwtFilter` extracts JWT from the header
  - backend (a specified `LogoutController` or a Spring Security `LogoutHandler`) blacklists the JWT into Redis as a key `blacklist: token_string`
  - add a check in the `JwtFilter`

```java
// Inside JwtFilter
if (redisService.isBlacklisted(jwt)) {
    filterChain.doFilter(request, response);
    return; // Reject the request even if the signature is valid
}
```

To minimize the need of a massive blacklist, developers use a short-lived access token (e.g. 15 min) and long-lived refresh token (e.g. 7 days), so the app only blacklists or revokes the refresh token when user logs out.\
\
This slightly changes the request validation workflow:

- the client sends a request with access token, and `JwtFilter` validates it as usual
- when the access token is expired, the server returns a `401 Unauthroized`
- the client intercepts the 401 error and automatically hits a `/refresh` endpoint, sending a refresh token to server
- the server checks if the refresh token is still valid, if valid, generates a new access token and sends it back
- the client retries the original request with the new access token
- if the refresh token also expires, the server returns a `401 Unauthroized` or `403 Forbidden` with a specific error code like `REFRESH_TOKEN_EXPIRED`
- the client then clears all local storage and force-refirects the user to login page

| Feature | Access Token | Refresh Token | 
| --- | --- | --- | 
| Lifespan | very short | long | 
| Usage | included in every API request header | only used to get a new access token | 
| Storage | memory or secure cookie | secure, HttpOnly cookie (ideally) |

### 30. ​ What is unit testing vs integration testing?

Unit Testing tests individual unit of component, usually a single method or class, tools: JUnit and Mockito.

Integration Testing verifies that different modules or services work together correctly, tools: Spring Boot Test, Cucumber.

### 31. ​ What do you use for testing? (Mockito)

For unit testing, I use JUnit and Mockito. Mockito is a mocking framework used to create fake versions of dependencies.

- mocking: it creates a proxy object of a class
- stubbing: it tells the mock how to behave when a specific method is called
- verification: checks if the code under test actually interacted with the dependency

```java
UserRepository mockRepo = mock(UserRepository.class);
when(mockRepo.findById(1)).thenReturn(new User("fedora"));
verify(mockRepo, times(1)).save(any());
```

### 32. ​Describe some common annotations of Mockito. (`@Mock`, `@InjectedMocks`, `@Spy`) 

To use these annotations, you must use `@ExtendWith(MockitoExtension.class)` at the class level or call `MockitoAnnotations.openMocks(this)` in the `@BeforeEach` method. 

- `@Mock` 
  - creates a complete mock of a class or interface
  - used for `Repository` or `ApiClient`
  - all methods of a mock return empty values by default, unless stubbed with `when().thenReturn()`
- `@Spy` 
  - a partial mock that wraps a real instance of an object
  - if you don't stub a method, it calls the real logic of the class. if you stub it with `doReturn()`, it returns your fake value
  - used when you want to test most of a class's real behavior but need to mock a specific slow or dangerous method
  - always use `doReturn().when(spy)` instead of `when(spy.method()).thenReturn()` to prevent the real method from executing during the setup phase
- `@InjectMocks` 
  - creates an instance of a class and automatically injects all the `@Mock` or `@Spy` fields into it 
  - applied to the Class Under Test (the service layer)
  - it tries to inject mocks via the constructor first, then setters, and finally fields

### 33. What’s the difference between `doReturn` and `thenReturn`?

Both are part of Fluent API

- `thenReturn`
  - `when(mock.method()).thenReturn(value);`
  - type-safe, compiler checks the return type
  - the real method is called once during the stubbing phase if you are using a Spy. This can be a major issue if the method has side effects (e.g. deleting a file or hitting the db).
- `doReturn`
  - `doReturn(value).when(mock).method();`
  - not type-safe, runtime check, throws `ClassCastException`
  - the real method is never called, it simply maps the return value to the mock metadata

### 34. What are some tools that can be used to view test code coverage?

I use IntelliJ built-in tools, right click a test folder and select `run all tests with coverage`.

We can also use Jacoco, which generates HTML, XML, CSV reports. The HTML report is interactive, allowing you to drill down into specific packages and classes to see exactly which lines are covered.

### 35. What annotation do you use to quickly switch between different environments to load different configurations?

Apply `@Profile` at the class or method level.

### 36. What is Jasypt?

Jasypt (Java Simplified Encryption): a high-security, standards-based encryption library
