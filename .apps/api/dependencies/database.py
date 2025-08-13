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
        aggregate_type: str = None,
        event_type: str = None
    ) -> List[Dict[str, Any]]:
        """Get recent events from the event store."""
        store = await self.get_store()
        
        try:
            # Load events from all aggregates if no specific type provided
            if aggregate_type:
                events = await store.load_events_by_type(aggregate_type)
            else:
                # Load events from all three aggregate types
                agent_events = await store.load_events_by_type("agent_aggregate")
                workflow_events = await store.load_events_by_type("workflow_aggregate") 
                system_events = await store.load_events_by_type("system_aggregate")
                # Also include legacy events for compatibility
                legacy_events = await store.load_events_by_type("event_aggregate")
                
                # Combine all events
                events = list(agent_events) + list(workflow_events) + list(system_events) + list(legacy_events)
            
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
    
    async def get_agent_events(self, agent_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all events for a specific agent aggregate."""
        return await self.get_recent_events(
            limit=limit,
            aggregate_type="agent_aggregate",
            event_type=None
        )
    
    async def get_workflow_events(self, workflow_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all events for a specific workflow aggregate."""
        return await self.get_recent_events(
            limit=limit,
            aggregate_type="workflow_aggregate",
            event_type=None
        )
    
    async def get_system_events(self, session_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all events for a specific system/session aggregate."""
        return await self.get_recent_events(
            limit=limit,
            aggregate_type="system_aggregate",
            event_type=None
        )
    
    async def get_workflow_agents(self, workflow_id: str) -> List[Dict[str, Any]]:
        """Get all agents that participated in a specific workflow."""
        store = await self.get_store()
        
        try:
            # Load all agent events and filter by correlation_id (workflow_id)
            events = await store.load_events_by_type("agent_aggregate")
            
            workflow_agents = []
            seen_agents = set()
            
            for event in events:
                event_dict = event.to_dict()
                
                # Check if this event is part of the workflow
                correlation_id = event_dict.get('correlation_id')
                if correlation_id == workflow_id:
                    agent_id = event_dict.get('aggregate_id')
                    
                    if agent_id and agent_id not in seen_agents:
                        seen_agents.add(agent_id)
                        
                        # Extract agent name from aggregate_id or event data
                        agent_name = agent_id.split('-')[0] if '-' in agent_id else 'unknown'
                        
                        workflow_agents.append({
                            'agent_id': agent_id,
                            'agent_name': agent_name,
                            'workflow_id': workflow_id,
                            'first_event_time': event_dict.get('timestamp'),
                            'event_type': event_dict.get('event_type')
                        })
            
            # Sort by first event time
            workflow_agents.sort(key=lambda x: x.get('first_event_time', ''))
            
            return workflow_agents
            
        except Exception as e:
            print(f"Error retrieving workflow agents: {e}")
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