"""Event API routes."""

import json
import uuid
from datetime import datetime, timezone
from typing import Annotated, Dict, Any

from eventuali import Event, EventStore, Aggregate
from fastapi import APIRouter, Depends, HTTPException

from dependencies.database import get_event_store
from models.events import EventRequest, EventResponse, HealthResponse

router = APIRouter(prefix="/events", tags=["events"])


class GenericEvent(Event):
    """Generic event for storing arbitrary event data."""
    
    # Add custom fields as Pydantic model fields
    name: str = ""
    attributes: Dict[str, Any] = {}
    
    @classmethod
    def get_event_type(cls) -> str:
        return "generic_event"


class EventAggregate(Aggregate):
    """Simple aggregate for managing events."""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def add_event(self, event_type: str, event_data: Dict[str, Any] = None) -> None:
        """Add a new event to this aggregate."""
        event = GenericEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            event_type=event_type,
            name=event_data.get("name", "") if event_data else "",
            attributes=event_data.get("attributes", {}) if event_data else {}
        )
        self.apply(event)
    
    def apply_generic_event(self, event: GenericEvent) -> None:
        """Apply a generic event to this aggregate."""
        # For now, we just need this method to exist so the event can be applied
        pass
    
    @classmethod
    def get_aggregate_type(cls) -> str:
        return "event_aggregate"


@router.post("/", response_model=EventResponse)
async def create_event(
    event_request: EventRequest,
    store: Annotated[EventStore, Depends(get_event_store)]
) -> EventResponse:
    """Create and store a new event."""
    try:
        # Set timestamp if not provided
        timestamp = event_request.timestamp or datetime.now(timezone.utc)
        
        # Generate unique event ID
        event_id = str(uuid.uuid4())
        
        # Create event data structure compatible with current format
        event_data = {
            "name": event_request.name,
            "timestamp": timestamp.isoformat(),
            "attributes": event_request.attributes,
            "trace_id": uuid.uuid4().hex,
            "span_id": uuid.uuid4().hex[:16],
            "kind": "SPAN_KIND_INTERNAL",
            "status": {"code": "STATUS_CODE_OK"},
            "event_id": event_id
        }
        
        # Create aggregate and add event using proper DDD pattern
        aggregate_id = str(uuid.uuid4())
        aggregate = EventAggregate(id=aggregate_id)
        aggregate.add_event(event_request.name, event_data)
        
        # Store aggregate in eventuali
        await store.save(aggregate)
        
        return EventResponse(
            success=True,
            event_id=event_id,
            message=f"Event '{event_request.name}' stored successfully",
            timestamp=timestamp
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store event: {str(e)}"
        )


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc)
    )