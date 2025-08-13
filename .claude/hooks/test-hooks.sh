#!/bin/bash

# Test script for Claude Code hooks
# This simulates what happens during session start/end

set -e

echo "🧪 Testing Claude Code hooks for Gold Grizzly Event System"
echo ""

cd "$(dirname "$0")/../.."
PROJECT_ROOT=$(pwd)
export PROJECT_ROOT

echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Test session start
echo "🚀 Testing session-start hook..."
.claude/hooks/session-start

echo ""
echo "⏳ Waiting 5 seconds for servers to fully start..."
sleep 5

# Test that servers are running
echo "🔍 Testing server endpoints..."

echo -n "   API Health: "
if curl -s http://localhost:8765/health | grep -q "healthy"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

echo -n "   UI Server: "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3210 | grep -q "200"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

# Create a test event
echo -n "   Event Creation: "
if curl -s -X POST http://localhost:8765/events/ \
    -H 'Content-Type: application/json' \
    -d '{"name": "hook_test", "attributes": {"test": true}}' | grep -q "success"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

echo ""
echo "⏳ Waiting 3 seconds before shutdown..."
sleep 3

# Test session end
echo "🛑 Testing session-end hook..."
.claude/hooks/session-end

echo ""
echo "⏳ Waiting 3 seconds for cleanup..."
sleep 3

# Verify servers are stopped
echo "🔍 Verifying servers are stopped..."

if pgrep -f "uvicorn.*main:app.*--port 8765" > /dev/null; then
    echo "   API Server: ❌ Still running"
else
    echo "   API Server: ✅ Stopped"
fi

if pgrep -f "next dev.*--port 3210" > /dev/null; then
    echo "   UI Server: ❌ Still running"
else
    echo "   UI Server: ✅ Stopped"
fi

echo ""
echo "🎯 Hook testing complete!"
echo ""
echo "📋 Files created during test:"
ls -la .apps/*.log .apps/*.pid 2>/dev/null || echo "   (No log or PID files found)"

echo ""