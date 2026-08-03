# Microservices

## 1. Difference between Monolithic vs. Microservice, advantages and disadvantages

Monolith: all components (UI, business logic, db access) are bundled into a single codebase and deployed as one unit

- pros
  - simple deployment: just one file to move to the server
  - easier testing: end-to-end testing is easier as everything is in one place
  - performance: faster communication since calls happen in-memory
- cons
  - scaling issue: you must scale the entire app even if one module is slow
  - technical debt: overtime, the code is spaghetti
  - barrier to innovation: locked into one tech stack

Microservices: the app is broken into a collection of small, independent services that communicate over a network (using REST, gRPC, message brokers). Each service focuses on a single business.

- pros
  - independent scaling: only scale the services under heavy load
  - fault isolation: prevent cascading failure
  - technology diversity
- cons
  - operational complexity: need robust CI/CD
  - network latency
  - data consistency: managing transactions across multiple db is difficult (often requiring SAGA)

## 2. What is cascading failure? How to prevent this failure?

A fault in one service causes a chain reaction of failures in dependent services.

How to prevent:

- circuit breaker pattern: stops waiting and prevents thread exhaustion
- bulkhead pattern: assigns a thread pool for each downstream service
- timeout: never let a request waits indefinitely
- retry with exponential back-off: if a service fails, do not immediately hit it again
- load shedding & throttling: when a service is overwhelmed, it starts rejecting low-priority requests

In Spring apps, use Resilience4j to combine these patterns.

```java
@CircuitBreaker(name = "shippingService", fallbackMethod = "localFallback")
@Bulkhead(name = "shippingService")
@Retry(name = "shippingService")
public Shipment getStatus(String id) {
    return shippingClient.call(id);
}
```

## 3. What is fault tolerance? How to make your microservice fault tolerance?

It's the ability of a system to continue operating even when one or more of its components fail.

Key concepts:

- resilience: recover from a failure and return to a functional state
- self-healing: automatically detect and fix a failure
- graceful degradation: provide a fallback or limited functionality instead of a total crash

## 4. How do microservices communicate?

2 styles

- sync: request-response, REST or gRPC, HTTP calls using RestTemplate (deprecated), HttpClient, Feign Client, etc.
- async: event-driven, message broker, using RabbitMQ, Kafka, etc.

## 5. What is Swagger?

It's an open source tool built around the OpenAPI specs that helps developers build RESTful apps.

Core components:

- Swagger UI: turns OpenAPI to an interactive webpage, allows anyone to interact with the API
- Swagger editor: a browser-based editor where you can write and edit API specs in YAML or JSON and see the doc render in real-time
- Swagger codegen: a tool that takes your API specs and automatically generate client SDKs

How it works in Spring:

- Swagger scans `@RestController` classes and DTOs
- you add `@Tag` to group endpoints or `@Operation` to describe what a method does
- when you run the app and visit `/swagger-ui.html`, you see a dashboard

## 6. How do you monitor your application?

Track health, performance, and behavior across a distributed network.

- metrics (what): Spring Actuator provides built-in endpoints like `/health` and `/metrics` that expose the internal state of the app.
- logging (why):  ELK (Elasticsearch, Logstash, Kibana) gather all discrete events together. We can also use AWS CloudWatch to log the event details.
- tracing (where): Spring Cloud Sleuth assigns a unique trace ID to a request when it enters the API gateway, and it will be passed along headers to every downstream service, collected and visualized by Zipkin

## 7. Why do we need a gateway? Is a gateway necessary?

An API gateway acts as a single entry point for all client requests.

- **centralized security:** do not need to implement authentication and authorization in every service
- **request routing and aggregation:** a client might need data from 3 different services to do a single thing (e.g. present an order details page), and the gateway can either route it or aggregate data from 3 different services and return a single JSON response
- **protocol translation:** the internal services might communicate using gRPC, but the web browser doesn't support gRPC. The gateway can take a REST/HTTP request from the browser and translate it into a gRPC call.

Key responsibilities:

- **rate limiting:** prevent a malicious user from overwhelming the system
- **load balancing:** distribute incoming traffic across multiple instances of a service
- **logging and metrics:** tracking how many people are using the APIs and the respond latency
- **SSL termination:** handle HTTPS encryption so the internal services can communicate over HTTP

It's not strictly necessary for few services but is recommended.

## 8. How many environments can your application have?

4-6 environments

Core:

