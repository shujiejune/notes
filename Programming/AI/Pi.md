# Pi Agent Harness

## Faces

Pi Agent has a very simple interface, with only 4 costumes:

- `pi`: TUI
- `pi -p`: run once
- `pi --mode json`: event stream, spits out all the thinking steps for a question you ask.
- `pi --mode rpc`: live pipe

## Context

When you enter one of these commands, Pi agent will feed the context (plain JSON, forkable) to the agent loop:

- `AGENTS.md`
  - what the project does
  - where things live
  - how it's gonna do
- prompt
- session
- system prompt (< 1k)

## The Loop

1. The LLM checks if it can use tools

- If no, send a reply
- If yes, go to the 4 actions Pi agent can do
  - read
  - write
  - edit
  - bash

2. After it finishes the task (read/write/edit/bash), it write some sessions into a tree as a JSON file.
If the task fails, it goes back to step 1.

## How to make Pi stronger

- skills: folder + `SKILL.md`, no code, loaded on demand
- extensions: one `.ts` file, add a tool / block a call
- packages: bundle of the above
- bash + readme
