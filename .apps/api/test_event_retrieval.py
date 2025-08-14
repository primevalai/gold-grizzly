#!/usr/bin/env python3
"""Test script to understand event retrieval and serialization"""

import asyncio
import json
from pathlib import Path
from eventuali import EventStore
from routes.events import AgentEvent

async def test_event_retrieval():
    """Test how events are retrieved and what data they contain"""
    
    # Connect to the same database
    events_dir = Path(".events")
    db_path = events_dir / "events.db"
    store = await EventStore.create(f"sqlite:///{db_path.absolute()}")
    
    print("=== Testing Event Retrieval ===\n")
    
    # Load agent events
    events = await store.load_events_by_type("agent_aggregate")
    print(f"Found {len(events)} agent events\n")
    
    if events:
        # Get the most recent event
        event = events[-1]
        
        print(f"Event type: {type(event)}")
        print(f"Event class: {event.__class__.__name__}")
        print(f"Is AgentEvent: {isinstance(event, AgentEvent)}")
        print(f"\nEvent attributes available:")
        for attr in ['event_id', 'aggregate_id', 'event_type', 'attributes', 
                     'agent_name', 'agent_id', 'workflow_id']:
            value = getattr(event, attr, 'NOT FOUND')
            print(f"  {attr}: {value}")
        
        print(f"\n=== Using to_dict() ===")
        event_dict = event.to_dict()
        print(f"Keys in to_dict(): {list(event_dict.keys())}")
        print(f"Full to_dict() output:")
        print(json.dumps(event_dict, indent=2, default=str))
        
        print(f"\n=== Using model_dump() (Pydantic) ===")
        if hasattr(event, 'model_dump'):
            model_dict = event.model_dump()
            print(f"Keys in model_dump(): {list(model_dict.keys())}")
            print(f"Full model_dump() output:")
            print(json.dumps(model_dict, indent=2, default=str))
        
        print(f"\n=== Direct __dict__ access ===")
        print(f"Keys in __dict__: {list(event.__dict__.keys())}")
        print(f"Full __dict__:")
        print(json.dumps(event.__dict__, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(test_event_retrieval())