- local: your personal machine, where you write code and run unit tests
- dev: a shared cloud environment where multiple developers merge their code and different microservices are integrated together
- pre-prod (staging): a mirror image of the production environment with the same config, similar data, and same infra.
- prod: the live environment where real users interact with your app

Specialized:

- QA / testing: quality assurance space to run regression tests without being interrupted by unstable code
- load testing, user acceptance, etc.

## 9. How did you deploy your application?

CI/CD pipeline

- local: IntelliJ and GitHub
- CI/CD orchestration: Jenkins (`Jenkinsfile`) or GitHub Actions (`.github/workflows/`)
- containerization: builds a Docker image of your service, Docker Hub or AWS ECR
- orchestration: deploy to the cloud
  - AWS EC2: manually install Docker on a virtual machine and run your containers, simple
  - AWS EKR: manage Kubernetes, AWS handles the master node, you handle the worker nodes

## 10. Usage of Jenkins. (Keyword: CI/CD)

Jenkins automates the transition from your code from local to prod environments.

It handles 2 critical phases of software lifecycle:

- continuous integration (CI): every time you git push, Jenkins automatically triggers a build. It compiles your code and runs your unit and integration tests
- continuous deployment (CD): once the tests pass, Jenkins packages your app into a Docker image, pushes it into a registry like Docker Hub or AWS ECR, and then executes commands to update your Kubernetes cluster

## 11. How to debug your microservice?

- gather info: look at the logs of Spring Actuator to check the metrics, identify the trace and determine the scope
- check logs: once you have the trace ID, go to the centralized logging system like Kibana (ELK) to see the details, review metadata and look at the exceptions
- analyze: determine if the service is failing due to its own fault or because a downstream service
- reproduce issue: use Postman to hit the specific service endpoint with the problematic payload. If the issue is related to a timeout, use Resilience4j to manually inject latency into the dev environment and confirms the system behaves exactly as observed in prod

## 12. How do you implement async in web applications?

- mark a method with `@Async` in Spring Boot app. When this method is called, Spring runs that method in a separate thread pool
- use message queues like RabbitMQ or Kafka. This decouples services, service A doesn't need to know about if service B is online, they only need to agree on the message format.

## 13. What is RabbitMQ and what can it help us to achieve in a web application?

RabbitMQ is a message broker that acts as a middleware accepts, stores, and forwards digital messages between different services in the app.

It can achieve:

- async processing: instead of waiting for a long time to finish a slow task, the web server sends a task to RabbitMQ and tells the user “we're working on it”.
- decoupling services: the upstream service doesn't need to know info about the downstream service, it just drops a message into RabbitMQ. Good for maintainability.
- scalability: the app might have spiky requests, and you can spin up multiple worker services to process messages in the RabbitMQ queues, preventing db from overwhelmed.
- fault tolerance: if a service crashes while processing a message, RabbitMQ can detect the failure and put the message back in the queue to be tried again

## 14. What are the components of RabbitMQ? Describe the role of each component.

- producer: the Spring Boot backend, creates a message and sends it to an exchange
- exchange: the routing gateway that looks at the message's routing key and decides which queue it should go to
- bindings: the rules that link exchanges to queues
- queue: the buffer that stores messages until a consumer is ready
- consumer: a background service (worker) that is listening to the queue to pull the message and process it, and sends an ACK back to RabbitMQ

## 15. What are different types of exchanges that exist in RabbitMQ? Explain each exchange.

- direct: add if routing key is equal to binding key
- fanout: add anyways, and use round-robin strategy to distribute message across the consumers
- topic: add if routing key matches a certain pattern
- header: route messages based on keys present in the header, possible to bind a queue to multiple headers

## 16. What is a dead letter exchange (DLX)?

It's a solution to messages rejection or expiration:

- when a message is rejected, expires, or the queue has reached maximum length, a message can be sent to a DLX to prevent it from blocking or being redelivered endlessly
- the message is then routed to a Dead Letter Queue (DLQ), can config DLQ for different types of failed messages
- can inspect the messages in DLQ (format issue, consumer logic, etc.) to identify and fix the issue, and republish it back to the normal queue for reprocessing

## 17. How to secure your endpoint? (In other words, How can you check if a HTTP call is valid in microservices?)

- API gateway (centralized security)
  - the gateway checks if the request has a valid JWT. If the token is missing or expired, the request is rejected before it reaches internal services.
  - once the token is verified, it extracts the user info (id, roles, etc.) and injects them into the HTTP headers, then forwards the request to the internal services so they know which user is making the call.
