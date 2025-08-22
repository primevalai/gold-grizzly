# CLAUDE.md - Listener Module

## Project Information

This file contains Listener-specific project information and context for Claude Code within the gold-grizzly/.apps/listener module.

## Module Purpose

The Listener is an autonomous event stream orchestrator that:
- Continuously streams events from the MCP eventuali server
- Analyzes event patterns to determine needed work
- Orchestrates Claude Code agent invocations
- Manages work queues and task priorities

**Architecture Type**: Pure asyncio event loop service (NOT a web server)

## Critical Directives

### Async-First Development

**MANDATORY: Pure asyncio Architecture**

This module is fundamentally different from the API module:
- **NO FastAPI or web framework dependencies**
- **Use pure asyncio** for all concurrent operations
- **Event-driven architecture** with continuous stream processing
- **Long-running daemon process** that never terminates normally

### Code Organization Requirements

Following the same standards as the API module but adapted for stream processing:

- **Type Hints**: All function signatures must include type hints
- **Pydantic Models**: Use for all event data validation
- **Module Structure**: Organize code following asyncio best practices:
  - `core/` - Main orchestrator and processor classes
  - `models/` - Event and work item data structures
  - `handlers/` - Agent invocation and pool management
  - `services/` - Supporting services (dedup, batching, etc.)
  - `dependencies/` - Configuration and shared dependencies

### Modern Python Project Standards (PEP 420 Compliance)

**MANDATORY: No Legacy __init__.py Files**

- **DO NOT** create `__init__.py` files in directories
- **Exception**: Only create `__init__.py` if you need to execute initialization code
- **Clean Imports**: Rely on implicit namespace packages

### Event Processing Standards

**MANDATORY: Robust Event Handling**

- **Graceful Error Recovery**: Never let a single event failure crash the service
- **Idempotent Processing**: Handle duplicate events gracefully
- **Backpressure Management**: Handle fast event streams without memory bloat
- **Clean Shutdown**: Properly handle SIGINT/SIGTERM for graceful termination

### Dependencies

**Core Runtime Dependencies:**
- `httpx` - For API communication with eventuali server
- `pydantic` - For event data validation and models
- `aiofiles` - For async file operations (logging, persistence)

**Development Dependencies:**
- `pytest` and `pytest-asyncio` - For async testing
- `black`, `flake8`, `pydocstyle` - For code quality

### Agent Invocation Protocol

**MANDATORY: Context Generation for All Agent Calls**

When invoking Claude Code agents, you MUST:
1. Generate unique AGENT_ID using `.claude/scripts/generate-uuid.sh`
2. Use or generate WORKFLOW_ID for correlation
3. Include full context block in agent prompts
4. Emit proper agent lifecycle events

Example:
```python
agent_id = await generate_agent_id("handler-name")
workflow_id = current_workflow_id or await generate_workflow_id()

context = f"""===AGENT_CONTEXT===
AGENT_ID: {agent_id}
WORKFLOW_ID: {workflow_id}
PARENT: listener-orchestrator
TIMESTAMP: {datetime.now().isoformat()}
===END_CONTEXT===

{handler_prompt}"""
```

### Performance Considerations

**MANDATORY: Stream Processing Optimizations**

- **Use asyncio.Queue** for internal event buffering
- **Implement backpressure** to avoid memory growth
- **Pool connections** to the API server with httpx
- **Batch similar operations** where possible
- **Monitor memory usage** in long-running processes

### Error Handling Strategy

**MANDATORY: Resilient Error Recovery**

- **Catch and log all exceptions** - never let the stream processor crash
- **Implement retry logic** with exponential backoff
- **Dead letter queues** for persistently failing events
- **Health monitoring** with periodic self-checks
- **Graceful degradation** when dependencies are unavailable

### Development Workflow

**Pre-Development Checklist:**
1. ✅ No unnecessary `__init__.py` files
2. ✅ Clean working directory (no `__pycache__/`)
3. ✅ All new code follows async patterns
4. ✅ Event handling is resilient and idempotent
5. ✅ Agent invocations include proper context

### Testing Strategy

**MANDATORY: Async Testing Patterns**

- **Use pytest-asyncio** for all async tests
- **Mock external dependencies** (API server, Claude Code)
- **Test error conditions** extensively
- **Verify graceful shutdown** behavior
- **Load testing** for stream processing performance

### Configuration Management

**Environment Variables:**
- `LISTENER_API_URL`: Eventuali server URL (default: http://127.0.0.1:8765)
- `LISTENER_VERBOSITY`: Debug level 0-3 (default: 0)
- `LISTENER_POLL_INTERVAL`: Stream polling interval in seconds (default: 2)
- `LISTENER_MAX_RETRIES`: Max retries for failed operations (default: 3)
- `LISTENER_SHUTDOWN_TIMEOUT`: Graceful shutdown timeout (default: 30)

## Architecture Notes

This module is designed for:
1. **Continuous operation** - runs 24/7 without restarts
2. **High reliability** - recovers from any error condition
3. **Extensibility** - ready for handler pooling and event prioritization
4. **Observability** - comprehensive logging and metrics
5. **Resource efficiency** - minimal memory and CPU footprint

The structure supports the planned enhancements from the improvement roadmap while maintaining clean separation of concerns and testability.