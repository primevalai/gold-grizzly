#!/bin/bash

# FastAPI Event Processing API Startup Script
# Ensures UV environment and starts the development server

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Event Processing API...${NC}"

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}⚠️  UV not found. Installing UV...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
uv sync

# Start the FastAPI development server
echo -e "${GREEN}✅ Starting FastAPI server on http://127.0.0.1:8000${NC}"
echo -e "${GREEN}📊 Health check: http://127.0.0.1:8000/health${NC}"
echo -e "${GREEN}📚 API docs: http://127.0.0.1:8000/docs${NC}"

uv run python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload