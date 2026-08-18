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
- Lambda: Serverless compute for short-lived, event-driven tasks (e.g. webhook listeners, lightweight API endpoints, file processing triggers). Runs on demand with zero idle cost.

> [!NOTE]
AWS EC2 (Elastic Compute Cloud) is Infrastructure-as-a-Service (IaaS) compute offering that provisions on-demand, resizable virtual servers (called instances) in the cloud.
Auto-scaling is the automated mechanism that dynamically adjusts the number of active compute resources up or down to match real-time demand.

### Data Persistence & File Storage

SaaS apps separate stateful transactional data from unstructured media and assets.

- RDS (Relational Database Service): Managed relational database (PostgreSQL/MySQL/Aurora) deployed in private subnets across multiple Availability Zones (Multi-AZ) for automatic failover, automated snapshots, and read replicas.
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

### How can you make your app scalable for a big traffic day?

### How do you achieve disaster recovery for your cloud app?

### How do you secure your app on the cloud?

### Describe an architecture you designed

### Biggest challenge faced during designing your app on cloud

### How do you pick one service vs another?

### What is your favorite AWS service? How will you improve it?

### What is AWS Service X?
