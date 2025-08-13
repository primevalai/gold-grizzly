# Event-Emitting Agent Template

This template provides a standardized approach for creating agents that emit events during their execution flow.

## Agent Header Template

```yaml
---
name: [agent-name]
description: [Agent description and trigger conditions]
tools: Write, Read, Bash
model: sonnet
color: [color]
---
```

## Core Event Publishing Pattern

### Event Publishing Setup

Add this section to your agent documentation:

```markdown
## EVENT PUBLISHING APPROACH

Use the .claude/scripts/emit-event.py script to publish events at key stages of your work. This ensures proper event tracking throughout the process.
```

### Standard Execution Flow

Include this execution flow template and customize the event names and attributes:

```markdown
## EXECUTION FLOW

When activated, follow these steps:

### 1. EXTRACT AGENT CONTEXT
**CRITICAL FIRST STEP**: Extract the provided context IDs from the prompt:
```bash
# Extract AGENT_ID and WORKFLOW_ID from the ===AGENT_CONTEXT=== block
# The prompt will contain:
# ===AGENT_CONTEXT===
# AGENT_ID: [agentName]-1755117908-a3f2b1c8
# WORKFLOW_ID: 550e8400-e29b-41d4-a716-446655440000
# PARENT: main-claude-code
# TIMESTAMP: 2025-08-13T15:45:08Z
# ===END_CONTEXT===

# Extract the IDs (these will be used consistently across all bash executions)
AGENT_ID="[agentName]-1755117908-a3f2b1c8"  # Replace with actual extracted value
WORKFLOW_ID="550e8400-e29b-41d4-a716-446655440000"  # Replace with actual extracted value

# Emit activation event
uv run .claude/scripts/emit-event.py "agent.[agentName].activated" \
  --aggregate-id "$AGENT_ID" \
  --correlation-id "$WORKFLOW_ID" \
  --attr "trigger_context=<context>" \
  --attr "activation_reason=<reason>"
```

### 2. GATHER REQUIREMENTS
Analyze the situation and collect necessary information:
```bash
# Use the same extracted IDs
AGENT_ID="[agentName]-1755117908-a3f2b1c8"  # Same as extracted above
WORKFLOW_ID="550e8400-e29b-41d4-a716-446655440000"  # Same as extracted above

uv run .claude/scripts/emit-event.py "agent.[agentName].requirementsGathered" \
  --aggregate-id "$AGENT_ID" \
  --correlation-id "$WORKFLOW_ID" \
  --attr "requirements_count=<number>" \
  --attr "complexity_level=<simple|medium|complex>" \
  --attr "estimated_steps=<number>"
```

### 3. PREPARE ENVIRONMENT
Set up any necessary folders or check dependencies:
```bash
# Use the same extracted IDs
AGENT_ID="[agentName]-1755117908-a3f2b1c8"  # Same as extracted above
WORKFLOW_ID="550e8400-e29b-41d4-a716-446655440000"  # Same as extracted above

uv run .claude/scripts/emit-event.py "agent.[agentName].environmentPrepared" \
  --aggregate-id "$AGENT_ID" \
  --correlation-id "$WORKFLOW_ID" \
  --attr "setup_required=true/false" \
  --attr "dependencies_checked=true/false"
```

### 4. EXECUTE MAIN TASK
Perform the core functionality and emit progress events:
```bash
# Use the same extracted IDs
AGENT_ID="[agentName]-1755117908-a3f2b1c8"  # Same as extracted above
WORKFLOW_ID="550e8400-e29b-41d4-a716-446655440000"  # Same as extracted above

# At start of main work
uv run .claude/scripts/emit-event.py "agent.[agentName].workStarted" \
  --aggregate-id "$AGENT_ID" \
  --correlation-id "$WORKFLOW_ID" \
  --attr "task_type=<type>" \
  --attr "expected_duration=<estimate>"

# During key milestones
uv run .claude/scripts/emit-event.py "agent.[agentName].milestoneReached" \
  --aggregate-id "$AGENT_ID" \
  --correlation-id "$WORKFLOW_ID" \
  --attr "milestone=<description>" \
  --attr "progress_percentage=<0-100>"

# After completion
uv run .claude/scripts/emit-event.py "agent.[agentName].workCompleted" \
  --aggregate-id "$AGENT_ID" \
  --correlation-id "$WORKFLOW_ID" \
  --attr "success=true/false" \
  --attr "output_path=<path>" \
  --attr "completion_notes=<notes>"
```

### 5. FINALIZE AND REPORT
Confirm completion to the user and emit final event:
```bash
# Use the same extracted IDs
AGENT_ID="[agentName]-1755117908-a3f2b1c8"  # Same as extracted above
WORKFLOW_ID="550e8400-e29b-41d4-a716-446655440000"  # Same as extracted above

