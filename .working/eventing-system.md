# Orchestrator Eventing System

## Overview

The Orchestrator Eventing System provides OpenTelemetry-compliant event publishing for all Claude Code agents. Every agent MUST participate in the eventing system by publishing semantic events that represent meaningful operations and outcomes.

## Architecture

```
Agent Execution → Structured Event Output → CC Hook → Event Publisher → Event Sinks
                                              ↓
                                       event-publisher.py (uv)
                                              ↓
                                       .events/*.json (filesystem sink)
                                       [future: OTEL collector, etc.]
```

### Components

1. **Agents**: Claude Code agents in `.claude/agents/` that output structured events
2. **Event Publisher**: Python script (`event-publisher.py`) triggered by CC hooks
3. **Event Sinks**: Configurable destinations for events (filesystem, OTEL collectors, etc.)

## Event Structure

### Naming Convention
Events follow the format: `<camelCasedAgentName>.<camelCasedEventName>`

**Examples:**
- Agent: `url-cacher` → Event: `urlCacher.cacheRequested`
- Agent: `data-processor` → Event: `dataProcessor.processingCompleted`

### OTEL Compliance
All events must include required OpenTelemetry fields:

```json
{
  "timestamp": "2024-01-15T14:30:00.000Z",
  "trace_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "span_id": "q1r2s3t4u5v6w7x8",
  "parent_span_id": "y1z2a3b4c5d6e7f8",
  "name": "urlCacher.cacheRequested",
  "kind": "SPAN_KIND_INTERNAL",
  "status": {
    "code": "STATUS_CODE_OK"
  },
  "attributes": {
    "agent.name": "url-cacher",
    "agent.version": "1.0.0",
    "url": "https://docs.anthropic.com/en/docs/claude-code/hooks",
    "cache_path": ".metadata/cache/docs-anthropic-com/en/docs/claude-code/hooks"
  }
}
```

### Trace Hierarchy

```
Session Trace (user interaction)
├── Workflow Trace (logical grouping of related work)
│   ├── Agent Trace (agent invocation)  
│   │   ├── Span: operation-step-1
│   │   ├── Span: operation-step-2
│   │   └── Span: operation-step-3
│   └── Other Agent Traces...
└── Other Workflow Traces...
```

## Agent Event Declaration

Agents declare their events in their `.claude/agents/<agent-name>.md` file using XML:

```xml
<events>
<event name="cacheRequested" type="info">
  <description>URL cache operation initiated</description>
  <attributes>
    <attribute name="url" type="string" required="true"/>
    <attribute name="cache_path" type="string" required="true"/>
    <attribute name="user_context" type="string" required="false"/>
  </attributes>
</event>

<event name="cacheCompleted" type="info">
  <description>URL successfully cached to filesystem</description>
  <attributes>
    <attribute name="url" type="string" required="true"/>
    <attribute name="cache_path" type="string" required="true"/>
    <attribute name="content_size" type="integer" required="true"/>
    <attribute name="download_duration_ms" type="integer" required="true"/>
  </attributes>
</event>

<event name="cacheFailed" type="error">
  <description>URL caching operation failed</description>
  <attributes>
    <attribute name="url" type="string" required="true"/>
    <attribute name="error_type" type="string" required="true"/>
    <attribute name="error_message" type="string" required="true"/>
    <attribute name="retry_count" type="integer" required="false"/>
  </attributes>
</event>
</events>
```

## Agent Event Publishing

### Event Output Format
Agents publish events by writing structured JSON to stdout with special markers:

```
<EVENT>{"name": "urlCacher.cacheRequested", "timestamp": "2024-01-15T14:30:00.000Z", "attributes": {"url": "https://example.com"}}</EVENT>
```

### Example Implementation (url-cacher)

The `url-cacher` agent publishes these events during execution:

1. **urlCacher.cacheRequested** - When cache operation starts
2. **urlCacher.urlValidated** - After URL parsing/validation
3. **urlCacher.cacheCheckStarted** - Before checking existing cache
4. **urlCacher.cacheFound** - If cache exists and is fresh (< 24hrs)
5. **urlCacher.downloadStarted** - If download needed
6. **urlCacher.downloadCompleted** - After successful download
7. **urlCacher.cacheStored** - After writing to filesystem
8. **urlCacher.cacheFailed** - If any step fails

