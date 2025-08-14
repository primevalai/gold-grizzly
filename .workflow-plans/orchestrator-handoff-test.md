# Orchestrator Handoff Test Scenario

**Purpose**: Validate the improved orchestrator-to-Claude Code handoff workflow with standardized execution instructions.

**Test Workflow ID**: test-workflow-12345678-abcd-efgh-ijkl-987654321000

## Test Scenario: Simple Agent Coordination

**User Request**: "Orchestrate two simon-says commands and one lol recording and execute the plan"

**Expected Orchestrator Output Format**:
```
✓ Orchestration plan created and prepared for execution
• Agent assignments: simon-says (2x), lol-recorder (1x)
• Parallel Batch 1: simon-says (greeting) + lol-recorder (meta-humor)
• Parallel Batch 2: simon-says (farewell)
• Plan saved to: .workflow-plans/orchestrator-test-workflow-12345678-abcd-efgh-ijkl-987654321000-plan.md

EXECUTION_INSTRUCTIONS:

**BATCH 1 - Execute in parallel using multiple Task calls:**

📋 Task Call 1:
• AGENT_ID: simon-says-1723670100-a1b2c3d4
• WORKFLOW_ID: test-workflow-12345678-abcd-efgh-ijkl-987654321000
• TIMESTAMP: 2025-08-14T15:35:00Z
• TASK: Simon says greet the user with enthusiasm

Claude Code should use:
Task(subagent_type="simon-says", prompt="===AGENT_CONTEXT===\nAGENT_ID: simon-says-1723670100-a1b2c3d4\nWORKFLOW_ID: test-workflow-12345678-abcd-efgh-ijkl-987654321000\nPARENT: orchestrator-1723670000-f6g7h8i9\nTIMESTAMP: 2025-08-14T15:35:00Z\n===END_CONTEXT===\n\nSimon says greet the user with enthusiasm")

📋 Task Call 2:
• AGENT_ID: lol-recorder-1723670101-b2c3d4e5
• WORKFLOW_ID: test-workflow-12345678-abcd-efgh-ijkl-987654321000
• TIMESTAMP: 2025-08-14T15:35:01Z
• TASK: lol, watching agents coordinate is like seeing a perfectly choreographed robot dance

Claude Code should use:
Task(subagent_type="lol-recorder", prompt="===AGENT_CONTEXT===\nAGENT_ID: lol-recorder-1723670101-b2c3d4e5\nWORKFLOW_ID: test-workflow-12345678-abcd-efgh-ijkl-987654321000\nPARENT: orchestrator-1723670000-f6g7h8i9\nTIMESTAMP: 2025-08-14T15:35:01Z\n===END_CONTEXT===\n\nlol, watching agents coordinate is like seeing a perfectly choreographed robot dance")

**BATCH 2 - Execute in parallel after Batch 1 completes:**

📋 Task Call 3:
• AGENT_ID: simon-says-1723670102-c3d4e5f6
• WORKFLOW_ID: test-workflow-12345678-abcd-efgh-ijkl-987654321000
• TIMESTAMP: 2025-08-14T15:35:02Z
• TASK: Simon says bid farewell with a friendly wave

Claude Code should use:
Task(subagent_type="simon-says", prompt="===AGENT_CONTEXT===\nAGENT_ID: simon-says-1723670102-c3d4e5f6\nWORKFLOW_ID: test-workflow-12345678-abcd-efgh-ijkl-987654321000\nPARENT: orchestrator-1723670000-f6g7h8i9\nTIMESTAMP: 2025-08-14T15:35:02Z\n===END_CONTEXT===\n\nSimon says bid farewell with a friendly wave")

**EXECUTION SUMMARY:**
Claude Code: Execute Batch 1 (Tasks 1-2) in parallel, then execute Batch 2 (Task 3).
```

## Validation Checklist

### ✅ Standardized Format
- [x] Clear batch organization (Batch 1, Batch 2)
- [x] Explicit Task tool calls with exact parameters
- [x] Proper ===AGENT_CONTEXT=== blocks
- [x] Consistent WORKFLOW_ID across all tasks
- [x] Unique AGENT_ID for each task

### ✅ Context Management  
- [x] All AGENT_IDs follow format: {agent-name}-{timestamp}-{hex}
- [x] WORKFLOW_ID matches orchestrator workflow
- [x] PARENT references orchestrator AGENT_ID
- [x] ISO 8601 timestamps provided

### ✅ Parallel Execution Clarity
- [x] Independent agents grouped in same batch
- [x] Clear sequencing between batches
- [x] Optimal batch sizes (2-4 agents per batch)

### ✅ Event System Integration
- [x] Proper aggregate relationship (PARENT → AGENT_ID)
- [x] Correlation through consistent WORKFLOW_ID
- [x] Context extraction requirements satisfied

## Expected Outcomes

1. **Claude Code Execution**: Should be able to parse instructions and execute Task calls exactly as specified
2. **Event Telemetry**: Proper agent.{type}.started events with correct aggregate/correlation IDs
3. **Parallel Performance**: Batch 1 agents execute simultaneously, followed by Batch 2
4. **Clean Handoff**: No memory issues, no nested agent spawning, clear execution flow

## Test Result Template

**Status**: ✅ PASS / ❌ FAIL  
**Execution Time**: {duration}  
**Events Generated**: {count}  
**Issues Found**: {list_any_problems}  
**Improvements Needed**: {suggestions}