# Roadmap

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
