---
title: 'AWS'
description: 'Cloud architecture questions: scalability, disaster recovery, security, and service selection on AWS.'
pubDate: 2026-08-16
tags: ['cloud', 'aws']
---
# AWS

## Infrastructure

### Foundations & Network Isolation

Before deploying app code, you establish the security boundaries and network topologies.

- VPC (Virtual Private Cloud): Provisions an isolated, private **virtual network** inside AWS. As an SDE, you divide this into:
  - public subnets: For internet-facing resources like **Application Load Balancers (ALB) and NAT Gateways**.
  - private subnets: For compute tasks (ECS tasks, Lambda functions) and data stores (RDS), completely blocked from direct public internet ingress.
- IAM (Identity and Access Management): Defines granular roles and policies, ensuring services communicate via least-privilege IAM roles rather than hardcoded credentials.

> [!NOTE]
A virtual network is a software-defined network (SDN) abstraction layered on top of physical networking hardware (cables, physical switches, and routers).
It enables digital devices (virtual machines, containers, and cloud instances) to communicate as if connected by dedicated physical wires, regardless of their actual physical location.

- overlay vs underlay: The underlay is the physical hardware responsible for raw packet forwarding (Ethernet switches, IP routers). The overlay is the software layer that encapsulates traffic (e.g. using protocols like VXLAN or Geneve) into tunnels over the physical network, creating isolated virtual topographies.
- control plane vs data plane separation: In traditional networking, each switch makes its own routing decisions. In virtual networks, a centralized software controller (the control plane) dictates routing policies, security rules, and topology, while the distributed virtual switches/routers (the data plane) simply enforce and forward the packets.
- software-defined interfaces: Network components, e.g. Virtual Network Interfaces (vNICs), virtual bridges, subnets, routing tables, and firewalls, are defined and modified dynamically via code or APIs without touching physical cables.

Common forms of virtual networking

| Type | Description | Common Use Case |
| --- | --- | --- |
| VPC / VNet (Cloud) | Logically isolated slice of a public cloud provider's network (e.g. AWS VPC). | Multi-tier cloud architectures, tenant isolation, and private subnetting. |
| VLAN (Virtual LAN) | Layer 2 segmentation within a single physical network infra via 802.1Q tagging. | Partitioning corporate subnets (e.g. Guest Wi-Fi vs Internal Corporate LAN). |
| VPN (Virtual Private Network) | Encrypted, point-to-point or site-to-site tunnels established across untrusted public networks. | Remote worker access, connecting on-premises data centers to the cloud. |
| Container Networks | Virtual bridge/overlay drivers (e.g. Docker bridge, Kubernetes CNI plugins). | Inter-pod and cotainer-to-container routing inside host clusters. |

### Build & Container Artifact Packaging

Once code passes local tests and CI pipelines, you package and store container images.

- ECR (Elastic Container Registry): A fully managed Docker **container registry**. Your CI/CD pipeline builds microservice images, runs vulnerability scans, and pushes versioned tags to ECR.

> [!NOTE]
A container registry is a centralized server-side storage and distribution service for container images.
It acts as the intermediary between your build pipeline and runtime environments, allowing devs and CI/CD systems to push compiled images and compute nodes to pull them for deployment.

### Compute Execution Layers

Depending on whether the service requires long-running processes or lightweight, event-driven compute:

- ECS (Elastic Container Service): Orchestrates containerized microservices. When paired with AWS Fargate (**serverless** compute engine for ECS), it manages tasks without requiring **EC2** instance provisioning:
  - Manages zero-downtime rolling updates and task **auto-scaling** based on CPU/memory or request count.
  - Sits behind an ALB in private subnets to handle incoming REST/gRPC traffic.
- Lambda: Serverless compute for short-lived, event-driven tasks (e.g. webhook listeners, lightweight API endpoints, file processing triggers). Runs on demand with zero idle cost. 15 min is the absolute hard maximum execution limit for a single standard Lambda invocation.

> [!NOTE]
AWS EC2 (Elastic Compute Cloud) is Infrastructure-as-a-Service (IaaS) compute offering that provisions on-demand, resizable virtual servers (called instances) in the cloud.
Auto-scaling is the automated mechanism that dynamically adjusts the number of active compute resources up or down to match real-time demand.

A Lambda function is composed of 4 distinct layers:

