"""FastAPI application main entry point."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from dependencies.database import db_manager
from routes.events import router as events_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    yield
    # Shutdown
    await db_manager.close()


app = FastAPI(
    title="Event Processing API",
    description="FastAPI service for processing events with eventuali",
    version="0.1.0",
    lifespan=lifespan
)

# Include routers
app.include_router(events_router)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "Event Processing API", "version": "0.1.0"}


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
