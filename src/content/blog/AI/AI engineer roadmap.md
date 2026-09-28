---
title: 'AI Engineer Roadmap'
description: 'Get prepared to become an AI Engineer.'
pubDate: 'Aug 3 2026'
heroImage: '../../../assets/images/blog-placeholder-1.jpg'
tags: ['ai', 'ai engineer', 'roadmap']
---

# Roadmap

## 12-Week Agent Engineering Plan — 10 Hours per Week

> **Outcome:** demonstrate that you can build, evaluate, deploy, and explain reliable AI-agent systems—not merely prompt a chatbot. Use Python for the agent layer while retaining Go or Java for backend services and integrations.

### Operating Cadence

- [ ] Reserve three hours each week for focused learning and resource notes.
- [ ] Reserve five hours each week for implementation in the active project.
- [ ] Reserve one hour each week for tests, evaluation data, and documentation.
- [ ] Reserve one hour each week for portfolio polish, a progress post, resume work, or job research.
- [ ] Keep a short weekly log: what changed, what failed, evidence from evaluation, and the next experiment.
- [ ] Do not add autonomy, a second agent, or a new framework until an evaluation shows the current design needs it.

### Before Week 1

- [x] Install Python 3.11+ and create a dedicated virtual environment for agent projects.
- [x] Set up a GitHub organization or pinned repositories for the three portfolio projects.
- [x] Create an API key with a small budget and save it only in a local `.env` file that is ignored by Git.
- [x] Install Docker, Docker Compose, and an API client such as Bruno, Postman, or curl.
- [x] Create a reusable project README template with sections for architecture, setup, evaluation, safety, limitations, and demo.
- [ ] Read [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) and write down why a workflow should begin as simply as possible.

### Weeks 1–2 — LLM Application Foundations

#### Week 1 — Python and Structured LLM Calls

- [ ] Complete the Python sections you need from the [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter1/1) or an equivalent Python refresher.
- [ ] Learn tokens, context windows, temperature, system prompts, and the difference between model output and application logic.
- [ ] Build a small Python HTTP API that sends a request to an LLM and returns schema-validated JSON.
- [ ] Validate model output with Pydantic and return useful errors for invalid output.
- [ ] Add unit tests for valid, malformed, and missing structured fields.
- [ ] Dockerize the service and document one-command local startup.

#### Week 2 — Tools and Reliable Requests

