# Gold Grizzly Event System Architecture

## System Overview

The Gold Grizzly Event System is a comprehensive end-to-end event processing pipeline that captures events from Claude Code agents, processes them through a FastAPI backend, stores them using eventuali event sourcing, and displays them in real-time through a Next.js dashboard.

### Key Design Principles

- **Event-Driven Architecture**: Events flow from agents through multiple layers with proper separation of concerns
- **Real-Time Processing**: Server-Sent Events (SSE) provide live updates to the UI
- **Fault Tolerance**: Dual-mode event publishing with API-first and file-based fallback
- **Domain-Driven Design**: Uses eventuali for proper event sourcing and aggregate patterns
- **Developer Experience**: Automated startup with session hooks for seamless development workflow

## Event Standards & Conventions

### Event Naming Convention

All events follow a standardized naming format to ensure consistency across agents:

**Format**: `<camelCasedAgentName>.<camelCasedEventName>`

**Examples**:
- Agent: `lol-recorder` → Event prefix: `lolRecorder.*`
  - `lolRecorder.momentTriggered`
  - `lolRecorder.contextGathered` 
  - `lolRecorder.preservationComplete`
- Agent: `url-cacher` → Event prefix: `urlCacher.*`
  - `urlCacher.cacheRequested`
  - `urlCacher.downloadCompleted`

### Embedded Event Publishing Pattern

The current system uses an **embedded event publishing approach** where agents directly call `emit-event.py` at key points in their execution flow, rather than declaring events upfront. This provides:

- **Flexibility**: Events can be dynamically generated based on execution context
- **Simplicity**: No separate event schema files to maintain
- **Context-Rich**: Events include real-time execution context and metadata
- **Immediate**: Events are published as work progresses, not just at completion

### Event Categories

Events are typically categorized by their purpose in the agent workflow:
- **Trigger Events**: Agent activation (`*.momentTriggered`, `*.cacheRequested`)
- **Progress Events**: Workflow milestones (`*.contextGathered`, `*.downloadStarted`)  
- **Completion Events**: Successful outcomes (`*.preservationComplete`, `*.cacheStored`)
- **Error Events**: Failure conditions (`*.cacheFailed`, `*.processingError`)

## Architecture Components

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Agents    │───▶│ emit-event.py│───▶│  FastAPI    │───▶│   Next.js    │
│ (lol-recorder)│   │   Script     │    │   Server    │    │ Dashboard UI │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                           │                     │
                           ▼                     ▼
                   ┌──────────────┐    ┌─────────────┐
                   │ .events/     │    │ eventuali   │
                   │ fallback     │    │ EventStore  │
                   │ logs         │    │ (SQLite)    │
                   └──────────────┘    └─────────────┘
