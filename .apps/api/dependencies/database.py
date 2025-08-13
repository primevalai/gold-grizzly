"""Database dependencies for eventuali integration."""

import asyncio
from pathlib import Path
from typing import AsyncGenerator, List, Dict, Any

from eventuali import EventStore, Event


class DatabaseManager:
    """Manager for eventuali EventStore connection."""
    
    def __init__(self) -> None:
        self._store: EventStore | None = None
        self._lock = asyncio.Lock()
    
    async def get_store(self) -> EventStore:
        """Get or create EventStore instance."""
        if self._store is None:
            async with self._lock:
                if self._store is None:
                    # Ensure .events directory exists
                    events_dir = Path(".events")
                    events_dir.mkdir(exist_ok=True)
                    
                    # Create SQLite EventStore
                    db_path = events_dir / "events.db"
                    self._store = await EventStore.create(
                        f"sqlite:///{db_path.absolute()}"
                    )
        
        return self._store
    
    async def close(self) -> None:
        """Close the EventStore connection."""
        if self._store is not None:
            # EventStore cleanup if needed
            self._store = None
    
    async def get_recent_events(
        self, 
        limit: int = 100, 
        offset: int = 0,
        aggregate_type: str = "event_aggregate",
        event_type: str = None
    ) -> List[Dict[str, Any]]:
        """Get recent events from the event store."""
        store = await self.get_store()
        
        try:
            # Load events by aggregate type (our EventAggregate type)
            events = await store.load_events_by_type(aggregate_type)
            
            # Convert events to dictionaries and apply filtering
            event_dicts = []
            for event in events:
                event_dict = event.to_dict()
                
                # Add metadata fields for better UI display
                event_dict.update({
                    'event_id': str(event.event_id),
                    'aggregate_id': event.aggregate_id,
                    'aggregate_type': event.aggregate_type,
                    'event_type': event.event_type,
                    'aggregate_version': event.aggregate_version,
                    'timestamp': event.timestamp.isoformat() if event.timestamp else None,
                    'user_id': event.user_id,
                    'causation_id': str(event.causation_id) if event.causation_id else None,
                    'correlation_id': str(event.correlation_id) if event.correlation_id else None,
                })
                
                # Filter by event type if specified
                if event_type is None or event.event_type == event_type:
                    event_dicts.append(event_dict)
            
            # Sort by timestamp (most recent first)
            event_dicts.sort(
                key=lambda x: x.get('timestamp', ''), 
                reverse=True
            )
            
            # Apply pagination
            start_idx = offset
            end_idx = offset + limit
            return event_dicts[start_idx:end_idx]
            
        except Exception as e:
            print(f"Error retrieving events: {e}")
            return []


# Global database manager instance
db_manager = DatabaseManager()


async def get_event_store() -> AsyncGenerator[EventStore, None]:
    """Dependency to get EventStore instance."""
    store = await db_manager.get_store()
    try:
        yield store
    except Exception:
        # Handle any database errors gracefully
        raise