- [ ] Learn tool/function calling, streaming, retry/backoff, timeouts, rate limits, and idempotency.
- [ ] Work through the [OpenAI Agents SDK documentation](https://openai.github.io/openai-agents-python/) or implement the same ideas with direct provider calls.
- [ ] Add two read-only tools to the Week 1 API, each with an explicit input schema and error contract.
- [ ] Log request IDs, latency, model, token usage, tool calls, and failures without logging secrets or sensitive user content.
- [ ] Write ten manual test prompts covering normal requests, ambiguous requests, malformed tool inputs, and tool failures.

### Weeks 3–5 — Project 1: Evaluated Enterprise Knowledge Agent

**Project objective:** Build a document assistant for engineering policies and runbooks that gives citations, refuses unsupported claims, and has measurable retrieval quality.

#### Week 3 — Ingestion and Baseline Retrieval

- [ ] Define the project scope, users, non-goals, data classification, and success metrics in the README.
- [ ] Ingest a small, permission-safe corpus of Markdown or public PDF documents.
- [ ] Implement text extraction, chunking, metadata, embeddings, and vector retrieval.
- [ ] Store each source identifier, title, location, and chunk boundary so answers can cite the original material.
- [ ] Build a baseline question-answer route that returns retrieved passages alongside the answer.
- [ ] Create a first evaluation set of at least 25 answerable, unanswerable, and ambiguous questions.

#### Week 4 — Retrieval Quality and Citations

- [ ] Compare at least two chunking strategies using the evaluation set.
- [ ] Add metadata filtering and either hybrid search or reranking.
- [ ] Require every factual answer to contain source citations that resolve to the retrieved documents.
- [ ] Implement an explicit “I do not have enough evidence” response for unsupported questions.
- [ ] Record baseline retrieval recall and answer/citation quality before changing prompts or retrieval settings.

#### Week 5 — Evaluation, Safety, and Release

- [ ] Add automated evaluation for retrieval relevance, groundedness, citation correctness, latency, and cost.
- [ ] Add adversarial tests for prompt injection in documents, irrelevant retrieved text, and requests outside the corpus.
- [ ] Add tracing for one complete request: retrieval, prompt construction, model call, and final answer.
- [ ] Publish an architecture diagram, a short demo video, and a results table in the README.
- [ ] Deploy a demo or provide reproducible Docker Compose instructions.
- [ ] Pin the repository on GitHub only after another person can run the documented setup.

### Weeks 6–8 — Project 2: Safe Support Operations Agent

**Project objective:** Build a stateful workflow that investigates a support ticket using controlled tools and requires human approval for every write action.

#### Week 6 — Workflow and Tool Contracts

- [ ] Read the [LangGraph documentation](https://langchain-ai.github.io/langgraph/) to understand state, persistence, and human-in-the-loop workflows; use it only if it simplifies the design.
- [ ] Model the workflow as explicit states: intake, investigate, draft resolution, approval, execute, and audit.
- [ ] Implement read-only mock tools for customer lookup, order status, knowledge-base search, and logs.
- [ ] Define tool permissions, schemas, timeout behavior, retry policy, and idempotency rules.
- [ ] Persist workflow state and an immutable audit record in Postgres.

#### Week 7 — Approvals and Failure Handling

- [ ] Add a write-capable mock action, such as issuing a refund or sending a customer message, behind a human approval gate.
- [ ] Ensure the system presents the proposed action, reason, parameters, and affected record before approval.
- [ ] Add tests for denied approval, expired approval, duplicate execution, unavailable tools, and invalid tool arguments.
- [ ] Add RBAC so only appropriate users may approve an action.
- [ ] Write a threat model covering prompt injection, unauthorized tool use, data leakage, and excessive-cost requests.

#### Week 8 — Observability and Portfolio Release

- [ ] Add structured logs, traces, health checks, and dashboards for errors, latency, token usage, tool failures, and approval outcomes.
- [ ] Create a regression suite with at least 30 support scenarios and evaluate it after every material change.
- [ ] Document why the system is a deterministic workflow with bounded agentic decisions rather than an unrestricted autonomous agent.
- [ ] Record a three-to-five-minute demo showing investigation, approval, audit history, and a failure case.
- [ ] Publish the README with architecture, local deployment, test commands, evaluation results, and limitations.

### Weeks 9–12 — Project 3: AI Incident Investigator

**Project objective:** Build a production-style incident-analysis system that investigates an issue from read-only operational context and drafts, but never automatically executes, a remediation plan.

#### Week 9 — Architecture and Read-Only Investigation

- [ ] Write an architecture decision record defining the Python agent service, Go/Java integration service, Postgres, queue, and observability components.
- [ ] Define a narrow incident domain and a safe sample dataset of runbooks, deploy records, logs, and GitHub issues.
- [ ] Implement ticket ingestion and read-only search tools for the selected data sources.
- [ ] Build a timeline view that distinguishes observed evidence from model-generated hypotheses.
- [ ] Add citations to every evidence claim and explicitly label uncertain conclusions.

#### Week 10 — Backend Systems Depth

- [ ] Add asynchronous investigation jobs with durable status, retries, timeouts, and cancellation.
- [ ] Implement authentication and RBAC around incident data and audit records.
- [ ] Add a Go or Java service for one integration or API boundary to showcase your existing backend strength.
- [ ] Add a review screen that lets a human approve, edit, or reject a drafted remediation plan or postmortem.
- [ ] Ensure no tool can deploy, mutate infrastructure, or create external tickets without an explicit human action.

#### Week 11 — Evaluation and Hardening

- [ ] Build an evaluation set of at least 40 incidents with expected evidence, plausible hypotheses, and unacceptable outputs.
- [ ] Measure evidence retrieval, groundedness, timeline accuracy, tool success rate, latency, and cost per investigation.
- [ ] Add regression tests for irrelevant evidence, conflicting evidence, prompt injection, stale data, and partial tool outages.
- [ ] Use traces to identify one concrete weakness, improve it, and document the before-and-after result.
- [ ] Add CI to run unit tests, integration tests, and a small deterministic evaluation subset on every pull request.

#### Week 12 — Job-Ready Packaging

- [ ] Deploy the capstone or make the complete local environment reproducible with Docker Compose.
- [ ] Create a concise architecture diagram and a three-to-five-minute narrated demo.
- [ ] Write a case study: problem, constraints, design decisions, evaluation results, failures, safety controls, and next steps.
- [ ] Add the three projects to your GitHub profile with polished READMEs and clear technology tags.
- [ ] Draft one resume bullet per project using outcome, engineering scope, reliability feature, and measured result.
- [ ] Practice explaining one architectural tradeoff, one production failure mode, and one evaluation result for each project.

### Core Resources

- [ ] Study the [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) for tools, guardrails, sessions, tracing, and testing concepts.
- [ ] Study [OpenAI’s evaluation guide](https://platform.openai.com/docs/guides/evals) and apply it to every project.
- [ ] Study [Anthropic’s agent-engineering guide](https://www.anthropic.com/engineering/building-effective-agents) for workflow-vs-agent tradeoffs.
- [ ] Complete the relevant modules of the [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter1/1) for transformer, embedding, and LLM fundamentals.
- [ ] Use [Full Stack Deep Learning](https://fullstackdeeplearning.com/) to deepen your production ML/LLM systems knowledge.

### Portfolio and Job Search Checklist

- [ ] Keep two deep, production-minded projects pinned rather than accumulating many shallow chatbot demos.
- [ ] Include an architecture diagram, test instructions, evaluation set, measured results, threat model, and demo video in every featured project.
- [ ] Apply for AI Engineer, Applied AI Engineer, LLM Engineer, AI Platform Engineer, and Backend Engineer—AI/ML Platform roles.
- [ ] Position yourself as a backend engineer who builds reliable AI systems integrated with real services.
- [ ] Prepare concise stories about reliability, evaluation, safety, cost, observability, and a difficult technical tradeoff.
- [ ] Do not prioritize fine-tuning or multi-agent designs until you can demonstrate a clear problem and an evaluation-backed benefit.

## Skill Set

### Layer 1: Software Engineering

- backend
  - [x] Go/Python/TypeScript
  - [x] REST APIs
  - [x] gRPC
  - [x] async programming
  - [x] authentication
  - [x] microservices
- databases
  - [x] PostgreSQL
  - [ ] Redis
  - [ ] object storage
- infra
  - [x] Docker
  - [ ] Kubernetes
  - [x] CI/CD
- Cloud
  - [ ] AWS

### Layer 2: LLM Fundamentals

- [ ] transformers
  - [ ] tokens
  - [ ] embeddings
  - [ ] attention
  - [ ] context window
  - [ ] KV cache
  - [ ] positional encoding
- [ ] tokenization
- [ ] model families
  - decoder-only LLMs
  - encoder models
  - encoder-decoder models

### Retrieval

- [ ] embeddings
  - what an embedding represents
  - similarity search
  - cosine similarity
  - approximate nearest neighbor search
- [ ] chunking
  - chunk size
  - overlap
  - metadata
  - parent-child retrieval
- [ ] vector databases
  - indexing
  - filtering
  - hybrid search
  - metadata
  - reranking
- [ ] retrieval
  - dense retrieval
  - sparse retrieval
  - hybrid retrieval
  - rerankers

### Layer 4: Fine-Tuning

Types of fine-tuning:

- full fine-tuning
- LoRA
- QLoRA
- instruction tuning
- preference optimization

Concepts:

- datasets
- evaluation
- overfitting
- checkpoint
- hyperparameters

### Layer 5: AI Workflows / Agents

- [ ] tool calling
- [ ] workflow orchestration
- [ ] structured outputs
- [ ] memory
- [ ] planning
- [ ] evaluation

### Production Engineering

Concepts:

- batching
- streaming
- concurrency
- rate limiting

Questions:

- cost optimization, questions:
  - Why is the monthly AI bill so high?
  - Can a smaller model handle this task?
  - Can we cache results?
  - Should we batch results?
- observability, monitor:
  - latency
  - token usage
  - failures
  - hallucinations
  - retrieval quality
- evaluation, metrics:
  - retrieval accuracy
  - answer quality
  - groundedness
  - latency
  - cost per request

## Projects Evolution

### What is production quality?

- architecture
  - clear layering
  - domain-driven design
  - dependency injection
  - configuration management
  - environment separation
- testing
  - unit tests
  - integration tests
  - API tests
  - CI pipeline
- deployment
  - Docker
  - docker-compose / Kubernetes
  - CI/CD
  - HTTPS
  - logging
- security
  - OAuth2
  - JWT
  - password reset
  - email verification
  - RBAC
  - rate limiting
- observability
  - structural logging
  - metrics
  - tracing
  - health checks
- scalability
  - Redis
  - async jobs
  - caching
  - message queues
  - CDN
- documentation
  - OpenAPI / Swagger
  - architecture diagram
  - deployment guide

### Jingdezhen Ceramics Platform

- **phase 1 - add AI search:** Implement semantic search, instead of keyword search. Introduce embeddings, vector search, retrieval.
  - Exp: "Blue porcelain vase with lotus patterns"
- **phase 2 - recommendation system:** Recommend ceramics, artists, travel destinations based on semantic similarity.
- **phase 3 - RAG chatbot:** Build a pipeline, e.g. knowledge base -> chunking -> embedding -> vector DB -> retriever -> LLM -> answer
- **phase 4 - multimodal search:** Use vision-language models, embeddings, and multimodal retrieval. Users upload a ceramic photo and find visually similar products.
- **phase 5 - fine-tune:** Fine-tune a small open-weight model for ceramic technology, travel recommendations, and customer support.

### Robotic Dispatch & Delivery

- **intelligent dispatch:** Instead of hardcoded rules, build an AI planner that inputs weather/traffic/robot battery/priority, and outputs the best dispatch plan.
- **natural-language scheduling:** User says "Deliver this package to Building B before 5 pm", LLM extracts destination/deadline/constraints instead of requiring rigid forms.
- **route explanation:** Instead of "Route #18", explain "Robot 3 was selected because it has 70% battery, is 500 meters away, and avoids a temporary road closure".
- **predictive maintenance:** Collect robot logs, train a model predicting battery degradation, motor failures, and maintenance windows.
- **AI operations dashboard:** Instead of only monitoring robots, summarize operational events like "3 robots are delayed because of road congestion".

## Interview Questions Bank

### DeepSeek

- Round 1: enterprise knowledge base & agent projects
  - session memory
    - MessageWindow or TokenWindow? Why?
    - When persisting sessions in Redis, how do you determine the session expiration policy?
    - Have you encountered concurrent-session conflicts? How did you handle them?
  - Long-term memory
    - When using a vector database to store long-term memories, have you encountered a situation where the amount of stored memory keeps growing and retrieval becomes less accurate? How did you optimize it in production?
    - What is your fallback strategy when the context exceeds the model's token limit?
  - Cost
    - What is the average daily token cost per user?
    - How would you control costs at million-level traffic?
    - Have you implemented request interception/rate limiting? For example, how would you prevent users from maliciously submitting extremely long text to drive up costs?
  - Model selection
    - Why did you choose a base model for this scenario instead of a fine-tuned model?
    - What data did you use to make the model selection decision?
  - Production troubleshooting
    - What piece of logic did you change, and by what percentage did it improve the results?
- Round 2: design an enterprise-grade agent system from scratch
  - Overall system architecture
    - How would you design the overall system architecture?
    - How would you divide the system into modules?
    - What are the responsibilities of each module, what does each module depend on, and how do they communicate with each other?
    - How would you decouple the tool layer, memory layer, and orchestration/scheduling layer?
  - Intelligent task decomposition and orchestration
    - How do you distinguish between a simple single-tool task and a complex multi-step task?
    - How do you automatically decompose a complex requirement into an execution plan? How do you determine the appropriate granularity of decomposition?
    - How do you maintain contextual consistency across multiple steps of a task?
  - Failure retry & fault tolerance (important)
    - How do you determine whether a tool call has failed?
    - If one step of a task fails midway, how do you determine whether to retry, roll back, or re-plan? What are the respective triggering conditions?
  - Multi-tool orchestration & risk control
    - How do different tools, e.g. online search, keyword search, and code parsing, work together?
    - How do you manage permissions for tool calls?
    - How do you prevent users from using an agent to perform unauthorized operations?
- Round 3: understanding of the agent industry
  - Why are you committed to pursuing the agent space? Do you think it is a short-term trend or a long-term direction? What are the areas where agents will have long-term practical applications?
  - Over the next 1-3 years, what do you think will be the biggest bottleneck for large-scale agent adoption, models or engineering?
  - What is fundamentally different about your agent project compared with open-source demos available online?
  - What is your irreplaceable competitive advantage?
  - Which will achieve large-scale adoption first, B2B or B2C agents? Why?
