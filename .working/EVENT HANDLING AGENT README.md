# Event-Handler Agents

This directory contains event-handler agents that implement the Gold Grizzly event-driven architecture pattern. Event-handler agents are specialized agents that respond to specific events in the system and perform work based on the event payload.

## Architecture Overview

### Event-Handler Agent Pattern

Event-handler agents follow a specific naming convention where the agent name exactly matches the event it handles:

- Event: `workflow.saySomethingNiceRequested`
- Handler: `workflow.saySomethingNiceRequested-handler.md`

- Event: `agent.someAgent.eventName` 
- Handler: `agent.someAgent.eventName-handler.md`

### Event Processing Flow

```
Event Emitted → Listener Service → Handler Agent Invocation → Event Processing → Follow-up Events
```

1. **Event Emitted**: Any component emits an event via the eventuali API
2. **Listener Service**: `.apps/listener/main.py` receives the event
3. **Handler Check**: Listener checks if a handler exists for `{event_name}-handler`
4. **Agent Invocation**: If handler exists, Claude CLI is called with event payload
5. **Event Processing**: Handler agent processes the event and performs work
6. **Follow-up Events**: Handler emits subsequent events to continue workflows

## Something Nice Workflow Example

This directory demonstrates the pattern with a three-phase workflow:

### Event Chain
```
workflow.saySomethingNiceRequested
    ↓ triggers
workflow.saySomethingNiceRequested-handler
    ↓ emits
agent.saySomethingNiceRequestedHandler.somethingNiceSaid
    ↓ triggers  
agent.saySomethingNiceRequestedHandler.somethingNiceSaid-handler
    ↓ emits
agent.somethingNiceSaidHandler.verified
    ↓ triggers
agent.somethingNiceVerifiedHandler.verified-handler
    ↓ emits
workflow.somethingNiceCompleted
```

### Handler Agents

#### 1. `workflow.saySomethingNiceRequested-handler.md`
- **Purpose**: Generate nice messages based on recipient and context
- **Input**: Workflow request with recipient, occasion, preferences
- **Processing**: Analyzes context and generates personalized message
- **Output**: Emits `agent.saySomethingNiceRequestedHandler.somethingNiceSaid`

#### 2. `agent.saySomethingNiceRequestedHandler.somethingNiceSaid-handler.md`
- **Purpose**: Prepare message for delivery
- **Input**: Generated message from previous handler
- **Processing**: Creates delivery todos, simulates delivery
- **Output**: Emits `agent.somethingNiceSaidHandler.verified`

#### 3. `agent.somethingNiceVerifiedHandler.verified-handler.md`
- **Purpose**: Complete workflow and generate reports
- **Input**: Verification that message was delivered
- **Processing**: Creates completion report, workflow summary
- **Output**: Emits `workflow.somethingNiceCompleted`

## Event Context Pattern

Each handler receives the full event payload in a structured format:

```
===EVENT_CONTEXT===
{
  "event_id": "evt-12345",
  "aggregate_id": "workflow-abc123",
  "correlation_id": "workflow-abc123", 
  "causation_id": "evt-parent",
  "event_name": "workflow.saySomethingNiceRequested",
  "attributes": {
    "recipient": "Alice",
    "occasion": "birthday",
    "preferences": ["thoughtful", "creative"]
  },
  "timestamp": "2025-08-20T15:30:00Z"
}
===END_CONTEXT===
```

### Key Fields

- **event_id**: Unique identifier for this specific event
- **aggregate_id**: Groups related events (often same as correlation_id)
- **correlation_id**: Links events in the same workflow
- **causation_id**: ID of the event that caused this event (parent-child)
- **event_name**: Full event name that triggered this handler
- **attributes**: Event-specific data payload
- **timestamp**: When the event occurred

## Handler Implementation Guidelines

### Required MCP Tools
All event-handler agents should include these MCP tools:
```yaml
tools: mcp__eventuali__start_agent, mcp__eventuali__emit_agent_event, mcp__eventuali__complete_agent
```

