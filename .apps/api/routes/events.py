"""Event API routes."""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Annotated, Dict, Any, AsyncGenerator, List

from eventuali import Event, EventStore, Aggregate
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from dependencies.database import get_event_store, db_manager
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


async def event_stream() -> AsyncGenerator[Dict[str, Any], None]:
    """Stream events via Server-Sent Events."""
    last_check = datetime.now(timezone.utc)
    
    while True:
        try:
            # Get recent events since last check
            events = await db_manager.get_recent_events(limit=50)
            
            # Send events that are newer than last check
            for event in events:
                event_time_str = event.get('timestamp')
                if event_time_str:
                    event_time = datetime.fromisoformat(
                        event_time_str.replace('Z', '+00:00')
                    )
                    if event_time > last_check:
                        yield {
                            "event": "event_created",
                            "data": json.dumps(event),
                            "id": event.get('event_id', ''),
                        }
            
            # Update last check time
            last_check = datetime.now(timezone.utc)
            
            # Send heartbeat to keep connection alive
            yield {
                "event": "heartbeat",
                "data": json.dumps({
                    "timestamp": last_check.isoformat(),
                    "status": "connected"
                }),
            }
            
            # Wait before next poll
            await asyncio.sleep(2)
            
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }),
            }
            await asyncio.sleep(5)


@router.get("/stream")
async def stream_events():
    """Stream events using Server-Sent Events."""
    return EventSourceResponse(event_stream())


@router.get("/", response_model=List[Dict[str, Any]])
async def get_events(
    limit: int = 100,
    offset: int = 0,
    event_type: str = None
) -> List[Dict[str, Any]]:
    """Get events with pagination and filtering."""
    return await db_manager.get_recent_events(
        limit=limit,
        offset=offset,
        event_type=event_type
    )


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc)
    )