- Code & handler: The code artifact containing your app logic and dependencies. It exposes a specific entry point, i.e. the handler function, that the AWS runtime invokes when an event arrives.
- Runtime config: Target runtime, resource allocation, timeout limit.
- Execution role (IAM): The identity assumed by the function at runtime, specifying exactly which AWS resources (S3 buckets, DynamoDB tables, RDS dbs) the code is authorized to access.
- ESM & triggers: The upstream event definitions that invoke the function event, an SQS queue poll, an API gateway route, or a scheduled EventBridge cron rule.

### Data Persistence & File Storage

SaaS apps separate stateful transactional data from unstructured media and assets.

- RDS (Relational Database Service): Managed relational database (PostgreSQL/MySQL/Aurora) deployed in private subnets across multiple Availability Zones (Multi-AZ) for automatic failover, automated snapshots, and read replicas.
- DynamoDB (NoSQL Database): Supports both key-value and document data models and is engineered for single-digit millisecond latency at any scale. Unlike traditional dbs that run on provisioned server instances with open TCP connection pools, DynamoDB is accessible entirely over HTTPS/REST APIs. You do not manage servers, clusters, replicas, patching, or storage volumes. You simply define a table with a primary key (partition key and optional sort key) and set throughput modes.
- S3 (Simple Storage Service): Scalable object storage used for:
  - Hosting **tenant** file uploads, invoices, and exports via secure **pre-signed** URLs.
  - Hosting compiled static SPA frontend bundles.
- ElastiCache / MemoryDB (Complementary): Managed Redis/Valkey clusters for distributed session caching, token blacklists, and rate-limiting.

> [!NOTE]
In SaaS, a tenant is an isolated customer organization, company, or discrete user group that shares access to the app.
While multiple tenants use the same system infra, each tenant's data, config, and user accounts must remain completely invisible and inaccessible to all other tenants.

Common multi-tenant data isolation strategies:

- pool model (shared db, shared schema): All tenants share the same db tables. Every row includes a `tenant_id` column, and row-level security (RLS) or app-level filters to enforce isolation.
- bridge model (shared db, separate schemas): Tenants share the db instance, but each tenant has their own schema or namespace.
- silo model (dedicated infra): High-compliance enterprise tenants get dedicated db instances, VPC, or compute clusters.

> [!NOTE]
A pre-signed URL is a time-limited, cryptographically signed URL that grants temporary read or write access to a specific private cloud object (e.g. an object in an S3 bucket) without requiring the client to have AWS credentials or making the bucket public.
When a backend service generates a pre-signed URL, it signs the HTTP request (specifying method, path, headers, and expiration timestamp) using its own IAM security credentials and signature algorithm.

Why pre-signed URLs are standard in SaaS:

- zero backend bottleneck: File uploads and downloads transfer directly between the client browser and S3. Large payloads bypass backend app servers, saving compute memory, CPU, and network bandwidth.
- granular security: Buckets remain strictly private. The backend can inject path prefixes like `s3://app-uploads/{tenant_id}/files/` into the URL before signing, ensuring a tenant can only upload or download files inside their assigned directory.
- time expiration: URLs expire automatically after a set duration, mitigating the risk of leaked links.

### Asynchronous Messaging & Orchestration

To keep API response times low, write operations and long-running workflows are decoupled.

- SQS (Simple Queue Service): Fully managed message queue for decoupling services. Used for buffering write-heavy events, handling async background jobs (e.g. sending emails, report generation), and isolating failures via Dead Letter Queues (DLQ).
- Step Functions: Serverless visual state machine that orchestrates multi-step, multi-service workflows. It manages complex business logic, retries, and distributed transactions (e/g., multi-step tenant onboarding, checkout billing sequences, or SAGA pattern compensations).
- EventBridge (Complementary): Serverless event bus to broadcast domain events across microservices using pattern-matching rules.

### Edge Routing, Ingress & Delivery

Delivering frontend assets and routing API requests securely to backend services.

- CloudFront: Global Content Delivery Network (**CDN**) with edge caching. Serves S3 frontend assets with low latency and terminates TLS/HTTPS.
- Route 53 & AWS WAF (Complementary): Route 53 manages **DNS** records and health checks, while AWS WAF attaches to CloudFront or ALBs to filter out malicious traffic, SQL injection, and DDoS attempts.
- API Gateway (Complementary): Often paired with Lambda or microservices for API routing, rate limiting, and JWT authentication validation.

> [!NOTE]
A Content Delivery Network (CDN) is a geographically distributed network of proxy servers and data centers (often called Points of Presence, PoPs) designed to deliver web content, static assets, and dynamic API traffic to end users with minimal latency and high availability.
Instead of every client routing requests directly to a centralized origin server (e.g. an S3 bucket or backend EC2/ECS cluster in a single AWS region), requests are routed to the nearest edge location.