- RBAC
  - the JWT contains claims (e.g. `user_role: “ADMIN”`), use Spring Security annotations to check roles inside Spring Boot service

```java
// Only users with the 'MANAGER' role can access this specific endpoint
@PreAuthorize("hasRole('MANAGER')")
@PutMapping("/shipment/{id}/approve")
public ResponseEntity<?> approveShipment(@PathVariable String id) {
    return shipmentService.approve(id);
}
```

- Validate payload
  - use annotations like `@NotNull`, `@Size`, `@Min` in DTOs to ensure the data format is correct
  - use the gateway to limit how many calls a user can make, preventing DDoS attacks
  - CORS (cross-origin resource sharing): ensure the backend only accepts requests from the specific frontend domain

## 18. Where do you store your configuration file when you use microservices?

- create a centralized config server, sync the updated config in Git, use `@RefreshScope` to pick up new settings without restarting
- in Kubernetes, use ConfigMaps for non-sensitive data, Secrets for sensitive data. Kubernetes injects these these values into the container as either env or mounted volumes at runtime
- store dynamic credentials (e.g. a db password that expires every 24 hours) in HashiCorp Vault

## 19. How did you do user authorization in microservices

- `AuthService` issues JWT with roles and permissions embedded as claims
- API gateway validates the token signature and performs path filtering
- microservice decodes JWT and applys `@PreAuthorize` for specific methods in controller
- db filters data so user can only see records linked to their `user_id`

## 20. Vertical Scaling and Horizontal scaling in your application

- vertical: add more CPU, RAM, Disk to an existing server or db instance, e.g. upgrading AWS `t3.medium` to `r5.xlarge`
  - pros
    - simplicity: no changes to your app is required
    - lower latency: no network overhead between components
  - cons
    - hardware limit
    - downtime: upgrading often leads to a temporary outage
    - no fault tolerance: if the server crashes, the whole app goes down
- horizontal: add more machines (instances) to pool of resources, e.g. running 10 small instances of the `ShipmentService` behind an AWS load balancer
  - pros
    - high availability
  - cons
    - complexity: you need a load balancer and a service discovery
    - consistency: it becomes harder to keep data synchronized across multiple nodes

## 21. Tell me about your experience with Cloud Service. Ex. AWS, GCP, Azure

- IAM (RBAC):
  - I don't give the entire EC2 node permission to S3, I create a specific IAM role for the `ShipmentService`.
  - I write JSON policies to specify the permission.
  - For team collaboration, I organize users into groups and attach policies to groups.
-RDS:
  - I use it for relational database, with MySQL or PostgreSQL.
  - For production, I enable Multi-AZ. AWS automatically maintains a sync standby replica in a different availability zone.
  - I offload Read traffic to a Read replica, keeping the primary db free to Write operations.
  - I configure a 7-day retention period for Point-In-Time recovery.
- S3:
  - I use it for static data backup.
  - All my buckets have Block Public Access enabled by default. I use bucket policies to allow only my IAM roles or CloudFront distributions to read the data.
  - I set storage classes for cost optimization. For logs that might be accessed frequently now but rarely in 2 months, it automatically moves data to cheaper tiers to save money.
  - I enable versioning on critical buckets, so that I can easily roll back to the previous version if an object is accidentally deleted or overwritten.

IaaS (Infra as a Service):

- virtual machines
- EC2
PaaS (Platform as a Service):
- Lambda
SaaS (Software as a Service):
- RDS
- DynamoDB

3-tier architecture:

- web server
- app server
- db server

VPC (Virtual Private Cloud): a virtual network dedicated to an AWS account in one region

S3 (Simple Storage Service) components:

- bucket (folder): created within an AWS region
  - blast radius of failure is within that region, will not affect data in other regions
  - need globally unique name
  - a bucket is an infinitely scalable system
- object (file)
  - key: unique identifier within the bucket, name of the object
  - value: data content made up of bytes
  - version ID (optional): object versioning can be enabled at bucket level. If enabled, every version of the object will be assigned a version ID.
  - metadata, e.g. last modified date

S3 security:

- new created buckets are private by default
- access control
  - bucket policy: resource-based IAM policy, only the owner can associate a policy with a bucket
  - access control list (ACL): grant r/w permissions for individual buckets and objects
- encryption
  - encryption in transit: encrypt data in transit between AWS services and the client using HTTPS
  - encryption at rest: encrypt when data is stored in db
    - S3-managed keys (SSE-S3): uniquely generated for each S3 object
    - SSE-KMS: offers an additional layer of control along with audit trail, showing when and by whom keys were used
    - SSE-C (customer provided keys): users manage their own encryption keys, S3 manages the encryption as it writes to disks and decryption as you access your objects

