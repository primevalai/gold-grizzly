"""Event models for the API."""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class EventRequest(BaseModel):
    """Request model for creating events."""
    
    name: str = Field(..., description="Event name")
    attributes: Dict[str, Any] = Field(
        default_factory=dict, description="Event attributes"
    )
    timestamp: Optional[datetime] = Field(
        default=None, description="Event timestamp (UTC)"
    )
    aggregate_id: Optional[str] = Field(
        default=None, description="Aggregate ID (for agent instances)"
    )
    causation_id: Optional[str] = Field(
        default=None, description="Causation ID (parent-child relationships)"
    )
    correlation_id: Optional[str] = Field(
        default=None, description="Correlation ID (workflow grouping)"
    )


class EventResponse(BaseModel):
    """Response model for event operations."""
    
    success: bool = Field(..., description="Operation success status")
    event_id: str = Field(..., description="Generated event ID")
    message: str = Field(..., description="Response message")
    timestamp: datetime = Field(..., description="Event timestamp (UTC)")


class HealthResponse(BaseModel):
    """Response model for health check."""
    
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Health check timestamp")