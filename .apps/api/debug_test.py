#!/usr/bin/env python3
"""Debug script to test aggregate loading/saving."""

import asyncio
import uuid
from datetime import datetime, timezone
from pathlib import Path

from eventuali import EventStore
from routes.events import AgentAggregate, AgentEvent


async def test_aggregate_save_load():
    """Test saving and loading aggregates."""
    
    # Create EventStore
    events_dir = Path(".events")
    events_dir.mkdir(exist_ok=True)
    db_path = events_dir / "debug.db"
    
    # Remove existing DB
    if db_path.exists():
        db_path.unlink()
    
    store = await EventStore.create(f"sqlite:///{db_path.absolute()}")
    
    print("Testing aggregate save/load...")
    
    try:
        # Test 1: Create new aggregate
        aggregate_id = "debug-test-123"
        aggregate = AgentAggregate(id=aggregate_id)
        
        # Apply first event
        event1 = AgentEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=aggregate_id,
            aggregate_type="agent_aggregate",
            agent_name="debug",
            agent_id=aggregate_id,
            event_name="agent.debug.test1",
            attributes={"step": 1}
        )
        
        print("Applying first event...")
        aggregate.apply(event1)
        
        print("Saving aggregate...")
        await store.save(aggregate)
        
        print("✓ First save successful")
        
        # Test 2: Load existing aggregate
        print("Loading aggregate...")
        loaded_aggregate = await store.load(AgentAggregate, aggregate_id)
        
        if loaded_aggregate is None:
            print("✗ Failed to load aggregate")
            return
        
        print(f"✓ Loaded aggregate: {type(loaded_aggregate)}")
        
        # Test 3: Apply second event
        event2 = AgentEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=aggregate_id,
            aggregate_type="agent_aggregate",
            agent_name="debug",
            agent_id=aggregate_id,
            event_name="agent.debug.test2", 
            attributes={"step": 2}
        )
        
        print("Applying second event to loaded aggregate...")
        loaded_aggregate.apply(event2)
        
        print("Saving loaded aggregate with new event...")
        await store.save(loaded_aggregate)
        
        print("✓ Second save successful")
        
        # Test 4: Final verification
        final_aggregate = await store.load(AgentAggregate, aggregate_id)
        print(f"✓ Final verification: {type(final_aggregate)}")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_aggregate_save_load())