How it works:

- Anycast DNS routing: When a user requests an asset, Anycast routing directs the user's DNS query to the nearest edge PoP based on network proximity and hop count.
- Edge caching (cache hit): If the requested static file is already cached in that edge server's RAM/SSD and hasn't expired according to its `Cache-Control` header/TTL, the edge server immediately returns it without hitting the origin.
- Origin fetch (cache miss): If the asset is missing or expired, the edge server retrieves it from the origin server, stores a copy in its cache for subsequent requests, and returns the response to the user.
- Connection multiplexing & termination: For non-cacheable dynamic requests (like backend POST APIs), CDNs maintain pre-warmed, persistent TCP/TLS connections from the edge back to the origin, significantly reducing TLS handshake round-trp times (RTT).

CDN architecture comparison

| Scenario | Without CDN | With CDN |
| --- | --- | --- |
| RTT | Dependent on geographic distance to the central origin server. | Terminated at local edge server close to user. |
| Origin server load | Origin processes 100% of static and dynamic requests. Spikes cause downtime. | Offloads 70-95% of static traffic. Origin handles only dynamic API computation. |
| TLS negotiation | Handshake travels all the way to the origin server on every cold connection. | Terminated at the edge. Connection to origin remains persistent and optimized. |
| DDoS resilience | Origin bandwidth can be easily saturated by volume attacks. | Massive distributed edge capacity absorbs and mitigates volumetric Layer 3/4 and Layer 7 attacks. |

### Observability & Operations

Once in production, systems require centralized monitoring, alerting, and tracing.

- CloudWatch:
  - logs: Centralizes stdout/stderr app logs from ECS containers and Lambda functions.
  - metrics & alarms: Tracks system vitals (CPU/memory utilization, 5xx error spikes, queue depth in SQS) and triggers automated alerts or auto-scaling actions.
- AWS X-Ray (Complementary): Provides distributed tracing across microservices to analyze request latency and pinpoint bottlenecks.

## Questions

### How do you make Lambda event processing idempotent when the same event is received twice?

**Distributed idempotency key lock (DynamoDB pattern)**

The standard industry approach uses a centralized, fast key-value store (like AWS DynamoDB) with **conditional writes** to record the execution lifecycle.

```plaintext
       Event Received (with Idempotency Key)
                         │
                         ▼
           ┌───────────────────────────┐
           │ DynamoDB Conditional Put  │
           │  (attribute_not_exists)   │
           └─────────────┬─────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
    [Key Exists?]                   [Key New?]
         │                               │
         ├─ Status == "COMPLETED"        ▼
         │  └► Return cached response  Set Status="IN_PROGRESS"
         │                             Execute Business Logic
         ├─ Status == "IN_PROGRESS"    Update Status="COMPLETED"
         │  └► Throw retry / wait      Store cached response
         │                             Set TTL (e.g., 24 hrs)
         └─ Status == "FAILED"
            └► Allow re-execution
```

- Extract / generate key: Extract a natural unique identifier from the event (e.g. `payment_id`, `order_id`) or compute a deterministic SHA-256 hash of the critical payload fields.
- Atomic lock acquisition: Use `PutItem` with a condition expression: `ConditionExpression: "attribute_not_exists(idempotency_key) OR (status = :failed AND expiry < :now)"`
- Status tracking
  - `IN_PROGRESS`: Prevents concurrent duplicate executions of the exact same event.
  - `COMPLETED`: Stores the result payload. If a duplicate arrives later, Lambda immediately returns the cached result without re-running business logic.
- Automatic eviction: Set a TTL on the DynamoDB item to clean up expired keys without ongoing maintenance costs.

**Native database deduplications & upserts**

If the Lambda function's primary side effect is writing to a relational db (RDS) or key-value store:

- Relational unique constraints: Add a `UNIQUE` constraint or primary key on the `idempotency_key` / `event_id` column.
- Idempotent upserts: Use native conflict handling rather than a separate check-then-insert: `INSERT INTO orders (...) VALUES (...) ON CONFLICT (order_id) DO NOTHING;` or `ON DUPLICATE KEY UPDATE`.
- Database transactions: Wrap business mutations and the event recording in a single db transaction (`BEGIN ... COMMIT`). If the transaction fails due to a unique key violation, the entire batch rolls back safely.

**Handling downstream third-party side effects**

When Lambda calls external non-idempotent 3rd-party APIs (e.g. charging a card via Stripe, calling a vendor webhook):

