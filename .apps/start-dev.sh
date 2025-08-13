#!/bin/bash

# Development startup script for Gold Grizzly Event System
# Starts both API and UI in development mode

echo "🚀 Starting Gold Grizzly Event System Development Environment"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $API_PID $UI_PID 2>/dev/null
    wait
    echo "✅ All services stopped"
    exit 0
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start API server
echo "📡 Starting API server..."
cd /home/user01/syncs/github/primevalai/gold-grizzly/.apps/api
uv run python -m uvicorn main:app --reload --host 127.0.0.1 --port 8765 &
API_PID=$!
echo "   API running on http://localhost:8765 (PID: $API_PID)"

# Wait a moment for API to start
sleep 2

# Start UI server
echo "🎨 Starting UI server..."
cd /home/user01/syncs/github/primevalai/gold-grizzly/.apps/ui
bun run dev &
UI_PID=$!
echo "   UI running on http://localhost:3210 (PID: $UI_PID)"

echo ""
echo "🎉 Both servers are starting up!"
echo ""
echo "📋 Available endpoints:"
echo "   • UI Dashboard:    http://localhost:3210"
echo "   • API Docs:        http://localhost:8765/docs"
echo "   • API Health:      http://localhost:8765/health"
echo "   • Event Stream:    http://localhost:8765/events/stream"
echo "   • Create Event:    POST http://localhost:8765/events/"
echo ""
echo "💡 Test the system:"
echo "   curl -X POST http://localhost:8765/events/ \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\": \"test_event\", \"attributes\": {\"test\": true}}'"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for background processes
wait