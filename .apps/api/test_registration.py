#!/usr/bin/env python3
"""Test if event registration is working properly"""

import asyncio
from pathlib import Path
from eventuali import EventStore
from routes.events import AgentEvent

async def test_registration():
    """Test that events are properly deserialized as custom classes"""
    
    events_dir = Path(".events")
    db_path = events_dir / "events.db"
    store = await EventStore.create(f"sqlite:///{db_path.absolute()}")
    
    # Register custom event classes
    EventStore.register_event_class("AgentEvent", AgentEvent)
    
    # Load agent events
    events = await store.load_events_by_type("agent_aggregate")
    print(f"Found {len(events)} agent events\n")
    
    if events:
        # Check the last few events
        for event in events[-3:]:
            print(f"Event ID: {str(event.event_id)[:8]}")
            print(f"  Type: {type(event)}")
            print(f"  Class: {event.__class__.__name__}")
            print(f"  Is AgentEvent: {isinstance(event, AgentEvent)}")
            
            if hasattr(event, 'attributes'):
                print(f"  ✅ Has attributes: {event.attributes}")
            else:
                print(f"  ❌ No attributes field")
            
            if hasattr(event, 'agent_name'):
                print(f"  ✅ Has agent_name: {event.agent_name}")
            else:
                print(f"  ❌ No agent_name field")
            print()

if __name__ == "__main__":
    asyncio.run(test_registration())