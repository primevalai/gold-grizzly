# Claude Code Hooks for Gold Grizzly Event System

This directory contains Claude Code hooks that automatically manage the Gold Grizzly Event System servers during development sessions.

## Hook Overview

### `session-start`
**Trigger**: When a Claude Code session begins
**Purpose**: Automatically starts the API and UI servers
**Actions**:
- Cleans up any existing processes on ports 8765 and 3210
- Starts API server (FastAPI + eventuali) on port 8765
- Starts UI server (Next.js) on port 3210
- Creates PID files for process management
- Logs server output to `api.log` and `ui.log`

### `session-end`
**Trigger**: When a Claude Code session ends
**Purpose**: Gracefully stops all servers and cleans up
**Actions**:
- Stops API and UI servers using PID files
- Attempts graceful shutdown with fallback to force kill
- Archives log files with timestamps
- Confirms all processes are stopped

## Server Configuration

**API Server**:
- Port: 8765
- URL: http://localhost:8765
- Docs: http://localhost:8765/docs
- Health: http://localhost:8765/health

**UI Server**:
- Port: 3210
- URL: http://localhost:3210

## File Structure

```
.claude/hooks/
├── README.md          # This documentation
├── session-start      # Session start hook script
└── session-end        # Session end hook script

.apps/
├── api.pid           # API server process ID (created by hooks)
├── ui.pid            # UI server process ID (created by hooks)
├── api.log           # API server logs (created by hooks)
├── ui.log            # UI server logs (created by hooks)
└── api-YYYYMMDD-HHMMSS.log  # Archived API logs
└── ui-YYYYMMDD-HHMMSS.log   # Archived UI logs
```

## Manual Control

If you need to manually control the servers:

### Start servers manually:
```bash
cd .apps && ./start-dev.sh
```

### Stop servers manually:
```bash
# Kill by PID
cd .apps
kill $(cat api.pid ui.pid) 2>/dev/null

# Or kill by process name
pkill -f "uvicorn.*main:app.*--port 8765"
pkill -f "next dev.*--port 3210"
```

### View server logs:
```bash
tail -f .apps/api.log    # API logs
tail -f .apps/ui.log     # UI logs
```

## Testing the System

Once the hooks start the servers, you can test the system:

```bash
# Test API health
curl http://localhost:8765/health

# Create a test event
curl -X POST http://localhost:8765/events/ \
  -H 'Content-Type: application/json' \
  -d '{"name": "test_event", "attributes": {"source": "manual"}}'

# Visit the UI dashboard
# http://localhost:3210
```

## Troubleshooting

### Servers not starting
1. Check `.apps/api.log` and `.apps/ui.log` for errors
2. Ensure ports 8765 and 3210 are available
3. Verify UV and BUN are installed and in PATH
4. Manually run `.claude/hooks/session-start` for debugging

### Servers not stopping
1. Check for lingering processes: `ps aux | grep -E "(uvicorn|next)"`
2. Force kill: `pkill -f "uvicorn\|next dev"`
3. Remove PID files: `rm .apps/*.pid`

### Hook not executing
1. Verify hook files are executable: `ls -la .claude/hooks/`
2. Check Claude Code settings in `.claude/__settings.json`
3. Ensure `$PROJECT_ROOT` environment variable is set

## Environment Variables

The hooks use the following environment variables:
- `$PROJECT_ROOT` - Path to the project root (set by Claude Code)

## Dependencies

The hooks require:
- **UV** - Python package manager (for API server)
- **BUN** - Node.js runtime (for UI server)  
- **bash** - Shell for hook execution
- **Standard Unix tools** - pkill, nohup, sleep, etc.