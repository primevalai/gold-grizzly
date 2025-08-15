# Eventuali MCP Server

A Model Context Protocol (MCP) server that provides standardized access to the eventuali event system. This server wraps the existing FastAPI event service and exposes event emission and retrieval through MCP tools and resources.

## Overview

The Eventuali MCP Server enables agents and Claude Code to interact with the event system through standardized MCP interfaces instead of direct API calls or script execution. It provides real-time event streaming, comprehensive event access, and type-safe operations.

## Features

### MCP Tools (Actions)
- **emit_agent_event** - Emit agent lifecycle events
- **emit_workflow_event** - Emit workflow events  
- **emit_system_event** - Emit system events
- **start_agent** - Initialize new agent with proper context
- **complete_agent** - Mark agent as completed
- **start_workflow** - Begin new workflow
- **complete_workflow** - End workflow

### MCP Resources (Data Access)
- **events/recent** - Get recent events across all aggregates
- **events/agent/{agent_id}** - Get events for specific agent
- **events/workflow/{workflow_id}** - Get events for workflow
- **events/system/{session_id}** - Get system events
- **events/stream** - Real-time event stream via SSE
- **workflow/{workflow_id}/agents** - Get agents in workflow
- **health** - Health status check

### Real-Time Features
- Background event streaming from API
- Event buffering for quick access
- Subscription-based real-time updates
- Automatic reconnection on stream failures

## Installation

1. Navigate to the MCP directory:
```bash
cd .apps/mcp
```

2. Install dependencies using UV:
```bash
uv pip install -e .
```

## Configuration

The server can be configured using environment variables:

- `EVENT_API_URL` - URL of the eventuali API (default: http://127.0.0.1:8765)
- `MCP_PORT` - Port for the MCP server (default: 3333)
- `MCP_HOST` - Host for the MCP server (default: 127.0.0.1)

## Usage

### Starting the Server

```bash
# Using UV
uv run main.py

# Or directly with Python
python main.py
```

### Connecting from Claude Code

Add the MCP server to your Claude Code configuration:

```json
{
  "mcpServers": {
    "eventuali": {
      "command": "uv",
      "args": ["run", "/path/to/.apps/mcp/main.py"],
      "cwd": "/path/to/.apps/mcp"
    }
  }
}
```

### Using MCP Tools

#### Starting an Agent
```python
# Via MCP tool
start_agent({
    "agent_name": "url-cacher",
    "agent_id": "urlCacher-1234567890-abcdef12",
    "workflow_id": "workflow-uuid",
    "parent_agent_id": "parent-agent-id"  # optional
})
```

#### Emitting Agent Events
```python
# Via MCP tool
emit_agent_event({
    "agent_id": "urlCacher-1234567890-abcdef12",
    "event_name": "cache_completed",
    "attributes": {
        "url": "https://example.com",
        "cache_size": 1024,
        "success": true
    }
})
```

#### Getting Events
```python
# Via MCP resource
recent_events = get_resource("events/recent", {
    "limit": 50,
    "offset": 0,
    "event_type": "agent_event"
})

# Get agent-specific events
agent_events = get_resource("events/agent/urlCacher-1234567890-abcdef12")

# Get workflow events
workflow_events = get_resource("events/workflow/workflow-uuid")
```

#### Streaming Events
```python
# Via MCP resource (streaming)
event_stream = get_resource_stream("events/stream")
async for event in event_stream:
    print(f"New event: {event.event} - {event.data}")
```

## Event Types and Naming

The server enforces the three-aggregate naming convention:

### Agent Events
- **Format**: `agent.{event_name}`
- **Examples**: `agent.started`, `agent.completed`, `agent.failed`
- **Required**: `agent_id` (used as aggregate_id)
- **Optional**: `workflow_id` (correlation), `parent_agent_id` (causation)

### Workflow Events  
- **Format**: `workflow.{event_name}`
- **Examples**: `workflow.started`, `workflow.completed`, `workflow.agent_added`
- **Required**: `workflow_id` (used as correlation_id and aggregate_id)

### System Events
- **Format**: `system.{event_name}`
- **Examples**: `system.session_started`, `system.session_ended`
- **Optional**: `session_id` for grouping

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude Code   │    │   MCP Server     │    │  FastAPI Event  │
│     Agent       │◄──►│   (this app)     │◄──►│      API        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          ▼
                       ┌─────────────┐            ┌──────────────┐
                       │ Event Buffer│            │   Eventuali  │
                       │  + Stream   │            │   Database   │
                       └─────────────┘            └──────────────┘
```

### Components

1. **EventAPIClient** - Async HTTP wrapper for the FastAPI service
2. **FastMCP Server** - MCP protocol implementation with tools and resources
3. **Event Streaming** - Background task that polls API events and maintains buffer
4. **Subscription System** - Real-time event distribution to connected clients

## Error Handling

The server includes comprehensive error handling:

- **Connection failures** - Automatic reconnection with exponential backoff
- **Validation errors** - Detailed error messages for invalid requests
- **Streaming failures** - Graceful degradation and reconnection
- **Resource cleanup** - Proper cleanup of connections and tasks on shutdown

## Logging

The server uses Python's standard logging module with INFO level by default. Key events logged:

- Server startup/shutdown
- Event emission success/failure
- Streaming connection status
- Health check results
- Error conditions

## Testing

Run tests using pytest:

```bash
# Install test dependencies
uv pip install -e .[dev]

# Run tests
pytest
```

## Integration with Existing System

The MCP server is designed to work alongside the existing event emission system:

- **Backward Compatible** - Existing `emit-event.py` script continues to work
- **No Database Changes** - Uses the same eventuali database and API
- **Same Event Format** - Maintains compatibility with existing event structure
- **Additive** - Provides additional capabilities without breaking existing workflows

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the FastAPI event service is running on port 8765
   - Check `EVENT_API_URL` environment variable

2. **MCP Connection Issues**
   - Verify MCP server configuration in Claude Code
   - Check MCP server logs for startup errors

3. **Event Validation Errors**
   - Ensure event names follow the three-aggregate convention
   - Verify required fields are provided (agent_id, workflow_id, etc.)

4. **Streaming Issues**
   - Check network connectivity to event API
   - Review server logs for streaming task errors

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Development

### Project Structure

```
.apps/mcp/
├── pyproject.toml          # Project configuration
├── main.py                 # MCP server implementation
├── client.py               # Event API client wrapper
├── models.py               # Pydantic models
├── README.md               # This file
└── CLAUDE.md               # Claude-specific instructions
```

### Adding New Tools

1. Define request/response models in `models.py`
2. Add tool function in `main.py` with `@mcp.tool` decorator
3. Update documentation

### Adding New Resources

1. Define response models in `models.py`  
2. Add resource function in `main.py` with `@mcp.resource` decorator
3. Update documentation

## License

This project follows the same license as the parent gold-grizzly project.