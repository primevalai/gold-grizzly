# Section 1.1 - Handler Pooling Implementation Plan

## Overview
Replace the current subprocess spawning approach with a persistent handler pool that maintains warm Claude Code instances, dramatically reducing invocation overhead from ~1s+ to <100ms.

## Current State Analysis
- **Problem**: Each event handler invocation spawns a new Claude Code subprocess (300s timeout)
- **Impact**: High latency (~1s+ per invocation), high resource overhead
- **Location**: `.apps/listener/main.py` lines 323-394 (`_invoke_event_handler` method)

## Implementation Steps

### 1. Create HandlerPool Class (`.apps/listener/handler_pool.py`)

```python
class HandlerPool:
    def __init__(self, pool_size: int = 3, project_root: str = None):
        """Initialize pool with configurable size"""
        
    async def start(self):
        """Start all pool workers"""
        
    async def execute(self, handler_name: str, event: Dict) -> Dict:
        """Execute handler with event, returns result"""
        
    async def health_check(self):
        """Verify all workers are responsive"""
        
    async def scale(self, new_size: int):
        """Scale pool up or down based on load"""
        
    async def shutdown(self):
        """Gracefully terminate all workers"""
```

Key features:
- Maintain N persistent Claude Code processes using asyncio subprocess
- Use stdin/stdout pipes with JSON-RPC protocol for communication
- Track worker status: `idle`, `busy`, `failed`
- Queue requests when all workers are busy

### 2. JSON-RPC Communication Protocol

```python
# Request format (to Claude Code)
{
    "jsonrpc": "2.0",
    "method": "execute_handler",
    "params": {
        "handler_name": "workflow.saySomethingNiceRequested-handler",
        "event": {...}
    },
    "id": "req-123"
}

# Response format (from Claude Code)
{
    "jsonrpc": "2.0",
    "result": {
        "success": true,
        "output": "...",
        "stderr": "..."
    },
    "id": "req-123"
}
```

### 3. Worker Process Management

Each worker:
- Starts Claude Code in interactive mode with `--no-warnings` flag
- Maintains persistent connection via pipes
- Handles one request at a time
- Auto-restarts on failure

### 4. Update EventOrchestrator (`main.py`)

```python
class EventOrchestrator:
    def __init__(self, verbosity: int = 0):
        # ... existing code ...
        self.handler_pool = HandlerPool(
            pool_size=int(os.getenv("HANDLER_POOL_SIZE", "3")),
            project_root=str(Path(__file__).parent.parent.parent)
        )
    
    async def start(self):
        # Initialize pool on startup
        await self.handler_pool.start()
        # ... existing code ...
        
    async def _invoke_event_handler(self, handler_name: str, event: Dict[str, Any]):
        # Replace subprocess.run with pool execution
        result = await self.handler_pool.execute(handler_name, event)
        # ... process result ...
```

### 5. Health Monitoring & Auto-scaling

```python
class PoolMonitor:
    async def monitor_loop(self):
        """Background task that monitors pool health"""
        while True:
            # Check worker health every 30 seconds
            await self.pool.health_check()
            
            # Auto-scale based on queue depth
            queue_depth = len(self.pool.request_queue)
            if queue_depth > 10 and self.pool.size < 10:
                await self.pool.scale(self.pool.size + 1)
            elif queue_depth == 0 and self.pool.size > 3:
                await self.pool.scale(self.pool.size - 1)
                
            await asyncio.sleep(30)
```

## File Changes Summary

### New Files:
1. `.apps/listener/handler_pool.py` (~250 lines)
   - HandlerPool class
   - Worker management
   - Request queuing
   - Health checks

### Modified Files:
1. `.apps/listener/main.py` (~50 line changes)
   - Initialize HandlerPool in `__init__`
   - Start pool in `start()`
   - Replace subprocess.run in `_invoke_event_handler`
   - Shutdown pool in cleanup

## Testing Strategy

1. **Unit Tests** (if test framework exists):
   - Test pool initialization
   - Test request queuing
   - Test worker failure recovery
   - Test auto-scaling

2. **Integration Testing**:
   - Run existing "say something nice" workflow
   - Verify handler execution works
   - Check performance improvement
   - Test concurrent handler execution

3. **Performance Validation**:
   - Measure baseline: Current subprocess approach (~1s+)
   - Measure optimized: Pool approach (target <100ms)
   - Test with varying load levels

## Success Metrics

- ✅ Handler invocation latency < 100ms
- ✅ Zero subprocess spawning per event
- ✅ Automatic recovery from worker failures
- ✅ Clean shutdown without orphaned processes
- ✅ Queue depth monitoring and auto-scaling
- ✅ No changes required to existing event handlers

## Risk Mitigation

1. **Risk**: Claude Code might not support persistent interactive mode
   - **Mitigation**: Test interactive mode first, fallback to subprocess if needed

2. **Risk**: Memory leaks in long-running processes
   - **Mitigation**: Implement worker recycling after N requests

3. **Risk**: Deadlocks in request queuing
   - **Mitigation**: Add request timeouts and queue overflow handling

## Implementation Order

1. Create basic HandlerPool with single worker
2. Test with simple handler invocation
3. Add multi-worker support
4. Implement request queuing
5. Add health checks
6. Implement auto-scaling
7. Update main.py to use pool
8. Test and optimize

## Environment Variables

- `HANDLER_POOL_SIZE`: Initial pool size (default: 3)
- `HANDLER_POOL_MAX`: Maximum pool size (default: 10)
- `HANDLER_POOL_MIN`: Minimum pool size (default: 1)
- `HANDLER_REQUEST_TIMEOUT`: Request timeout in seconds (default: 300)