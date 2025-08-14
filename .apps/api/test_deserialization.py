#!/usr/bin/env python3
"""Test if custom event fields are preserved in v0.1.1"""

import asyncio
import json
from pathlib import Path
from eventuali import EventStore
from routes.events import AgentEvent

async def test_deserialization():
    """Test if custom fields are preserved during deserialization"""
    
    events_dir = Path(".events")
    db_path = events_dir / "events.db"
    store = await EventStore.create(f"sqlite:///{db_path.absolute()}")
    
    # Load the most recent agent events
    events = await store.load_events_by_type("agent_aggregate")
    print(f"Found {len(events)} agent events\n")
    
    if events:
        # Get the test event we created
        test_event = None
        for event in reversed(events):
            if hasattr(event, 'agent_id') and getattr(event, 'agent_id', '') == 'test-agent-123':
                test_event = event
                break
        
        if test_event:
            print("=== Found Test Event ===")
            print(f"Event type: {type(test_event)}")
            print(f"Event class: {test_event.__class__.__name__}")
            print(f"Is AgentEvent: {isinstance(test_event, AgentEvent)}")
            print()
            
            print("=== Custom Fields Check ===")
            # Check for custom fields
            for attr in ['attributes', 'agent_name', 'agent_id', 'workflow_id', 'event_name']:
                if hasattr(test_event, attr):
                    value = getattr(test_event, attr)
                    print(f"  ✓ {attr}: {value}")
                else:
                    print(f"  ✗ {attr}: NOT FOUND")
            
            # Check the attributes specifically
            if hasattr(test_event, 'attributes'):
                attrs = test_event.attributes
                if attrs and isinstance(attrs, dict):
                    if 'simon_command' in attrs and attrs['simon_command'] == 'test the fix':
                        print("\n✅ SUCCESS: The bug is FIXED!")
                        print("   Custom fields are preserved in eventuali v0.1.1")
                        print(f"   attributes contains: {attrs}")
                    else:
                        print("\n⚠️  PARTIAL: attributes field exists but missing expected data")
                        print(f"   attributes: {attrs}")
                else:
                    print("\n⚠️  PARTIAL: attributes field exists but is empty or not a dict")
            else:
                print("\n❌ FAILURE: Custom fields are still missing")
                print("   The bug is NOT fixed in this version")
        else:
            print("Test event not found. Creating a new one...")
            # We'd need to create a test event here

if __name__ == "__main__":
    asyncio.run(test_deserialization())