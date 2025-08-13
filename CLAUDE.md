# CLAUDE.md

## Project Information

This file contains project-specific information and context for Claude Code.

## Lexicon

<project-lexicon>
**CC**: Claude Code
**System**: The entirety of the contents of this Claude Code project
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

## Guidelines

## Ignore .working directory

Unless expressly mentioned in a user prompt, no files contained in the .working directly should be read or pulled into context. The content of this folder and any subfolders is a working area for the user and should be completely ignored.