**Agent Results vs Events:**
- **Agent Result**: Single JSON response (`url-cached`, `url-already-cached`, `url-cache-failed`)
- **Events**: Multiple granular events published throughout execution

## Claude Code Hook Integration

### Hook Configuration
Add to Claude Code settings:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "uv run event-publisher.py"
          }
        ]
      }
    ]
  }
}
```

### Event Publisher Script
The `event-publisher.py` script:

1. Receives tool output via stdin (JSON format)
2. Parses event markers: `<EVENT>...</EVENT>`
3. Enriches events with OTEL trace context
4. Publishes to configured sinks

## Event Sinks

### Filesystem Sink
Events written to `.events/` directory:

**Filename Format:** `<iso8601-utc-slug>-<event-name>-<event-id>.json`

**Example:** `2024-01-15t143000000z-urlcacher-cacherequested-a1b2c3d4.json`

### Future Sinks
- OTEL Collector (OTLP/HTTP, OTLP/gRPC)
- Message queues (Kafka, RabbitMQ)
- Observability platforms (Jaeger, Zipkin, DataDog)

## url-cacher Agent Example

### Agent File Structure
`.claude/agents/url-cacher.md`:

```markdown
# URL Cacher Agent

<eventing-system>
<events>
<event name="cacheRequested" type="info">
  <description>URL cache operation initiated</description>
  <attributes>
    <attribute name="url" type="string" required="true"/>
    <attribute name="cache_path" type="string" required="true"/>
  </attributes>
</event>
<!-- Additional events... -->
</events>
</eventing-system>


## Description
Downloads URL content using Playwright MCP server with headless browser for reference information.

## Storage Pattern
Content stored in `.metadata/cache/<tld-slug>/path/structure/`

**Example:** `https://docs.anthropic.com/en/docs/claude-code/hooks` 
→ `.metadata/cache/docs-anthropic-com/en/docs/claude-code/hooks/`

## Cache Management
- Last-updated file: `.last-updated-<iso8601-slug>`
- Cache TTL: 24 hours
- Refresh pattern: purge-and-reload on cache miss

## Usage
- Slash command: `/cache-url <URL>`
- Proactive trigger: "cache the https://example.com ..."
```

### Example Event Flow

```
User: "cache the https://docs.anthropic.com/hooks"

1. <EVENT>{"name": "urlCacher.cacheRequested", "attributes": {"url": "https://docs.anthropic.com/hooks", "cache_path": ".metadata/cache/docs-anthropic-com/hooks"}}</EVENT>

2. <EVENT>{"name": "urlCacher.urlValidated", "attributes": {"url": "https://docs.anthropic.com/hooks", "tld": "docs.anthropic.com", "path_segments": ["hooks"]}}</EVENT>

3. <EVENT>{"name": "urlCacher.cacheCheckStarted", "attributes": {"cache_path": ".metadata/cache/docs-anthropic-com/hooks"}}</EVENT>

4a. <EVENT>{"name": "urlCacher.cacheFound", "attributes": {"cache_age_hours": 12, "last_updated": "2024-01-15T02:30:00.000Z"}}</EVENT>

OR

4b. <EVENT>{"name": "urlCacher.downloadStarted", "attributes": {"url": "https://docs.anthropic.com/hooks", "user_agent": "Playwright/1.40.0"}}</EVENT>

5b. <EVENT>{"name": "urlCacher.downloadCompleted", "attributes": {"content_size": 45123, "download_duration_ms": 2341}}</EVENT>

6b. <EVENT>{"name": "urlCacher.cacheStored", "attributes": {"file_path": ".metadata/cache/docs-anthropic-com/hooks/index.html", "last_updated_file": ".last-updated-2024-01-15t143000000z"}}</EVENT>
```

## Implementation Roadmap

1. **Phase 1**: Basic filesystem sink with event-publisher.py
2. **Phase 2**: Agent event declaration parsing and validation
3. **Phase 3**: OTEL trace context management
4. **Phase 4**: Additional sinks (OTEL collector, etc.)
5. **Phase 5**: Event querying and analysis tools

## Benefits

- **Observability**: Full visibility into agent operations
- **Debugging**: Detailed event trails for troubleshooting
- **Analytics**: Data for performance optimization
- **Integration**: OTEL compliance enables ecosystem integration
- **Reliability**: Events published regardless of agent success/failure