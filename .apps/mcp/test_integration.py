#!/usr/bin/env python3
"""Simple integration test for the MCP eventuali server."""

import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add the current directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent))

from client import EventAPIClient
from models import EventResponse


async def test_api_client():
    """Test the EventAPIClient functionality."""
    print("Testing EventAPIClient...")
    
    async with EventAPIClient() as client:
        # Test health check
        print("1. Testing health check...")
        try:
            health = await client.health_check()
            print(f"   Health status: {health.status}")
            print(f"   API connected: {health.api_connected}")
        except Exception as e:
            print(f"   Health check failed: {e}")
            return False
        
        # Test emitting an agent event (using new naming convention)
        print("2. Testing agent event emission...")
        try:
            response = await client.emit_event(
                event_name="agent.testAgent.test_event",
                attributes={
                    "test": True,
                    "agent_name": "testAgent",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                },
                aggregate_id="test-agent-12345",
                correlation_id="test-workflow-67890"
            )
            print(f"   Event emitted: {response.success}")
            print(f"   Event ID: {response.event_id}")
            print(f"   Message: {response.message}")
        except Exception as e:
            print(f"   Event emission failed: {e}")
            return False
        
        # Test getting recent events
        print("3. Testing event retrieval...")
        try:
            events_response = await client.get_events(limit=5)
            print(f"   Retrieved {len(events_response.events)} events")
            if events_response.events:
                latest_event = events_response.events[0]
                print(f"   Latest event: {latest_event.event_name} at {latest_event.timestamp}")
        except Exception as e:
            print(f"   Event retrieval failed: {e}")
            return False
        
        print("✅ All API client tests passed!")
        return True


async def test_workflow_simulation():
    """Test a complete workflow simulation."""
    print("\nTesting workflow simulation...")
    
    workflow_id = f"workflow-{uuid.uuid4().hex}"
    agent_id = f"testAgent-{uuid.uuid4().hex}"
    
    async with EventAPIClient() as client:
        # Start workflow
        print(f"1. Starting workflow {workflow_id}...")
        try:
            response = await client.emit_event(
                event_name="workflow.started",
                attributes={
                    "user_prompt": "Test workflow for MCP integration",
                    "start_time": datetime.now(timezone.utc).isoformat()
                },
                correlation_id=workflow_id
            )
            print(f"   Workflow started: {response.success}")
        except Exception as e:
            print(f"   Workflow start failed: {e}")
            return False
        
        # Start agent (using new naming convention)
        print(f"2. Starting agent {agent_id}...")
        try:
            response = await client.emit_event(
                event_name="agent.testAgent.started",
                attributes={
                    "agent_name": "testAgent",
                    "agent_id": agent_id,
                    "start_time": datetime.now(timezone.utc).isoformat()
                },
                aggregate_id=agent_id,
                correlation_id=workflow_id
            )
            print(f"   Agent started: {response.success}")
        except Exception as e:
            print(f"   Agent start failed: {e}")
            return False
        
        # Agent does work (using new naming convention)
        print("3. Agent performing work...")
        try:
            response = await client.emit_event(
                event_name="agent.testAgent.processing",
                attributes={
                    "agent_name": "testAgent",
                    "action": "testing_mcp_integration",
                    "progress": 50
                },
                aggregate_id=agent_id,
                correlation_id=workflow_id
            )
            print(f"   Agent work logged: {response.success}")
        except Exception as e:
            print(f"   Agent work logging failed: {e}")
            return False
        
        # Complete agent (using new naming convention)
        print("4. Completing agent...")
        try:
            response = await client.emit_event(
                event_name="agent.testAgent.completed",
                attributes={
                    "agent_name": "testAgent",
                    "success": True,
                    "message": "MCP integration test completed successfully",
                    "end_time": datetime.now(timezone.utc).isoformat()
                },
                aggregate_id=agent_id,
                correlation_id=workflow_id
            )
            print(f"   Agent completed: {response.success}")
        except Exception as e:
            print(f"   Agent completion failed: {e}")
            return False
        
        # Complete workflow
        print("5. Completing workflow...")
        try:
            response = await client.emit_event(
                event_name="workflow.completed",
                attributes={
                    "success": True,
                    "message": "Test workflow completed",
                    "end_time": datetime.now(timezone.utc).isoformat()
                },
                correlation_id=workflow_id
            )
            print(f"   Workflow completed: {response.success}")
        except Exception as e:
            print(f"   Workflow completion failed: {e}")
            return False
        
        # Get workflow events
        print("6. Retrieving workflow events...")
        try:
            events_response = await client.get_workflow_events(workflow_id)
            print(f"   Retrieved {len(events_response.events)} workflow events")
            for event in events_response.events:
                print(f"     - {event.event_name} at {event.timestamp}")
        except Exception as e:
            print(f"   Workflow event retrieval failed: {e}")
            return False
        
        # Get agent events
        print("7. Retrieving agent events...")
        try:
            events_response = await client.get_agent_events(agent_id)
            print(f"   Retrieved {len(events_response.events)} agent events")
            for event in events_response.events:
                print(f"     - {event.event_name} at {event.timestamp}")
        except Exception as e:
            print(f"   Agent event retrieval failed: {e}")
            return False
        
        print("✅ Workflow simulation completed successfully!")
        return True


