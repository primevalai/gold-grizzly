# CLAUDE.md - MCP Eventuali Server

## Project Information

This file contains MCP server-specific information and context for Claude Code within the gold-grizzly/.apps/mcp module.

## Critical Directives

### MCP Server Development Standards

**MANDATORY: FastMCP Framework Compliance**

All MCP server development in this module MUST adhere to the following standards:

- **FastMCP 2.0**: Use the latest FastMCP framework for all MCP functionality
- **Type Safety**: All tool and resource functions must include full type hints
- **Pydantic Models**: Use Pydantic models for all request/response validation
- **Async Operations**: All API interactions must be asynchronous
- **Error Handling**: Comprehensive error handling with proper logging

### Agent Integration Protocol

**MANDATORY: Proper Agent Context Handling**

When agents use this MCP server, they MUST:

- **Extract Context**: Parse AGENT_ID, WORKFLOW_ID from ===AGENT_CONTEXT=== blocks
- **Use MCP Tools**: Prefer MCP tools over direct script execution
- **Follow Naming**: Adhere to three-aggregate event naming convention
- **Handle Errors**: Gracefully handle MCP tool failures

### Event System Integration

**MANDATORY: Three-Aggregate Pattern Compliance**

This MCP server enforces the three-aggregate pattern with specific naming conventions:

1. **Agent Events** (`agent.<agentName>.*`):
   - Format: `agent.<agentName>.<eventName>` (e.g., `agent.simonSays.started`, `agent.urlCacher.completed`)
   - MUST include `agent_id` and `agent_name`
   - SHOULD include `workflow_id` for correlation
   - MAY include `parent_agent_id` for causation

2. **Workflow Events** (`workflow.*`):
   - Format: `workflow.<eventName>` (e.g., `workflow.started`, `workflow.completed`)
   - MUST include `workflow_id`
   - SHOULD include `user_prompt` for context

3. **System Events** (`system.*`):
   - Format: `system.<eventName>` (e.g., `system.session_started`)
   - MAY include `session_id` for grouping
   - Used for system-level operations

### Development Environment Requirements

**MANDATORY: UV Package Management**

- **Script Execution**: Use `uv run main.py` to start the server
- **Dependency Installation**: Use `uv pip install -e .` for installation
- **Testing**: Use `uv run pytest` for running tests

### Code Organization Standards

**MANDATORY: Clean Architecture**

- **Separation of Concerns**: Keep API client, models, and server logic separate
- **No `__init__.py`**: Follow PEP 420 namespace packages (no init files)
- **Type Hints**: All functions must have complete type annotations
- **Docstrings**: All public functions require comprehensive docstrings

### Configuration Management

**MANDATORY: Environment Variable Usage**

Configuration MUST use environment variables:

```bash
# Event API connection
EVENT_API_URL=http://127.0.0.1:8765

# MCP server settings  
MCP_PORT=3333
MCP_HOST=127.0.0.1
```

### Real-Time Event Handling

**MANDATORY: Streaming Implementation**

The MCP server MUST provide:

- **Background Polling**: Continuous event stream polling from API
- **Event Buffering**: Maintain recent events buffer for quick access
- **Subscription System**: Real-time event distribution to clients
- **Graceful Degradation**: Handle connection failures and reconnection

### MCP Tool Development Guidelines

**MANDATORY: Tool Implementation Standards**

When creating MCP tools:

1. **Descriptive Docstrings**: Each tool must have detailed usage documentation
2. **Input Validation**: Use Pydantic models for all inputs
3. **Error Responses**: Return structured error responses, don't raise exceptions
4. **Logging**: Log all tool usage and errors
5. **Idempotency**: Tools should be safe to call multiple times

### MCP Resource Development Guidelines

**MANDATORY: Resource Implementation Standards**

When creating MCP resources:

1. **Streaming Support**: Resources that return multiple items should support streaming
2. **Pagination**: Implement proper pagination for large datasets
3. **Filtering**: Provide filtering capabilities where appropriate
4. **Caching**: Use event buffer for frequently accessed data
5. **Performance**: Optimize for low latency data access

### Agent Usage Examples

