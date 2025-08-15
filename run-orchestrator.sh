#!/bin/bash
# Event Orchestrator Runner
# 
# This script runs the autonomous event streaming orchestrator with proper
# environment setup and dependency checking.

set -e

# Check if we're in the right directory
if [[ ! -d ".claude/scripts" ]]; then
    echo "❌ Error: Must run from the project root directory (gold-grizzly/)"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check if virtual environment exists
if [[ ! -d ".venv" ]]; then
    echo "🔧 Creating virtual environment..."
    uv venv
fi

# Check if dependencies are installed
if ! uv pip list | grep -q "httpx"; then
    echo "📦 Installing dependencies..."
    uv pip install httpx pydantic
fi

# Check if API server is running
if ! curl -s http://127.0.0.1:8765/health > /dev/null; then
    echo "❌ Error: Event API server is not running at http://127.0.0.1:8765"
    echo "   Please start the API server first:"
    echo "   cd .apps/api && uv run main.py"
    exit 1
fi

echo "🚀 Starting Event Orchestrator..."
echo "   Press Ctrl+C to stop gracefully"
echo ""

# Run with unbuffered output
PYTHONUNBUFFERED=1 uv run .claude/scripts/event-orchestrator.py