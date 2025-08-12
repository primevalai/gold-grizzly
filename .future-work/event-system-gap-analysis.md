# Event System Gap Analysis

## Overview

This document provides a comprehensive analysis of the current state of the Orchestrator Eventing System implementation and identifies the gaps that need to be addressed to achieve the vision outlined in `.working/eventing-system.md`.

## Current State Analysis

### ✅ What's Working

1. **Claude Code Hook System**
   - **Status**: ✅ Fully Operational
   - **Evidence**: Comprehensive hook logs in `.logs/2025-08-12_log.txt`
   - **Coverage**: All hook events (`PostToolUse`, `Notification`, `Stop`, `SubagentStop`) are captured
   - **Data Quality**: Complete JSON payloads including tool inputs, outputs, session context, and timing
   - **Implementation**: `.claude/scripts/log_all_hooks.py` with enhanced logging format

2. **Agent Event Declarations** 
   - **Status**: ✅ Specification Complete
   - **Evidence**: `.claude/agents/url-cacher.md` contains detailed event schema
   - **Coverage**: 7 distinct events defined (`cacheRequested`, `urlValidated`, `cacheCheckStarted`, etc.)
   - **Schema**: OTEL-compliant event structure with required attributes
   - **Format**: XML-based event declarations with type definitions

3. **Eventing System Architecture Design**
   - **Status**: ✅ Specification Complete
   - **Evidence**: `.working/eventing-system.md` provides complete architectural blueprint
   - **Scope**: OTEL-compliant, multi-sink, trace-hierarchical design
   - **Integration**: Defined hook integration points and event publishing format

### ❌ What's Missing

1. **Agent Event Publishing Implementation**
   - **Gap**: Agents are NOT publishing `<EVENT>` markers during execution
   - **Evidence**: Zero `<EVENT>` markers found in all log files
   - **Impact**: No events are being generated despite comprehensive hook coverage
   - **Expected Format**: `<EVENT>{"name": "urlCacher.cacheRequested", "timestamp": "...", "attributes": {...}}</EVENT>`

2. **Event Publisher Script**
   - **Gap**: No `event-publisher.py` script exists
   - **Expected Location**: Root directory (`./event-publisher.py`)
   - **Purpose**: Parse `<EVENT>` markers from hook stdin and publish to sinks
   - **Dependencies**: Should use `uv run` for execution

3. **Event Processing Integration**
   - **Gap**: No hook configuration to trigger event processing
   - **Current**: Hooks only trigger `log_all_hooks.py`
   - **Needed**: Additional hook to trigger `event-publisher.py` for Task tool usage
   - **Format**: Hook should match "Task" tool and execute event publisher

4. **Event Storage Infrastructure**
   - **Gap**: No `.events/` directory exists
   - **Purpose**: Filesystem sink for processed events
   - **Format**: JSON files with naming pattern `<timestamp>-<event-name>-<event-id>.json`

## Technical Gap Details

### 1. Agent Event Publishing Gap

**Current Behavior**: 
- url-cacher agent executes successfully
- Agent produces text responses but no structured events
- Hook system captures agent output but finds no `<EVENT>` markers

**Required Implementation**:
- Agents must output `<EVENT>` markers to stdout during execution
- Events must include OTEL-compliant structure (timestamp, trace_id, span_id, etc.)
- Event publishing must occur at specific workflow steps as documented

**Example Missing Output**:
```
<EVENT>{"name": "urlCacher.cacheRequested", "timestamp": "2025-08-12T16:30:00.000Z", "attributes": {"url": "https://docs.astral.sh/uv/", "cache_path": ".metadata/cache/docs-astral-sh/uv/"}}</EVENT>
```

### 2. Event Publisher Script Gap

**Required Functionality**:
- Read JSON from stdin (hook data)
- Parse tool responses for `<EVENT>` markers
- Extract and validate event JSON
- Enrich with OTEL trace context
- Write to filesystem sink (`.events/` directory)
- Handle multiple events per tool execution

**Dependencies**:
- Python script executable via `uv run`
- JSON parsing and validation
- Filesystem I/O for event storage
- Error handling for malformed events

### 3. Hook Integration Gap

**Current Configuration** (`.claude/settings.local.json`):
```json
"PostToolUse": [
  {
    "matcher": "*",
    "hooks": [{"type": "command", "command": "uv run .claude/scripts/log_all_hooks.py"}]
  }
]
```

