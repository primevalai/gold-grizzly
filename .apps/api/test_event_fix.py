#!/usr/bin/env python3
"""Test script to verify custom event deserialization is fixed"""

import asyncio
import json
from pathlib import Path
from eventuali import EventStore
from routes.events import AgentEvent

async def test_event_retrieval():
    """Test how events are retrieved and what data they contain"""
    
    events_dir = Path(".events")
    db_path = events_dir / "events.db"
    store = await EventStore.create(f"sqlite:///{db_path.absolute()}")
    
    # Register custom event classes
    EventStore.register_event_class("AgentEvent", AgentEvent)
    
    # Load agent events
    events = await store.load_events_by_type("agent_aggregate")
    print(f"Found {len(events)} agent events\n")
    
    if events:
        # Get the most recent event
        event = events[-1]
        
        print("=== Event Type Information ===")
        print(f"Event type: {type(event)}")
        print(f"Event class: {event.__class__.__name__}")
        print(f"Is AgentEvent: {isinstance(event, AgentEvent)}")
        print()
        
        print("=== Custom Fields Check ===")
        # Check for custom fields
        for attr in ['attributes', 'agent_name', 'agent_id', 'workflow_id', 'event_name']:
            value = getattr(event, attr, 'NOT FOUND')
            print(f"  {attr}: {value}")
        
        print("\n=== Event Dictionary ===")
        event_dict = event.to_dict()
        print(f"to_dict() keys: {list(event_dict.keys())}")
        
        print("\n=== Full Event Data ===")
        print(json.dumps(event_dict, indent=2, default=str))
        
        # Check if the test event we just created has the custom fields
        if hasattr(event, 'attributes') and event.attributes:
            print("\n✅ SUCCESS: Custom fields are preserved!")
            print(f"   attributes field contains: {event.attributes}")
        else:
            print("\n❌ FAILURE: Custom fields are still missing")

if __name__ == "__main__":
    asyncio.run(test_event_retrieval())