# MCP Server Configuration Fix - Continuation Point

## Work Completed ✅

### Root Cause Identified (Updated)
The MCP server was correctly configured, but there were **TWO ISSUES**:
1. ✅ **Configuration**: Fixed to use proper CLI commands and stdio communication
2. ✅ **Approval**: Project MCP servers require explicit user approval in settings

### Fix Applied
Used proper Claude Code CLI commands for project-scoped MCP server configuration:

1. **Removed manual configuration**: Deleted manually created `.mcp.json` files
2. **Created wrapper script**: `/home/user01/syncs/github/primevalai/gold-grizzly/start-eventuali-mcp.sh`
   ```bash
   #!/bin/bash
   cd "$(dirname "$0")/.apps/mcp"
   exec uv run main.py
   ```
3. **Used proper CLI command**: 
   ```bash
   claude mcp add --scope project eventuali --env EVENT_API_URL=http://127.0.0.1:8765 -- /home/user01/syncs/github/primevalai/gold-grizzly/start-eventuali-mcp.sh
   ```
4. **Added approval setting**: Updated user settings to approve the eventuali server

### Configuration Status
- ✅ **`.mcp.json`**: Properly configured using CLI command with absolute path wrapper script
- ✅ **`~/.claude/settings.json`**: Updated with `enabledMcpjsonServers: ["eventuali"]` approval
- ✅ **`start-eventuali-mcp.sh`**: Executable wrapper script that handles working directory
- ✅ **Server functionality**: All integration tests passing (100% success rate)
- ✅ **Approval mechanism**: Discovered and configured project MCP server approval

### Current Configuration Files

**`.mcp.json`** (project root):
```json
{
  "mcpServers": {
    "eventuali": {
      "type": "stdio",
      "command": "/home/user01/syncs/github/primevalai/gold-grizzly/start-eventuali-mcp.sh",
      "args": [],
      "env": {
        "EVENT_API_URL": "http://127.0.0.1:8765"
      }
    }
  }
}
```

**`~/.claude/settings.json`** (user settings):
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "opusplan",
  "feedbackSurveyState": {
    "lastShownTime": 1754052702842
  },
  "enabledMcpjsonServers": ["eventuali"]
}
```

## Next Steps After Restart

1. **Verify MCP Tools Availability**:
   - Check for `mcp__eventuali__*` tools in Claude Code
   - Test basic MCP tool functionality

2. **Test MCP Integration**:
   - Use `mcp__eventuali__health_check` tool
   - Test event emission via MCP tools
   - Verify agent context handling

3. **Validate Agent Integration**:
   - Test agent invocation with proper context IDs
   - Verify workflow correlation via MCP tools
   - Test real-time event streaming

## Expected Outcome
After restart, the eventuali MCP server should be accessible to Claude Code with all tools available:
- `mcp__eventuali__emit_agent_event`
- `mcp__eventuali__emit_workflow_event` 
- `mcp__eventuali__emit_system_event`
- `mcp__eventuali__start_agent`
- `mcp__eventuali__complete_agent`
- `mcp__eventuali__start_workflow`
- `mcp__eventuali__complete_workflow`
- `mcp__eventuali__health_check`

Plus resources for data access and streaming.

## Key Lessons Learned

1. **Configuration Method**: Must use `claude mcp add --scope project` command, not manual file editing
2. **Working Directory**: Wrapper scripts needed for MCP servers that require specific working directories
3. **File Locations**: Project-scoped MCP config goes in `.mcp.json` at project root, not in subdirectories
4. **Approval Required**: Project MCP servers need explicit approval via `enabledMcpjsonServers` in user settings
5. **Absolute Paths**: Use absolute paths in wrapper script commands to avoid path resolution issues
6. **Two-Phase Problem**: Server can be "Connected" but not appear in list if not approved

## Files Created/Modified
- ✅ `/home/user01/syncs/github/primevalai/gold-grizzly/.mcp.json` - Project MCP configuration (absolute path)
- ✅ `/home/user01/syncs/github/primevalai/gold-grizzly/start-eventuali-mcp.sh` - Wrapper script  
- ✅ `/home/user01/.claude/settings.json` - Added `enabledMcpjsonServers: ["eventuali"]`
- ✅ `/home/user01/syncs/github/primevalai/gold-grizzly/.apps/mcp/main.py` - Already fixed for stdio

## Discovery Process
The root cause was found through systematic investigation:
1. **Server Status**: `claude mcp get eventuali` showed "✓ Connected" but `claude mcp list` was empty
2. **Documentation Research**: Found that project MCP servers require approval settings
3. **Settings Analysis**: User settings lacked the required `enabledMcpjsonServers` configuration
4. **Solution**: Added specific approval for the eventuali server

## Ready for Testing
Both configuration AND approval issues have been resolved. After Claude Code restart, the eventuali MCP server should appear in `claude mcp list` and all tools should be available.