**Required Addition**:
```json
"PostToolUse": [
  {
    "matcher": "Task",
    "hooks": [{"type": "command", "command": "uv run event-publisher.py"}]
  }
]
```

### 4. Event Storage Gap

**Missing Infrastructure**:
- `.events/` directory for filesystem sink
- Event file naming convention implementation
- Event deduplication logic
- Storage cleanup/rotation policies

## Root Cause Analysis

### Primary Issue: Agent Implementation Gap
The core issue is that while the eventing system architecture is well-designed and the hook system is functional, **no agents are actually implementing event publishing**. The url-cacher agent has event declarations but doesn't emit events during execution.

### Secondary Issues:
1. **No Event Processing Pipeline**: Even if events were published, there's no infrastructure to process them
2. **Missing Integration Layer**: Hook system captures data but doesn't trigger event processing
3. **No Event Storage**: No destination for processed events

## Implementation Roadmap

### Phase 1: Event Processing Infrastructure (High Priority)
1. **Create `event-publisher.py` script**
   - Parse hook stdin for `<EVENT>` markers
   - Validate event JSON structure
   - Write events to `.events/` directory
   - Add error handling and logging

2. **Update hook configuration**
   - Add Task-specific hook for event publishing
   - Maintain existing logging hooks
   - Test hook execution order

3. **Create event storage infrastructure**
   - Create `.events/` directory
   - Implement file naming convention
   - Add basic rotation/cleanup

### Phase 2: Agent Event Publishing (Critical Path)
1. **Implement event publishing in url-cacher agent**
   - Add event emission at each workflow step
   - Include proper OTEL fields (trace_id, span_id, etc.)
   - Test with actual URL caching operations

2. **Validate end-to-end event flow**
   - Execute url-cacher agent
   - Verify events appear in `.events/` directory
   - Confirm event structure matches schema

### Phase 3: Enhancement and Expansion
1. **Add OTEL trace context management**
   - Generate proper trace/span IDs
   - Implement trace hierarchy
   - Add parent/child span relationships

2. **Expand to other agents**
   - Apply event publishing pattern to other agents
   - Validate event schemas
   - Test multi-agent workflows

### Phase 4: Advanced Features
1. **Additional event sinks**
   - OTEL collector integration
   - External observability platforms
   - Real-time event streaming

2. **Event analysis tools**
   - Query and filtering capabilities
   - Performance analytics
   - Debugging utilities

## Risks and Mitigation

### Risk 1: Agent Modification Complexity
- **Risk**: Modifying agent behavior might introduce bugs
- **Mitigation**: Implement event publishing as non-blocking operations
- **Fallback**: Ensure agents work even if event publishing fails

### Risk 2: Performance Impact
- **Risk**: Event publishing might slow down agent execution
- **Mitigation**: Asynchronous event writing, minimal JSON processing
- **Monitoring**: Track event publishing overhead

### Risk 3: Event Volume
- **Risk**: High-frequency events might overwhelm storage
- **Mitigation**: Implement sampling, filtering, and rotation policies
- **Monitoring**: Track event volume and storage usage

## Success Criteria

### Minimum Viable Implementation
1. ✅ url-cacher agent publishes all 7 defined events
2. ✅ Events appear in `.events/` directory with correct structure
3. ✅ Hook system triggers event processing for Task tools
4. ✅ No impact on existing agent functionality

### Complete Implementation
1. ✅ All agents participate in eventing system
2. ✅ OTEL-compliant trace context management
3. ✅ Multiple event sinks operational
4. ✅ Event querying and analysis tools available

## Next Steps

1. **Immediate (Day 1)**: Implement `event-publisher.py` script
2. **Short-term (Week 1)**: Add event publishing to url-cacher agent
3. **Medium-term (Month 1)**: Complete OTEL compliance and expand to other agents
4. **Long-term (Quarter 1)**: Advanced sinks and analysis tools

## References

- **Architecture**: `.working/eventing-system.md`
- **Agent Events**: `.claude/agents/url-cacher.md` (lines 60-133)
- **Hook Logs**: `.logs/2025-08-12_log.txt`
- **Hook Config**: `.claude/settings.local.json` (lines 10-55)

---

*Analysis completed: 2025-08-12*  
*Status: Implementation-ready gaps identified*