- Pass the key downstream: Forward the unique event key as an `Idempotency-Key` HTTP header if the vendor API supports it.
- Write intent before calling: Always record the pending action in your local state before initiating external network calls to avoid duplicate external requests on transient Lambda timeouts.

### What happens when a Lambda times out while processing an SQS message?

When an AWS Lambda function times out while consuming an SQS message, the runtime aborts the execution immediately.
Because the message was never acknowledged or deleted, SQS assumes processing failed and initiates its retry and recovery lifecycle.

```plaintext
     [SQS Queue]
            │
            │ 1. Lambda ESM polls batch (Visibility Timeout clock starts)
            ▼
     [Lambda Instance] ──► Times out (Function Timeout reached)
            │
            ▼ (Function crashes, SQS DeleteMessage is NEVER sent)
     [Visibility Timeout Expires in SQS]
            │
            ▼
     [Message reappears in SQS Queue] ──► `ApproximateReceiveCount` incremented
            │
      ┌─────┴────────────────────────────────┐
      ▼                                      ▼
[ReceiveCount < maxReceiveCount]       [ReceiveCount >= maxReceiveCount]
Re-polled by Lambda for retry          Moved to Dead Letter Queue (DLQ)
```

Step-by-step lifecycle:

- In-flight state & visibility timeout
  - When the Lambda Event Source Mapping (ESM) polls a message from SQS, SQS hides the message from other consumers by setting its **visibility timeout**.
  - Under normal operation, Lambda successfully processes the batch and the ESM automatically calls `DeleteMessage` to remove it from the queue.
- Function timeout abort
  - If the function hits its configured execution limit, the Lambda runtime kills the process and logs a `Task timed out after X.00 seconds` error to CloudWatch.
  - Because execution died mid-flight, the ESM never issues the `DeleteMessage` API call.
- Visibility timeout expiry & reappearance
  - Once the queue's visibility timeout elapses, the message transitions from "In-Flight" back to "Available".
  - SQS increments the message's internal metadata counter: `ApproximateReceiveCount`.
- Retry vs. DLQ routing
  - If `ApproximateReceiveCount < maxReceiveCount`: The message is re-polled by the ESM on a subsequent invocation to retry processing.
  - If `ApproximateReceiveCount >= maxReceiveCount`: SQS stops serving the message to workers and routes it to the configured DLQ for inspection and manual replay.

Critical production gotchas:

- Batch failure poisoning: By default, if a batch contains 10 messages and Lambda times out on message #4, **the entire batch** of 10 messages fails and becomes visible again.
  - Enable `ReportBatchItemFailures` in your ESM and return `batchItemFailures: [{ itemIdentifier: messageId }]` for items that couldn't be processed before the timeout budget expired.
- The "6x Rule" config standard: AWS recommends setting the SQS queue's visibility timeout to at least 6 times the Lambda function timeout.
  - If the visibility timeout is <= the Lambda timeout, SQS might release the message while the first Lambda invocation is still running. This triggers a duplicate concurrent execution processing the same message simultaneously.

### What does a Lambda authorizer return to API Gateway?

A Lambda authorizer returns an authorization response to Amazon API Gateway to indicate whether the caller is allowed to invoke the requested API route.
The format of the returned output depends on the API Gateway type and the authorizer format selected: IAM Policy-based (REST APIs and HTTP APIs) or Simple Boolean-based (HTTP APIs payload format 2.0).

### DynamoDB vs. MongoDB Atlas

| Architectural Dimension | DynamoDB | MongoDB Atlas |
| --- | --- | --- |
| Architecture Model | Serverless / Cloud-Native API | Managed cluster of virtual machines / replica sets |
| Data Format | Key-Value / JSON attributes (Strict 400 KB item limit) | Rich BSON documents (up to 16 MB per doc) |
| Query Flexibility | Rigid: optimized strictly for primary key and GSI/LSI lookups, no joins. | Rich: Full aggregation framework, ad-hoc filters, full-text search, geospecial, `$lookup` joins. |
| Connection Model | Stateless HTTP request/response (ideal for Lambda). | Persistent stateful TCP socket connection pools. |
| Scalability & Maintenance | Zero maintenance auto-partitioning, split-for-heat. | Requires shard key planning and cluster capacity sizing. |
| Host & Portability | AWS only, lock-in. | Multi-cloud and self-hostable. |

