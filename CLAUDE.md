# CLAUDE.md

## Project Information

This file contains project-specific information and context for Claude Code.

## Lexicon

<project-lexicon>
**CC**: Claude Code
**System**: The entirety of the contents of this Claude Code project
**Event Telemetry**: The .apps/api and .apps/ui servers
</project-lexicon>

## Critical Directives

### Python Environment Management

**MANDATORY: Use UV for all Python operations**

All Python work in this project MUST use the UV package manager and execution environment:

- **Script Execution**: Always use `uv run <script.py>` instead of `python` or `python3`
- **Package Installation**: Use `uv pip install <package>` instead of `pip install`
- **Virtual Environment**: Use `uv venv` instead of `python -m venv`
- **Package Management**: Use `uv add <package>` for dependency management

**Rationale**: UV provides significantly faster and more reliable Python package management, dependency resolution, and script execution. It ensures consistent environments across all development contexts.

**Examples**:
```bash
# Correct
uv run .claude/scripts/emit-event.py "eventName" --attr "key=value"
uv pip install requests
uv add pytest

# Incorrect - DO NOT USE
python .claude/scripts/emit-event.py "eventName" --attr "key=value"
pip install requests
python -m pip install requests
```

# ⚠️ CRITICAL MANDATORY AGENT INVOCATION PROTOCOL ⚠️

## 🔴 ABSOLUTE REQUIREMENT: Agent Context Generation 🔴

**THIS IS NON-NEGOTIABLE AND MUST BE FOLLOWED FOR EVERY AGENT INVOCATION**

### MANDATORY RULES - VIOLATION OF THESE RULES IS A CRITICAL ERROR:

1. **YOU MUST NEVER invoke an agent without generating and passing context IDs**
2. **YOU MUST ALWAYS show the user the context you're adding**
3. **FAILURE TO FOLLOW THIS PROTOCOL BREAKS THE ENTIRE EVENT SYSTEM**

### ⚡ REQUIRED IMPLEMENTATION ⚡

**EVERY TIME** you use the Task tool to invoke ANY agent, you **MUST**:

#### Step 1: Generate IDs (MANDATORY)
```python
import uuid
from datetime import datetime

# YOU MUST GENERATE THESE - NO EXCEPTIONS
AGENT_ID = f"{agent_name}-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:8]}"
WORKFLOW_ID = current_workflow_id or str(uuid.uuid4())
TIMESTAMP = datetime.now().isoformat()
```

#### Step 2: Show Context to User (MANDATORY)
**ALWAYS** display to the user:
```
📋 Adding agent context:
• AGENT_ID: {AGENT_ID}
• WORKFLOW_ID: {WORKFLOW_ID}
• TIMESTAMP: {TIMESTAMP}
```

#### Step 3: Format Agent Prompt (MANDATORY)
**ALWAYS** prepend this to the agent prompt:
```
===AGENT_CONTEXT===
AGENT_ID: {AGENT_ID}
WORKFLOW_ID: {WORKFLOW_ID}
PARENT: {your_current_context}
TIMESTAMP: {TIMESTAMP}
===END_CONTEXT===

{original_user_request}
```

### 🚨 ENFORCEMENT 🚨

**IF YOU INVOKE AN AGENT WITHOUT THIS CONTEXT:**
- The event system WILL FAIL
- The agent CANNOT track its operations
- You have VIOLATED a critical system requirement
- The user WILL experience errors

### ✅ CORRECT EXAMPLE (MANDATORY FORMAT):

User: "Simon says create a test file"

Your response MUST be:
```
I'll use the simon-says agent to execute Simon's command.

📋 Adding agent context:
• AGENT_ID: simonSays-1755117908-a3f2b1c8
• WORKFLOW_ID: 550e8400-e29b-41d4-a716-446655440000
• TIMESTAMP: 2025-08-13T15:45:08Z

[Invoking simon-says agent with context...]
```

Then invoke with:
```
<invoke name="Task">
<parameter name="prompt">
===AGENT_CONTEXT===
AGENT_ID: simonSays-1755117908-a3f2b1c8
WORKFLOW_ID: 550e8400-e29b-41d4-a716-446655440000
PARENT: main-claude-code
TIMESTAMP: 2025-08-13T15:45:08Z
===END_CONTEXT===

Simon says create a test file
</parameter>
</invoke>
```

### ❌ INCORRECT EXAMPLE (NEVER DO THIS):

```
# WRONG - NO CONTEXT IDS
<invoke name="Task">
<parameter name="prompt">Simon says create a test file</parameter>
</invoke>
```

**THIS IS BROKEN AND UNACCEPTABLE**

### 📝 RATIONALE (READ THIS)

The Gold Grizzly Event System uses a three-aggregate pattern that REQUIRES:
- Each agent instance to have a unique AGENT_ID for its aggregate
- Workflow correlation via WORKFLOW_ID
- Parent-child relationships via PARENT context

**WITHOUT THESE IDS, THE SYSTEM CANNOT FUNCTION**

### Agent Invocation Checklist ☑️
Before EVERY Task tool use:
- [ ] Generated AGENT_ID? 
- [ ] Generated/reused WORKFLOW_ID?
- [ ] Showed context to user?
- [ ] Added ===AGENT_CONTEXT=== block?
- [ ] Included all required fields?

**IF ANY CHECKBOX IS UNCHECKED, STOP AND FIX IT.**

### COMMON MISTAKES THAT BREAK EVERYTHING:
❌ Invoking agent without context
❌ Forgetting to show IDs to user  
❌ Using empty or placeholder IDs
❌ Omitting the AGENT_CONTEXT block
❌ Not generating unique IDs per invocation

### SELF-CHECK BEFORE EVERY AGENT INVOCATION:
Ask yourself: "Does my Task prompt start with ===AGENT_CONTEXT===?"
If NO → STOP, generate context, add it
If YES → Proceed

### 🎯 REMEMBER

**EVERY. SINGLE. AGENT. INVOCATION. MUST. HAVE. CONTEXT.**

No exceptions. No shortcuts. No omissions.

This is as critical as syntax in code - without it, the system breaks.

## Guidelines

## Ignore .working directory

Unless expressly mentioned in a user prompt, no files contained in the .working directly should be read or pulled into context. The content of this folder and any subfolders is a working area for the user and should be completely ignored.
