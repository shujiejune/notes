[Alejandro AO: How to Build a Coding Agent | 3-Layer Architecture](https://www.youtube.com/watch?v=5duo9qHw660)

3 Layers
- AI
  - unifies LLM providers
  - streams events to the consumer
- Agent
  - agent loop (stateless)
    - takes history messages, available tools, the provider, as input
    - sends messages to the provider (LLM)
    - LLM returns tool calls
    - agent executes tool calls
    - LLM returns a response
  - harness (stateful, reusable)
    - takes the session, the system prompt, the provider, as input
    - runs the agent loop
    - streams events: appending the response to the message history and repeats
    - has no idea where the session is stored, what the system prompt is
    - the one users interact with
- Coding
  - TUI
    - consumes the events from the agent harness
    - displays messages
  - agent
    - tools
    - skills
    - system prompt

[Sean: Learn AI Agent Harness/Loop Engineering/LLM Ops/Eval System](www.bilibili.com/video/BV1NV776uEQX/)