```plaintext
Do you have complex aggregations, ad-hoc queries, or need Lucene search?
  ├── YES ──► MongoDB Atlas
  └── NO
       │
       Is your backend predominantly AWS Lambda / Serverless?
         ├── YES ──► DynamoDB
         └── NO
              │
              Is multi-cloud portability / on-prem compatibility required?
                ├── YES ──► MongoDB Atlas
                └── NO  ──► DynamoDB (if access patterns are fixed) or RDS (if relational)
```

### What causes hot partitioning in DynamoDB?

A hot partition occurs when r/w traffic is disproportionately concentrated on a single physical partition, causing it to exceed per-partition throughput limits.

- low-cardinality partition keys: Using partition keys with very few distinct values (such as `status = "ACTIVE" | "INACTIVE"`, `gender`) forces millions of records and queries into a tiny number of hash buckets, preventing DynamoDB from distributing data across storage nodes.
- monotonically increasing / time-based keys: Using dates or timestamps as the partition key (e.g. `PK = "2026-08-21"`) routes 100% of the incoming writes to the current time bucket's partition. Once the window passes, that partition goes cold while the next one absorbs all new writes.
- "celebrity" or skewed access patterns: Workloads where specific items receive exponentially more traffic than others, such as a viral social media post, a flash-sale item, or a major enterprise tenant in a multi-tenant app.
- hot global secondary indexes (GSIs): Even if the base table's partition key is evenly distributed, creating a GSI with a low-cardinality or time-based partition key causes async write replication to bottleneck and backpressure the main table.
- sequential batch ingestion: Running bulk data ingestion scripts that insert items sorted alphabetically or sequentially by partition key concentrates all writes on one partition before moving to the next.

### How would you implement an atomic update in DynamoDB?

This depends on whether your change targets a single numeric counter, requires precondition (optimistic locking), or spans multiple items in an ACID transaction.

- In-place atomic counters (`UpdateItem`): For numeric increments or decrements (e.g., page views or inventory counters), `UpdateItem` applies mathematical updates server-side without reading the item first.
- Conditional writes (guardrails & optimistic locking): Atomic counters can drive numbers negative if unchecked. A `ConditionExpression` ensures mutations only apply if a precondition evaluates to `true` at execution time. If the condition fails, DynamoDB rejects the call with a `ConditionalCheckFailedException`.
- Multi-item transactions: When modifying multiple items (across one or more tables) where all operations must succeed or all must fail, use `TransactWriteItems`.

### Why would you choose AWS Step Functions over Kafka?

The decision between Step Functions and Kafka comes down to orchestration (state machine) vs choreography (event streaming & data ingestion).

- Step Functions is a managed state machine designed for command-driven orchestration: coordinating multi-step business logic, tracking execution state, managing branching decisions, and handling retries/rollbacks.
- Kafka is a distributed append-only log designed for event-driven choreography and streaming data pipelines: high-throughput event broadcasting, historical event replay, and decoupled pub/sub messaging.

When to choose Step Functions:

- complex multi-step business logic with rollbacks (SAGA pattern): e.g. E-commerce checkout where you must reserve inventory -> charge payment -> create shipment. If "charge payment" fails, Step Functions executes the explicit compensation path (release inventory) without relying on distributed consumer coordination.
- long-running, async, or human-in-the-loop processes: e.g. Enterprise employee onboarding, doc approval pipelines, or waiting for a 3rd-party webhook callback via Task Tokens (`waitForTaskToken`). Step Functions can sleep for days at zero compute cost.
- deep AWS service integration without compute.
- auditability and strict compliance: Every execution path, variable payload, and error state is recorded visually in the AWS console, making it trivial to audit why a specific transaction failed.

Hybrid architecture:

```
[User Action] ──► [Kafka Topic: "order-events"]
                         │
                         ▼ (Consumer / EventBridge Pipe)
              [Start Step Functions Execution]
                         │
                         ├─► 1. Run Credit Check
                         ├─► 2. Reserve Warehouse Item
                         ├─► 3. Wait for Payment Webhook (Task Token)
                         │
                         ▼
           [Publish to Kafka: "order-fulfilled"]
```

- Kafka serves as the high-throughput, decoupled event spine across services.
- Step Functions is invoked to orchestrate the complex, multi-step transaction for individual orders once an event is consumed.

### How can you make your app scalable for a big traffic day?

### How do you achieve disaster recovery for your cloud app?

### How do you secure your app on the cloud?

### Describe an architecture you designed

### Biggest challenge faced during designing your app on cloud

### How do you pick one service vs another?

### What is your favorite AWS service? How will you improve it?

### What is AWS Service X?