uv run .claude/scripts/emit-event.py "agent.[agentName].completed" \
  --aggregate-id "$AGENT_ID" \
  --correlation-id "$WORKFLOW_ID" \
  --attr "total_duration=<time>" \
  --attr "final_status=<status>" \
  --attr "artifacts_created=<list>"
```

## IMPORTANT: CONTEXT EXTRACTION REQUIREMENT

**CRITICAL**: The AGENT_ID and WORKFLOW_ID values shown above are examples. You MUST extract the actual values from the ===AGENT_CONTEXT=== block in your prompt. Claude Code will provide unique IDs for each invocation.

**Pattern to extract IDs:**
```bash
# Parse the context block to get actual IDs
AGENT_ID=$(echo "$PROMPT" | grep "AGENT_ID:" | cut -d' ' -f2)
WORKFLOW_ID=$(echo "$PROMPT" | grep "WORKFLOW_ID:" | cut -d' ' -f2)
```

**These IDs must be identical across ALL bash executions within this agent.**
```

## Event Naming Convention

Follow this naming pattern for your events:
- `[agentName].[actionPast]` - Use past tense verbs
- Examples:
  - `myAgent.activated`
  - `myAgent.dataProcessed`
  - `myAgent.fileCreated`
  - `myAgent.taskCompleted`

## Standard Event Attributes

Include these common attributes where applicable:

### Timing Attributes
- `timestamp` - Automatically added by emit-event.py
- `duration` - Time taken for the step
- `estimated_duration` - Expected time for longer operations

### Context Attributes
- `trigger_context` - What activated the agent
- `user_request` - The original user request
- `project_context` - Relevant project information

### Progress Attributes
- `step_number` - Current step in a multi-step process
- `total_steps` - Total number of steps expected
- `progress_percentage` - Completion percentage (0-100)

### Result Attributes
- `success` - Boolean indicating success/failure
- `error_message` - Error details if applicable
- `output_path` - Path to created files
- `artifacts_created` - List of files/items created

### Technical Attributes
- `file_count` - Number of files processed
- `file_size` - Size of files created/processed
- `complexity_level` - simple|medium|complex
- `dependencies_checked` - Whether dependencies were verified

## Error Handling Events

Include error handling events:

```bash
# When errors occur
uv run .claude/scripts/emit-event.py "[agentName].errorOccurred" --attr "error_type=<type>" --attr "error_message=<message>" --attr "recovery_attempted=true/false"

# When recovering from errors
uv run .claude/scripts/emit-event.py "[agentName].errorRecovered" --attr "recovery_method=<method>" --attr "success=true/false"
```

## Agent-Specific Customization

### Custom Event Types
Add events specific to your agent's domain:
- File processing agents: `fileRead`, `fileWritten`, `fileValidated`
- Code analysis agents: `codeScanned`, `issuesFound`, `fixesApplied`
- Documentation agents: `contentGenerated`, `formattingApplied`, `linksValidated`

### Custom Attributes
Define domain-specific attributes:
- Code agents: `language`, `lines_of_code`, `functions_found`
- File agents: `file_type`, `encoding`, `permissions`
- Network agents: `endpoint`, `status_code`, `response_time`

## Example Implementation

Here's a minimal example for a "file-processor" agent:

```markdown
### 1. ACTIVATION
```bash
uv run .claude/scripts/emit-event.py "fileProcessor.activated" --attr "file_pattern=*.py" --attr "operation=analyze"
```

### 2. FILE DISCOVERY
```bash
uv run .claude/scripts/emit-event.py "fileProcessor.filesDiscovered" --attr "file_count=15" --attr "total_size=1024000"
```

### 3. PROCESSING
```bash
uv run .claude/scripts/emit-event.py "fileProcessor.processingStarted" --attr "batch_size=5"
# Process files...
uv run .claude/scripts/emit-event.py "fileProcessor.fileProcessed" --attr "file_path=src/main.py" --attr "success=true"
```

### 4. COMPLETION
```bash
uv run .claude/scripts/emit-event.py "fileProcessor.completed" --attr "files_processed=15" --attr "errors=0" --attr "duration=30s"
```
```

## Notes

1. Always use `uv run .claude/scripts/emit-event.py` to ensure proper Python environment
2. Emit events at logical breakpoints in your workflow
3. Include relevant attributes to make events useful for monitoring and debugging
4. Use consistent naming patterns across similar agents
5. Consider the user experience - don't over-emit events that create noise
6. Events are automatically saved to `.events/YYYY-MM-DD.log` with OTEL-compatible metadata