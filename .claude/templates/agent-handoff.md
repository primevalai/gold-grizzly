# Agent Handoff Template

## Handoff From: {source_agent}
## Handoff To: {target_agent}
## Workflow ID: {workflow_id}
## Timestamp: {timestamp}

---

## Context Summary

### Original Request
{user_request}

### Current Status
- Workflow Phase: {phase}
- Progress: {progress}%
- Blocking Issues: {blockers}

### Completed Work
{completed_items}

### Pending Work
{pending_items}

---

## Architectural Context

### Key Decisions
{architectural_decisions}

### Technology Stack
{tech_stack}

### System Boundaries
{boundaries}

---

## Planning Context

### Current Sprint/Iteration
{current_sprint}

### Task Dependencies
{dependencies}

### Priority Items
{priorities}

---

## Technical Context

### Repository State
- Branch: {branch}
- Latest Commit: {commit_hash}
- Modified Files: {modified_files}

### Test Status
- Unit Tests: {unit_test_status}
- Integration Tests: {integration_test_status}
- Coverage: {coverage}%

---

## Artifacts

### Created Artifacts
{created_artifacts}

### Required Artifacts
{required_artifacts}

---

## Next Steps for {target_agent}

### Primary Objective
{primary_objective}

### Specific Tasks
1. {task_1}
2. {task_2}
3. {task_3}

### Success Criteria
- [ ] {criterion_1}
- [ ] {criterion_2}
- [ ] {criterion_3}

### Constraints
- {constraint_1}
- {constraint_2}

---

## Communication Protocol

### Status Updates
- Frequency: {update_frequency}
- Channel: Journal entry to .journal/{workflow_id}.jsonl

### Issue Escalation
- Blocking Issues: Immediate handoff back to system-orchestrator
- Quality Issues: Invoke evaluator-agent
- Technical Debt: Document in planning/technical-debt.md

---

## Workflow Context for Journal

```json
{
  "workflow_id": "{workflow_id}",
  "agent_id": "{target_agent}-{uuid}",
  "parent_agent_id": "{source_agent}-{uuid}",
  "handoff_timestamp": "{timestamp}",
  "phase": "{phase}",
  "context": {context_object}
}
```

---

**Remember**: This handoff represents a critical transition in the workflow. Ensure all context is preserved and the receiving agent has everything needed to continue the work seamlessly.