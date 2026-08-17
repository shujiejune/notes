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

- VPC (Virtual Private Cloud): Provisions an isolated, private **virtual** network inside AWS. As an SDE, you divide this into:
  - public subnets: For internet-facing resources like **Application Load Balancers (ALB) and NAT Gateways**.
  - private subnets: For compute tasks (ECS tasks, Lambda functions) and data stores (RDS), completely blocked from direct public internet ingress.
- IAM (Identity and Access Management): Defines granular roles and policies, ensuring services communicate via least-privilege IAM roles rather than hardcoded credentials.

### Build & Container Artifact Packaging

Once code passes local tests and CI pipelines, you package and store container images.

- ECR (Elastic Container Registry): A fully managed Docker **container registry**. Your CI/CD pipeline builds microservice images, runs vulnerability scans, and pushes versioned tags to ECR.

### Compute Execution Layers

Depending on whether the service requires long-running processes or lightweight, event-driven compute:

- ECS (Elastic Container Service): Orchestrates containerized microservices. When paired with AWS Fargate (**serverless** compute engine for ECS), it manages tasks without requiring **EC2** instance provisioning:
  - Manages zero-downtime rolling updates and task **auto-scaling** based on CPU/memory or request count.
  - Sits behind an ALB in private subnets to handle incoming REST/gRPC traffic.
- Lambda: Serverless compute for short-lived, event-driven tasks (e.g. webhook listeners, lightweight API endpoints, file processing triggers). Runs on demand with zero idle cost.

### Data Persistence & File Storage

SaaS apps separate stateful transactional data from unstructured media and assets.

- RDS (Relational Database Service): Managed relational database (PostgreSQL/MySQL/Aurora) deployed in private subnets across multiple Availability Zones (Multi-AZ) for automatic failover, automated snapshots, and read replicas.
- S3 (Simple Storage Service): Scalable object storage used for:
  - Hosting **tenant** file uploads, invoices, and exports via secure **pre-signed** URLs.
  - Hosting compiled static SPA frontend bundles.
- ElastiCache / MemoryDB (Complementary): Managed Redis/Valkey clusters for distributed session caching, token blacklists, and rate-limiting.

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