**Recommended MCP Tool Usage Patterns**

#### Starting an Agent (Recommended)
```python
# Use MCP tool instead of emit-event.py script
await mcp_client.call_tool("start_agent", {
    "agent_name": "url-cacher",
    "agent_id": agent_id,  # From ===AGENT_CONTEXT===
    "workflow_id": workflow_id,  # From ===AGENT_CONTEXT===
    "parent_agent_id": parent_id  # From ===AGENT_CONTEXT===
})
```

#### Emitting Agent Events (Recommended)
```python
# Use MCP tool for specific events
await mcp_client.call_tool("emit_agent_event", {
    "agent_id": agent_id,
    "agent_name": "urlCacher",  # Required for proper event naming
    "event_name": "processing_started",
    "attributes": {
        "file_count": 5,
        "estimated_duration": "30s"
    }
})
```

#### Completing an Agent (Recommended)
```python
# Use convenience tool
await mcp_client.call_tool("complete_agent", {
    "agent_id": agent_id,
    "agent_name": "urlCacher",  # Required for proper event naming
    "success": True,
    "message": "Successfully processed all files"
})
```

### Legacy Script Integration

**BACKWARD COMPATIBILITY: emit-event.py**

The existing `emit-event.py` script MUST continue to work:

- MCP server provides additional capabilities
- Existing agents don't need immediate migration
- Both approaches can coexist
- Gradual migration to MCP tools is preferred

### Testing Requirements

**MANDATORY: Comprehensive Testing**

All MCP functionality MUST be tested:

1. **Unit Tests**: Test individual tools and resources
2. **Integration Tests**: Test with actual event API
3. **Error Handling**: Test failure scenarios
4. **Performance Tests**: Test streaming and polling performance
5. **Connection Tests**: Test API connection handling

### Monitoring and Debugging

**MANDATORY: Observability**

The MCP server MUST provide:

- **Health Checks**: Endpoint for monitoring server health
- **Logging**: Comprehensive logging of all operations
- **Metrics**: Event processing metrics and performance data
- **Error Tracking**: Detailed error reporting and tracking

### Security Considerations

**MANDATORY: Security Best Practices**

- **Input Validation**: Validate all inputs through Pydantic models
- **No Secrets**: Never log or expose sensitive information
- **Connection Security**: Use secure connections where possible
- **Rate Limiting**: Implement appropriate rate limiting for tools

### Performance Requirements

**MANDATORY: Performance Standards**

- **Low Latency**: Tool calls should complete within 500ms
- **High Throughput**: Support multiple concurrent clients
- **Memory Efficiency**: Maintain bounded memory usage
- **Resource Cleanup**: Proper cleanup of connections and tasks

### Development Workflow

**MANDATORY: Development Process**

1. **Branch Protection**: All changes via pull requests
2. **Code Review**: Peer review required for all changes
3. **Testing**: All tests must pass before merge
4. **Documentation**: Update docs for all feature changes
5. **Versioning**: Follow semantic versioning

### Future Enhancements

**Planned Improvements**

- **Authentication**: Add authentication and authorization
- **Rate Limiting**: Implement request rate limiting
- **Metrics**: Add Prometheus/OpenTelemetry metrics
- **Clustering**: Support for multiple server instances
- **WebSocket**: Native WebSocket support for streaming

### Agent Migration Guide

**Transitioning from Scripts to MCP**

For agents currently using `emit-event.py`:

1. **Phase 1**: Add MCP client initialization
2. **Phase 2**: Replace script calls with MCP tool calls
3. **Phase 3**: Add streaming event consumption
4. **Phase 4**: Remove script dependencies

### Troubleshooting Guide

**Common Issues and Solutions**

1. **Tool Call Failures**: Check Pydantic model validation
2. **Streaming Issues**: Verify API connection and streaming task
3. **Performance Issues**: Check event buffer size and cleanup
4. **Connection Issues**: Verify EVENT_API_URL configuration

### Contact and Support

For issues with the MCP server:

1. Check server logs for error details
2. Verify configuration and environment variables  
3. Test API connectivity independently
4. Consult this documentation and README.md
5. Create issue in project repository if needed