# Purpose

Align the agent system with the event system.

## Plan

I need to align the concept of agentic workflows and the event system. Agents themselves can be part of a greater workflow which it ultimately driven by a user prompt.

Every agent instance should will be identified with an AgentId (<agentName>-<uuid>).

It seems like it would like something like this:

1. User creates session
2. User prompt kicks off workflow
3. Agent 1 begins work on workflow by creating Todos, in the prompt that kicks off other agents this agent's AgentId will get passed as part of the prompt so any agent will have the upstream AgentId for context.


It seems like every agent instance should be an aggregate, identified with an AgentId (<agentName>-<uuid>). The agent should emit a standardized agent event which will have an internal event that is specific to the agent's purpose and can be mined from the outer event.