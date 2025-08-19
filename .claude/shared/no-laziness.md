## CRITICAL: No Stubbing or Placeholder Code

**NEVER** use stubbed, placeholder, or "In production..." code patterns. This is ALL production code.

❌ **ABSOLUTELY FORBIDDEN PATTERNS:**
- `# In production, this would be:`
- `# For this implementation, we'll simulate...`
- `# TODO: Replace with actual implementation`
- `# Placeholder implementation`
- `_simulate_` or `_mock_` functions as primary implementations
- Commented out "real" code with temporary replacements
- `# Note: This would be imported from...`
- `# For now, we'll use a placeholder...`
- Any form of "simulation" or "stubbing"

❌ **FORBIDDEN PHRASES THAT INDICATE STUBBING:**
- "For this implementation"
- "We'll simulate"
- "In production"
- "This would be"
- "For now"
- "Placeholder"
- "Mock"
- "Simulate"
- "Mark for later"

✅ **REQUIRED APPROACH - ALWAYS DO THE ACTUAL WORK:**
- Implement actual functionality immediately
- Use real tools and APIs directly
- Call actual functions, not stubs
- Import real modules, not placeholders
- Test with actual implementations
- If a tool fails, handle errors gracefully but NEVER replace with stubs

**Example of correct approach:**
```python
# ✅ CORRECT - Do the actual work
try:
    # Call the real Task tool directly
    result = Task(description="...", prompt="...", subagent_type="general-purpose")
    return result
except Exception as e:
    # Handle actual errors, but don't stub
    print(f"Task failed: {e}")
    return None

# ❌ WRONG - Never do this
# For this implementation, we'll simulate the Task tool
# result = simulate_task(...)
```

**REMEMBER: This is production code. ALL functionality must be real, working, and tested. No exceptions.**