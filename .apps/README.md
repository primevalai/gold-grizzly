# Gold Grizzly Apps

This directory contains the applications for the Gold Grizzly event processing system.

## Architecture

- **`api/`** - FastAPI backend with eventuali event store
- **`ui/`** - Next.js frontend with real-time event dashboard

## Quick Start

### Development Environment

Start both API and UI servers together:

```bash
./start-dev.sh
```

This will start:
- API server on http://localhost:8765
- UI dashboard on http://localhost:3210

### Individual Services

#### API Server

```bash
cd api
uv install
uv run python -m uvicorn main:app --reload
```

#### UI Dashboard

```bash
cd ui
bun install
bun dev
```

## Usage

### Create Events

```bash
curl -X POST http://localhost:8765/events/ \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "user_signup",
    "attributes": {
      "user_id": "123",
      "email": "user@example.com"
    }
  }'
```

### Monitor Events

- Visit http://localhost:3210 for the real-time dashboard
- Events will appear automatically via Server-Sent Events
- Connection status and controls are provided in the UI

### API Documentation

- Swagger UI: http://localhost:8765/docs
- ReDoc: http://localhost:8765/redoc

## Technology Stack

### API
- **FastAPI** - Modern Python web framework
- **eventuali** - Event sourcing library
- **SQLite** - Local database for event storage
- **sse-starlette** - Server-Sent Events support
- **UV** - Fast Python package manager

### UI
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Component library
- **BUN** - Fast JavaScript runtime and package manager

## Project Structure

```
.apps/
├── api/
│   ├── main.py              # FastAPI application
│   ├── routes/events.py     # Event API endpoints
│   ├── models/events.py     # Pydantic models
│   ├── dependencies/        # DI components
│   └── tests/              # API tests
├── ui/
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # React components
│   │   │   └── ui/         # Shadcn components (readonly)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript definitions
│   │   └── lib/            # Utility functions
│   └── package.json        # Node.js dependencies
├── start-dev.sh            # Development startup script
└── README.md              # This file
```

## Development Guidelines

- Follow project-specific `CLAUDE.md` files in each directory
- Use UV for Python package management
- Use BUN for Node.js package management
- Maintain TypeScript strict mode
- Follow Airbnb code style conventions
- Write JSDoc for all functions and components