```

### 1. Agent Layer

**Location**: `.claude/agents/*.md`
**Example**: `.claude/agents/lol-recorder.md`

Agents are specialized Claude Code components that trigger on specific user interactions or conditions. They use the EVENT PUBLISHING APPROACH to emit structured events at key stages of their execution.

#### Key Features:
- **Trigger-based Activation**: Agents activate on specific phrases or conditions
- **Multi-stage Event Emission**: Events are emitted at different workflow stages
- **Comprehensive Metadata Collection**: Agents gather context, technical details, and metadata
- **Structured Documentation**: Events are logged with full situational context

#### Event Emission Pattern:
```bash
# Agent workflow stages with corresponding events
uv run .claude/scripts/emit-event.py "lolRecorder.momentTriggered" \
  --attr "trigger_phrase=<phrase>" --attr "humor_category=<category>"

uv run .claude/scripts/emit-event.py "lolRecorder.contextGathered" \
  --attr "conversation_turns=<n>" --attr "metadata_fields_collected=<n>"

uv run .claude/scripts/emit-event.py "lolRecorder.momentRecorded" \
  --attr "file_path=<path>" --attr "file_size=<bytes>"
```

### 2. Event Publishing Layer

**Location**: `.claude/scripts/emit-event.py`

The central event publishing script that provides a unified interface for all agents to emit events. It implements a dual-mode strategy for reliability.

#### Key Features:
- **Dual-Mode Operation**: Primary API submission with file-based fallback
- **OTEL Integration**: Automatic addition of OpenTelemetry trace/span metadata
- **Flexible Attribute Parsing**: Supports JSON values and simple key-value pairs
- **Error Resilience**: Graceful degradation when API is unavailable

#### Event Flow:
```python
# Primary: API submission to FastAPI server
send_to_api(event_name, attributes, timestamp)
  └─ POST http://127.0.0.1:8765/events/

# Fallback: File-based storage
save_to_file(event)
  └─ .events/{date}.log (JSONL format)
```

#### Event Output Format

The script outputs events using a structured tag format for compatibility with Claude Code hooks and event processing pipelines:

```
<EVENT>{"name": "eventName", "timestamp": "2025-08-13T12:00:00Z", "attributes": {...}}</EVENT>
```

This format ensures events can be:
- **Parsed by Hooks**: Claude Code hooks can extract events from tool output
- **Logged for Debugging**: Events are visible in console output with clear markers
- **Processed by Pipelines**: External tools can identify and extract event data

#### Event Schema:
```json
{
  "name": "event_name",
  "timestamp": "2025-08-13T12:00:00Z",
  "attributes": {"key": "value"},
  "trace_id": "hex_string",
  "span_id": "hex_string",
  "kind": "SPAN_KIND_INTERNAL",
  "status": {"code": "STATUS_CODE_OK"}
}
```

#### OpenTelemetry Integration

The script automatically enriches all events with OTEL-compliant metadata:

- **trace_id**: Unique trace identifier (32-character hex string)
- **span_id**: Unique span identifier (16-character hex string)  
- **kind**: Span kind (`SPAN_KIND_INTERNAL` for agent operations)
- **status**: Span status with code (`STATUS_CODE_OK` for successful events)

These fields enable integration with observability platforms and distributed tracing systems.

### 3. API Layer (FastAPI)

**Location**: `.apps/api/`
**Main Files**:
- `main.py` - Application setup and middleware
- `routes/events.py` - Event handling endpoints
- `dependencies/database.py` - Eventuali integration

The FastAPI server provides RESTful endpoints for event ingestion and Server-Sent Events for real-time streaming.

#### Event Processing Pipeline:

1. **Event Ingestion** (`POST /events/`)
   - Validates incoming events using Pydantic models
   - Generates unique event IDs and OTEL metadata
   - Creates Domain-Driven Design aggregates using eventuali
   - Stores events in SQLite via eventuali EventStore

2. **Event Storage** (eventuali EventStore)
   - Uses proper DDD patterns with EventAggregate
   - Implements dynamic `apply_*` methods for event types
   - Stores in SQLite database (`.events/events.db`)
   - Maintains aggregate versioning and causation tracking

3. **Event Streaming** (`GET /events/stream`)
   - Polls database every 2 seconds for new events
   - Streams events via Server-Sent Events (SSE)
   - Includes heartbeat mechanism for connection health
   - Supports error recovery and reconnection

#### Key Implementation Details:

```python
# Dynamic event handling in EventAggregate
def __getattr__(self, name: str):
    if name.startswith('apply_'):
        return self.apply_generic_event
    raise AttributeError(...)

# SSE streaming with proper event formatting
yield {
    "event": "event_created",
    "data": json.dumps(event),
    "id": event.get('event_id', ''),
}
```

#### CORS Configuration:
- Allows Next.js UI (`http://localhost:3210`)
- Supports all common HTTP methods
- Enables credentials for SSE connections

### 4. UI Layer (Next.js)

**Location**: `.apps/ui/`
**Key Components**:
- `src/components/EventStream.tsx` - Main event display component  
- `src/hooks/useEventStream.ts` - SSE connection management
- `src/components/EventList.tsx` - Event rendering
- `src/components/ConnectionStatus.tsx` - Connection health display

The Next.js dashboard provides real-time visualization of events with automatic connection management.

#### SSE Implementation:

```typescript
// Connection management with automatic reconnection
const eventSource = new EventSource(url);

eventSource.addEventListener('event_created', (event) => {
  const eventData = JSON.parse(event.data);
  setEvents(prev => [eventData, ...prev].slice(0, 1000));
});

// Heartbeat handling for connection health
eventSource.addEventListener('heartbeat', (event) => {
  setConnectionStatus(prev => ({
    ...prev,
    lastHeartbeat: new Date(heartbeatData.timestamp),
  }));
});
```

#### Key Features:
- **Real-Time Updates**: Live event streaming via SSE
- **Connection Health**: Visual indicators and automatic reconnection
- **Event Management**: Clear events, connection controls
- **Responsive Design**: Built with Shadcn/ui components
- **Performance**: Limits to 1000 most recent events

### 5. Infrastructure Layer

**Startup Automation**:
- **Session Hook** (`.claude/hooks/session-start`): Automatically starts servers when Claude Code session begins
- **Development Scripts** (`.apps/start-dev.sh`): Manual startup with proper process management
- **Individual Startup** (`.apps/api/startup.sh`): API-only startup with dependency checks

#### Process Management:
```bash
# Background process startup with logging
nohup uv run python -m uvicorn main:app --reload \
  --host 127.0.0.1 --port 8765 > ../api.log 2>&1 &

nohup bun dev > ../ui.log 2>&1 &

# PID tracking for cleanup
echo $API_PID > ../api.pid
echo $UI_PID > ../ui.pid
```

## Event Flow Walkthrough

### Complete Event Journey

1. **Agent Trigger**
   ```
   User: "lol, this bug is ridiculous!"
   └─ lol-recorder agent activates on "lol" + "ridiculous"
   ```

2. **Event Emission**
   ```bash
   uv run .claude/scripts/emit-event.py "lolRecorder.momentTriggered" \
     --attr "trigger_phrase=lol, this bug is ridiculous!" \
     --attr "humor_category=bug_frustration"
   ```

3. **Event Publishing**
   ```python
   # emit-event.py adds OTEL metadata
   event = {
     "name": "lolRecorder.momentTriggered",
     "timestamp": "2025-08-13T12:00:00Z",
     "attributes": {"trigger_phrase": "lol, this bug is ridiculous!"},
     "trace_id": "abc123...", "span_id": "def456..."
   }
   
   # Attempts API call first
   POST http://127.0.0.1:8765/events/ → Success
   ```

4. **API Processing**
   ```python
   # FastAPI receives event
   event_request = EventRequest(**event_data)
   
   # Creates aggregate and applies event
   aggregate = EventAggregate(id=uuid4())
   aggregate.add_event("lolRecorder.momentTriggered", event_data)
   
   # Stores in eventuali
   await store.save(aggregate)
   ```

5. **Database Storage**
   ```sql
   -- eventuali stores in SQLite
   INSERT INTO events (event_id, aggregate_id, event_type, data, timestamp)
   VALUES ('uuid', 'aggregate_uuid', 'lolrecorder_momenttriggered', '{}', '2025-08-13T12:00:00Z');
   ```

6. **Real-Time Streaming**
   ```python
   # SSE stream polls database every 2s
   events = await db_manager.get_recent_events(limit=50)
   
   # Streams new events to connected clients
   yield {
     "event": "event_created",
     "data": json.dumps(event_dict),
     "id": event_id
   }
   ```

7. **UI Display**
   ```typescript
   // Next.js receives SSE event
   eventSource.addEventListener('event_created', (event) => {
     const eventData = JSON.parse(event.data);
     setEvents(prev => [eventData, ...prev]);
   });
   
   // Updates UI immediately
   <EventCard event={eventData} />
   ```

### Error Handling & Fallback

If the API is unavailable:

1. **API Failure Detection**
   ```python
   # emit-event.py detects connection failure
   api_success = send_to_api(event_name, attributes, timestamp)
   if not api_success:
       print("Falling back to file storage...")
       save_to_file(event)
   ```

2. **File-Based Storage**
   ```python
   # Saves to .events/{date}.log
   events_dir = Path(".events")
   events_dir.mkdir(exist_ok=True)
   filepath = events_dir / f"{today}.log"
   
   # JSONL format for easy processing
   with open(filepath, 'a') as f:
       f.write(json.dumps(event) + '\n')
   ```

3. **UI Degradation**
   ```typescript
   // Connection status updates automatically
   eventSource.onerror = () => {
     setConnectionStatus(prev => ({
       ...prev,
       connected: false,
       error: 'Connection lost',
     }));
     
     // Automatic reconnection after 5 seconds
     setTimeout(connect, 5000);
   };
   ```

## Technical Implementation Details

### Database Design

The system uses eventuali's EventStore with SQLite backend:

```python
# EventStore initialization
db_path = Path(".events/events.db")
store = await EventStore.create(f"sqlite:///{db_path.absolute()}")

# Event retrieval with proper typing
events = await store.load_events_by_type("event_aggregate")
```

**Event Metadata Schema**:
```python
{
    'event_id': str,           # Unique event identifier
    'aggregate_id': str,       # Aggregate instance ID
    'aggregate_type': str,     # "event_aggregate"
    'event_type': str,         # Normalized event name
    'aggregate_version': int,  # Version within aggregate
    'timestamp': str,          # ISO 8601 timestamp
    'user_id': str,           # User context (optional)
    'causation_id': str,      # Causal relationship (optional)
    'correlation_id': str,    # Request correlation (optional)
    
    # OpenTelemetry fields
    'trace_id': str,          # 32-character hex trace identifier
    'span_id': str,           # 16-character hex span identifier
    'parent_span_id': str,    # Parent span ID (optional)
    'kind': str,              # Span kind (SPAN_KIND_INTERNAL, etc.)
    'status': dict,           # Status with code (STATUS_CODE_OK, etc.)
}
```

### OpenTelemetry Field Specifications

The system implements full OTEL compliance with the following field specifications:

#### Required OTEL Fields:
- **timestamp**: ISO 8601 formatted timestamp (`2025-08-13T12:00:00.000Z`)
- **trace_id**: 32-character hex string uniquely identifying the trace
- **span_id**: 16-character hex string uniquely identifying the span
- **name**: Event name following camelCase convention
- **kind**: Span kind, typically `SPAN_KIND_INTERNAL` for agent operations
- **status**: Object with `code` field (`STATUS_CODE_OK`, `STATUS_CODE_ERROR`)

#### Optional OTEL Fields:
- **parent_span_id**: Links to parent span for hierarchical tracing
- **attributes**: Key-value pairs containing event-specific metadata

### Trace Hierarchy Concept

While not fully implemented, the system is designed to support OTEL trace hierarchies:

```
Session Trace (Claude Code session)
├── Workflow Trace (logical grouping of related work)
│   ├── Agent Trace (agent invocation)  
│   │   ├── Span: agent.momentTriggered
│   │   ├── Span: agent.contextGathered
│   │   └── Span: agent.preservationComplete
│   └── Other Agent Traces...
└── Other Workflow Traces...
```

This hierarchy provides:
- **End-to-End Visibility**: Track work from user request to completion
- **Agent Correlation**: Connect related agent activities
- **Performance Analysis**: Identify bottlenecks across the system
- **Debugging Context**: Understand causal relationships between events

### SSE Protocol Implementation

**Server Side**:
```python
async def event_stream() -> AsyncGenerator[Dict[str, Any], None]:
    while True:
        # Poll for new events
        events = await db_manager.get_recent_events(limit=50)
        
        # Stream events newer than last check
        for event in events:
            if event_time > last_check:
                yield {
                    "event": "event_created",
                    "data": json.dumps(event),
                    "id": event.get('event_id', ''),
                }
        
        # Heartbeat for connection health
        yield {"event": "heartbeat", "data": json.dumps({...})}
        await asyncio.sleep(2)
```

**Client Side**:
```typescript
// Event source with proper error handling
const eventSource = new EventSource(streamUrl);

// Structured event handling
eventSource.addEventListener('event_created', handleEventCreated);
eventSource.addEventListener('heartbeat', handleHeartbeat);
eventSource.addEventListener('error', handleError);

// Automatic reconnection logic
eventSource.onerror = () => {
  setConnectionStatus({connected: false, error: 'Connection lost'});
  setTimeout(reconnect, 5000);
};
```

### CORS Configuration

```python
# FastAPI CORS setup for Next.js integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3210"],  # Next.js dev server
    allow_credentials=True,                   # Required for SSE
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## Development Workflow

### Local Development Setup

1. **Automatic Startup** (Recommended)
   ```bash
   # Session hook automatically starts both servers
   # No manual intervention required
   ```

2. **Manual Startup**
   ```bash
   # Start both servers together
   .apps/start-dev.sh
   
   # Or individually
   .apps/api/startup.sh     # API only
   cd .apps/ui && bun dev   # UI only
   ```

3. **Verification**
   ```bash
   # Check server health
   curl http://localhost:8765/health
   curl http://localhost:3210
   
   # Test event creation
   curl -X POST http://localhost:8765/events/ \
     -H 'Content-Type: application/json' \
     -d '{"name": "test_event", "attributes": {"test": true}}'
   ```

### Testing Event Flow

1. **Agent Testing**
   ```bash
   # Trigger lol-recorder agent
   # In Claude Code: "lol, this is ridiculous!"
   ```

2. **Direct Event Testing**
   ```bash
   # Manual event emission
   uv run .claude/scripts/emit-event.py "test.event" \
     --attr "source=manual_test" --attr "count=1"
   ```

3. **UI Verification**
   - Open http://localhost:3210
   - Verify connection status (green = connected)
   - Watch for real-time event appearance
   - Test connection controls (reconnect/disconnect)

### Monitoring and Debugging

**Server Logs**:
```bash
# API server logs
tail -f .apps/api.log

# UI server logs  
tail -f .apps/ui.log

# Event fallback logs
tail -f .events/$(date +%Y-%m-%d).log
```

**Process Management**:
```bash
# Check running processes
cat .apps/api.pid .apps/ui.pid

# Kill servers if needed
pkill -f "uvicorn.*main:app.*--port 8765"
pkill -f "next dev.*--port 3210"
```

**Database Inspection**:
```bash
# Connect to eventuali SQLite database
sqlite3 .events/events.db

# View events table
.schema events
SELECT * FROM events ORDER BY timestamp DESC LIMIT 10;
```

## Integration Points

### Adding New Agents

1. **Create Agent Definition** (`.claude/agents/new-agent.md`)
   ```markdown
   ---
   name: new-agent
   description: Agent description with trigger conditions
   tools: Write, Read, Bash
   ---
   
   ## EVENT PUBLISHING APPROACH
   Use .claude/scripts/emit-event.py script for event emission...
   ```

2. **Implement Event Emission Pattern**
   ```bash
   uv run .claude/scripts/emit-event.py "newAgent.eventName" \
     --attr "key=value" --attr "data={\"complex\": true}"
   ```

3. **Add Event Handlers** (Optional)
   ```python
   # In routes/events.py EventAggregate class
   def apply_new_agent_event_name(self, event: GenericEvent) -> None:
       """Handle new agent events with custom logic."""
       pass
   ```

### Extending Event Schema

1. **Update Event Models**
   ```python
   # In models/events.py
   class EventRequest(BaseModel):
       name: str
       attributes: Dict[str, Any] = {}
       custom_field: Optional[str] = None  # Add new fields
   ```

2. **Update UI Components**
   ```typescript
   // In types/events.ts
   interface EventData {
     name: string;
     attributes: Record<string, any>;
     customField?: string;  // Add new fields
   }
   ```

### Performance Considerations

- **Event Retention**: UI limits to 1000 most recent events
- **Database Cleanup**: Consider implementing event archival for long-running systems
- **Connection Limits**: SSE connections are persistent; monitor browser limits
- **Polling Frequency**: 2-second polling interval balances real-time vs. performance

### Security Considerations

- **Local Development Only**: Current CORS settings restrict to localhost
- **No Authentication**: System assumes trusted local environment
- **File System Access**: Agents write to local directories
- **Process Management**: Session hooks manage system processes

## System Benefits

The Gold Grizzly Event System delivers significant value across multiple dimensions:

### Observability
- **Complete Visibility**: Full transparency into agent operations from trigger to completion
- **Real-Time Monitoring**: Live event streams provide immediate insight into system activity
- **Historical Analysis**: Persistent event storage enables retrospective analysis and debugging
- **Performance Insights**: Event timing and metadata reveal system performance patterns

### Developer Experience
- **Enhanced Debugging**: Detailed event trails make troubleshooting agent issues straightforward
- **Development Feedback**: Real-time events provide immediate feedback during agent development
- **Context Preservation**: Events capture rich context that would otherwise be lost
- **Automated Setup**: Session hooks eliminate manual server management

### System Integration
- **Standards Compliance**: OpenTelemetry compatibility enables integration with observability platforms
- **Event-Driven Architecture**: Clean separation enables easy extension and modification
- **Flexible Publishing**: Dual-mode operation ensures events are captured even when components fail
- **Platform Agnostic**: Standards-based approach supports future platform migrations

### Analytics & Intelligence  
- **Usage Patterns**: Event data reveals how agents are actually being used
- **Performance Optimization**: Detailed metrics enable targeted system improvements
- **Behavioral Insights**: Agent interaction patterns inform UX and workflow improvements
- **Quality Assurance**: Event streams enable automated monitoring and alerting

### Reliability & Resilience
- **Fault Tolerance**: Multiple fallback mechanisms ensure events are never lost
- **Graceful Degradation**: System continues operating when individual components fail
- **Connection Recovery**: Automatic reconnection maintains real-time capabilities
- **Data Persistence**: Events are stored durably for long-term analysis

This architecture provides a robust, real-time event processing pipeline suitable for development environments with clear extension points for production deployment.