## 22. What is Kafka? What is Kafka Stream?

It's a distributed event streaming platform, allows you to publish, subscribe to, store, and process streams of records in real-time.

- log structure: every event is appended to a log. Events cannot be changed once written.
- persistence: unlike RabbitMQ, Kafka doesn't delete messages once they are read. It keeps them for a set period (usually 7 days), allows different services to replay the data.
- topics & partitions: data is organized into topics. A topic is splitted into partitions across different brokers.

### Kafka core components

- **producer**
- **consumer**
- **cluster:** a group of brokers working together as a single distributed system to provide horizontally scalable, fault-tolerant messaging
  - broker: a single server running Kafka, a core component that handles message storage (stores topic partitions as append-only log files on the disk), replication, and client requests (incl. producers write and consumers read)
    - partition: when a topic becomes larger and larger and cannot be stored in one machine, break a single topic log into multiple logs, each part is called a partition. Partitions can be stored in different places. Kafka can scale up to 2 million partitions.
    - replication: Kafka maintains multiple copies of each partition across brokers for fault tolerance. One replica is the leader, others are followers.
- **zookeeper (KRaft):** helps manage
  - store and sync cluster metadata
  - leader election for partitions
  - track broker health and availability
  - store metadata about topics, partitions, and consumer offsets
- **event**: the basic unit of data that flow through Kafka topics
  - structure
    - timestamp: when the event was created or received
    - value: the actual event content (bytes, JSON, protobuf, Avro, etc.), serialization handled by producers/consumers
    - key (optional): used for partitioning and event ordering within partition. Messages with the same key are in the same partition. If no key specified, messages will be distributed round-robin among the partitions.
    - offset: unique sequential ID assigned by Kafka within each partition
    - headers (optional): key-value metadata pairs
  - features
    - immutability
    - retention period: can define a TTL of messages

### Journey of a message in Kafka

- producer publishes a message to topic(s): producer decides which partition the message goes to, the decision happens on the client side before sending
- broker stores the message in a log and assigns each message an offset for replay. Multiple consumers can consume the same log sequence in different time.
- consumer subscribes to a topic and reads messages from one or more partitions. Consumers belong to a consumer group.
  - each partition is assigned to only one consumer in the group to ensure parallelism
  - if a consumer fails, another consumer in the group will take over
  - consumers track the offset of messages they have processed to avoid duplication

**Consumer group** is a set of consumers sharing the load of consuming messages from a topic, ensuring no duplication within the group.
One broker acts as the group coordinator, managing membership and triggering rebalances.
Different consumer groups (e.g. `BillingService` and `AnalyticsService`) can consume the same topic without affecting each other.

### How to ensure you consume all messages in Kafka without message loss

- enable ACK (ack=all): messages are committed only after replicated to all in-sync replicas
- use Durable Storage: Kafka persists messages on the disk, preventing loss due to broker failure
- commit offset manually: allow consumers to explicitly commit offsets after processing, `enable.auto.commit=false`
- store offsets in Kafka: ensure offset data is replicated for recovery, `offset.topic.replication.factor > 1`
- handle consumer failures with consumer group: Kafka rebalances partitions to ensure continuing consumption
- set proper retention policies: prevent premature message deletion before consumption

### Kafka Streams

Kafka Streams is a client library for building apps and microservices where the input and output data are stored in Kafka clusters. It allows you to perform complex processing on the data.

Capabilities:

- stateful processing: can remember things across events
- windowing: you can group events by time
- joins: you can join 2 different streams, e.g. join the Customer Info stream with the Live Order stream to create a Personalized Order stream
- transformations: you can map, filter, or aggregate data

Kafka is the storage and transportation layer, Kafka Streams is the brain that processes data.

### Kafka vs. RabbitMQ

- partitioned architecture: Kafka distributes messages across partitions, enabling parallel processing and horizontal scaling. RabbitMQ uses queues, which can be bottlenecks.
- consumer parallelism: Kafka consumers within a group can read from multiple partitions concurrently, improving throughput. RabbitMQ limits each message to one consumer at a time per queue.
- high throughput: Kafka handles millions of messages per second, optimized for event streaming, while RabbitMQ is designed for low-latency messaging.

## 23. What is ELK?

It's a stack consists of Elasticsearch, Logstash, and Kibana, allows you to take data from any source, in any format, and then search, analyze and visualize the data in real-time.