async def test_streaming():
    """Test event streaming functionality."""
    print("\nTesting event streaming...")
    
    async with EventAPIClient() as client:
        print("1. Starting event stream...")
        try:
            # Start streaming in the background
            stream_task = asyncio.create_task(consume_stream(client))
            
            # Wait a moment for stream to start
            await asyncio.sleep(1)
            
            # Emit a test event while streaming
            print("2. Emitting test event during stream...")
            await client.emit_event(
                event_name="system.test_streaming",
                attributes={
                    "test": "streaming",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
            
            # Let stream run for a few seconds
            await asyncio.sleep(3)
            
            # Cancel streaming
            stream_task.cancel()
            try:
                await stream_task
            except asyncio.CancelledError:
                pass
            
            print("✅ Streaming test completed!")
            return True
        
        except Exception as e:
            print(f"   Streaming test failed: {e}")
            return False


async def consume_stream(client):
    """Consume events from the stream."""
    try:
        event_count = 0
        async for event in client.stream_events():
            event_count += 1
            print(f"   Received stream event #{event_count}: {event.event}")
            if event_count >= 5:  # Limit for testing
                break
    except Exception as e:
        print(f"   Stream consumption error: {e}")


async def main():
    """Run all integration tests."""
    print("🧪 Starting MCP Eventuali Integration Tests")
    print("=" * 50)
    
    # Check if API is available
    print("Checking API availability...")
    async with EventAPIClient() as client:
        try:
            health = await client.health_check()
            if not health.api_connected:
                print("❌ Event API is not available. Please start the API server first.")
                print("   Run: cd .apps/api && uv run main.py")
                return False
            print(f"✅ Event API is available (status: {health.status})")
        except Exception as e:
            print(f"❌ Cannot connect to Event API: {e}")
            print("   Please ensure the API server is running on http://127.0.0.1:8765")
            return False
    
    # Run tests
    tests = [
        ("Basic API Client", test_api_client),
        ("Workflow Simulation", test_workflow_simulation),
        ("Event Streaming", test_streaming),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n📝 Running test: {test_name}")
        print("-" * 40)
        try:
            if await test_func():
                passed += 1
            else:
                failed += 1
                print(f"❌ Test failed: {test_name}")
        except Exception as e:
            failed += 1
            print(f"❌ Test error in {test_name}: {e}")
    
    # Summary
    print("\n" + "=" * 50)
    print("🏁 Test Summary")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Success Rate: {passed/(passed+failed)*100:.1f}%")
    
    if failed == 0:
        print("\n🎉 All tests passed! MCP server is ready for use.")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the errors above.")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)