Workflow-level handlers may also need:
```yaml  
tools: ... mcp__eventuali__emit_workflow_event
```

### Agent Lifecycle Pattern

1. **Start Agent**: Extract context and start agent instance
2. **Process Event**: Perform the specific work for this event type
3. **Emit Events**: Create follow-up events to continue workflows
4. **Complete Agent**: Mark agent as completed with success/failure

### Context Extraction
```python
# Extract required values from ===EVENT_CONTEXT=== block
AGENT_ID = f"{agent_name}-{timestamp}-{random}"
WORKFLOW_ID = extracted_correlation_id
CAUSATION_ID = extracted_event_id
```

### Event Emission
```python
# Emit follow-up events to continue workflow
Use mcp__eventuali__emit_agent_event with:
- agent_id: [generated AGENT_ID]
- agent_name: [handler agent name]
- event_name: [next event name]
- attributes: [relevant data for next handler]
```

## Testing

### Generate Test Events
Use the test script to generate events:
```bash
# Basic test
uv run .claude/scripts/test-something-nice.py

# Custom parameters
uv run .claude/scripts/test-something-nice.py --recipient Bob --occasion promotion --preferences funny,casual

# Dry run (show without sending)
uv run .claude/scripts/test-something-nice.py --dry-run
```

### Running the System

1. **Start the API server**: 
   ```bash
   # Start eventuali API (usually port 8765)
   uv run .apps/api/main.py
   ```

2. **Start the listener service**:
   ```bash
   # Start event listener and orchestrator
   uv run .apps/listener/main.py
   ```

3. **Generate test events**:
   ```bash
   # Send test event to trigger workflow
   uv run .claude/scripts/test-something-nice.py
   ```

### Expected Output

When working correctly, you should see:
1. Listener service receiving events
2. Handler agents being invoked
3. Event chain progressing through all three handlers
4. Completion report generated in `.output/` directory
5. Final workflow completion event

## Design Principles

### 1. Event-Driven Architecture
- Handlers are reactive, not proactive
- Events contain all necessary context
- No shared state between handlers

### 2. Single Responsibility
- Each handler does one specific thing
- Clear input/output contracts
- Stateless processing

### 3. Fault Isolation
- Handler failures don't cascade
- Events can be replayed if needed
- Error events logged for debugging

### 4. Workflow Orchestration
- Complex workflows built from simple handlers
- Event correlation maintains workflow context
- Causation chains enable event tracing

### 5. Testability
- Handlers can be tested in isolation
- Events are data structures (easy to mock)
- Deterministic processing based on input

## Extending the Pattern

### Adding New Handlers

1. **Create Handler Agent**: Add new `.md` file in this directory
2. **Name Convention**: Use exact event name + `-handler`
3. **Include MCP Tools**: Add eventuali tools for event emission
4. **Follow Pattern**: Extract context, process, emit, complete
5. **Test**: Create test events to verify handler works

### Creating New Workflows

1. **Design Event Chain**: Plan the sequence of events
2. **Create Handlers**: Implement each handler in the chain
3. **Add Test Script**: Create script to generate initial event
4. **Document Flow**: Update this README with new workflow
5. **Test End-to-End**: Verify complete workflow execution

## Troubleshooting

### Handler Not Triggering
- Check handler file exists in correct location
- Verify exact naming: `{event_name}-handler.md`
- Ensure listener service is running
- Check API connectivity

### Context Extraction Issues
- Verify `===EVENT_CONTEXT===` block format
- Check JSON structure in event payload
- Ensure required fields are present
- Validate event emission format

### Event Chain Breaks
- Check correlation_id consistency across events
- Verify causation_id links are correct
- Ensure follow-up events use proper naming
- Check handler completion status

### Missing Events
- Verify MCP eventuali tools are available
- Check API server is running
- Ensure event emission doesn't fail silently
- Look for timeout issues in handler execution