- Elasticsearch: a NoSQL db, acts as the storage and search engine. It's horizontally scalable and incredibly fast at full-text searches, e.g. search for an Order ID across millions of logs in ms.
- Logstash: a server-side data-processing pipeline, acts as ingestion engine. It collects data from different sources (like microservices), transforms it (e.g. parsing a raw string into structured JSON) and sends it to Elasticsearch.
- Kibana: a visualization tool, acts as user interface. It alllows you to create dashboards, line graphs, pie charts.

Why need them: without ELK, you have to manually SSH into 10 different Docker containers to find the logs. With ELK:

- centralization: all logs from every service are in one place.
- correlation: you can use a Trace ID to see the logs from the Gateway, and the following services all in one screen, ordered by time.
- monitoring: you can set up alerts: if Kibana sees the word “Critical” more than 5 times in a min, it can trigger a Slack notif.

## 24. Explain distributed database management (2-phase commit, SAGA)

Distributed transaction: a set of operations across multiple databases or services that must succeed or fail as a single unit.

2-phase commit: a widely used consensus pattern/protocol to implement distributed transaction management, simulating a transaction in monolithic app with a coordinator component

- prepare phase: the coordinator asks the participating nodes whether they are ready to commit
- commit phase: if all participating nodes are ready, the coordinator asks them to commit
- pros
  - strong consistency: never in partial state
  - atomicity: simplify logic by providing an all-or-nothing guarantee
- cons
  - single point of failure: if coordination fails after step 1, all participants stay blocked
  - tightly coupled and scalability bottleneck: all other services need to wait for the slowest services to finish their confirmation
  - no support for NoSQL: rely on ACID principles to work
  - operational risk: recovery from failed coordinator requires manual intervention
- when to use: low-latency, high-trust environment, where strong consistency is a must-have

SAGA design pattern: provide transaction management through a sequence of local transactions

- core properties
  - each service commits its own local transaction
  - no distributed lock
  - failures are handled by compensation
  - system is eventually consistent
- pros
  - scalability: no long-lived locks, services scale independently
  - resilience: if a service goes down, the message stays in queue until recovery
- cons
  - complexity: must write code for both forward and compensate logic
  - eventual consistency: users might see intermediate states

## 25. What is Event-Driven development?

It's a software design pattern where the flow of the program is determined by events (significant changes in states).

Core components:

- event producer: the service that detects a change and creates an event
- event (message): a small, immutable package of data (usually JSON or Protobuf)
- event channel (broker): the highway where events travel, e.g. RabbitMQ, Kafka
- event consumer: the service that subscribes to specific events and performs an action

Key characteristics:

- async communication: the producer doesn't wait for consumer to finish
- loose coupling: the producer has zero knowledge of consumer
- real-time responsiveness: the system reacts to events as they occur

## 26. How do you use SAGA to achieve transaction management in a distributed system?

- **orchestration-based:** a single orchestrator is responsible for managing the overall transaction status
  - need to define the appropriate compensating transactions to proceed with this pattern
  - framework: Eventuate Tram Saga
  - pros
    - explicit, readable business flow
    - observability: orchestrator knows current step, completed steps, pending compensation
  - cons
    - orchestrator is a central component, must be highly available
    - more coupling because orchestrator must know everything
  - use case: complex business workflow, strong observability
  - SAGA Execution Coordinator (SEC) is the central component, contains a SAGA log that captures the sequence of events of a distributed transaction
- **choreography-based:** each microservice that is part of the transaction publishes an event that is processed by the next microservice
  - need to decide whether a microservice needs to be part of SAGA
  - framework: Axon Saga
  - pros:
    - no central control: services are fully independent
    - naturally fit for Kafka
  - cons
    - business flow spread across services, harder to reconstruct, debug and trace
    - logic is fragmented for both forward and compensation flow
  - use case: fewer services, simple flow, loose coupling > clarity

## 27. Explain the components needed when designing a Microservices application.

- client: frontend, only knows one address
- API gateway: handles routing, protocol translation (REST to gRPC), and entry-level security
- load balancer: sit in front of services to distribute incoming traffic across multiple nodes
- service discovery (e.g. Eureka): acts as an address book so service A can find service B
- config server: use Spring Cloud Config to manage environment variables in one place
- auth server: handles JWT issuance when user logs in
- business services: small, independent, and perform one specific business function
- message broker: facilitates async communication
- database: each service has its own db for loose coupling
