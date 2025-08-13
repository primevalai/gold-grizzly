"""Database dependencies for eventuali integration."""

import asyncio
from pathlib import Path
from typing import AsyncGenerator

from eventuali import EventStore


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
                        f"sqlite://{db_path.absolute()}"
                    )
        
        return self._store
    
    async def close(self) -> None:
        """Close the EventStore connection."""
        if self._store is not None:
            # EventStore cleanup if needed
            self._store = None


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