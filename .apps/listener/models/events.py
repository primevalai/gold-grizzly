"""Event models for the listener."""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class EventType(str, Enum):
    """Supported event types."""
    AGENT_EVENT = "agent_event"
    WORKFLOW_EVENT = "workflow_event"
    SYSTEM_EVENT = "system_event"


class AggregateType(str, Enum):
    """Supported aggregate types."""
    AGENT_AGGREGATE = "agent_aggregate"
    WORKFLOW_AGGREGATE = "workflow_aggregate"
    SYSTEM_AGGREGATE = "system_aggregate"


class StreamEventType(str, Enum):
    """Types of events from the stream."""
    EVENT_CREATED = "event_created"
    HEARTBEAT = "heartbeat"
    ERROR = "error"


class EventData(BaseModel):
    """Represents event data from the stream."""
    
    event_id: Optional[str] = None
    event_type: Optional[str] = None
    event_name: Optional[str] = None
    aggregate_type: Optional[str] = None
    aggregate_id: Optional[str] = None
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None
    
    class Config:
        """Pydantic configuration."""
        extra = "allow"  # Allow additional fields


class StreamItem(BaseModel):
    """Represents an item from the event stream."""
    
    event: str
    data: Optional[Dict[str, Any]] = None
    
    class Config:
        """Pydantic configuration."""
        extra = "allow"