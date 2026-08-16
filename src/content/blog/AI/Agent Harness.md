---
title: 'Agent Harness'
description: 'Notes on agent harness internals: context, memory, and the ephemeral run environment.'
pubDate: 2026-07-19
tags: ['ai', 'agent']
---
# Agent Harness

## AI Agent Run: Everything Inside the Box is Ephemeral

- Input
  - User Prompt
  - Current Chat History
  - System Prompt
- Working Memory / Context RAM
  - Procedural Memory (files, text): `skill.md`
    - How should the agent respond to the person
    - skills instructions
  - Semantic Memory (vector store): RAG (top-k search)
    - Durable facts: either you input them or have it evolved itself over time, by consolidating some past chats and distilling facts from them (using a summarizer agent, e.g. a cheaper model).
    - User profile
  - Episodic Memory (SQL DB + vector store): RAG for relevance, SQL for recency
    - dated events
    - past chat history
- LLM (Q&A Agent)
- Reply

**Harness:** the agent framework built to control the LLM.
Tools: LangGraph, LangChain, Pydantic, etc.

The memory system needs an update system. The update data should come from user replies, saved into episodic memory.

The LLM may not just read memory, it can also call agentic tools, e.g. schedule meetings, read/write in CRM, fetch payment info.

**Loop:** a part of the harness, involving LLM, agentic tools calling, and end loop guardrails. It's an architectural thinking of when it's good enough to stop and give the user a reply.

## Eval and LLM Ops

**Eval:** evaluate the AI agent run to improve it
**LLM Ops:** system to diagnose, fix, evolve the harness

- Trace system
  - Trace: track events and collect data, which flows to _eval_ and _observe_. 1 trace per run, e.g. Langfuse, LangSmith
- Evaluation system
  - Eval: was it good? "LLM-as-a-judge" -> scores
  - Observe: was it healthy? Tracks tokens, latency, errors
  - Diagnose: where/why it was broken?
- Gate: if the eval passed, ship it; if eval not passed, fix the bug, re-run, re-trace, re-eval
- Ship system
  - Release: ship the fix safely, including new prompt version, model config, tool change, RAG param (top-k)
