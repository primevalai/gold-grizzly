#!/usr/bin/env python3
"""Tests for the new agent event naming convention."""

import asyncio
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

import sys
from pathlib import Path

# Add the current directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent))

from main import emit_agent_event, start_agent, complete_agent
from models import AgentEventRequest, StartAgentRequest, CompleteAgentRequest


@pytest.mark.asyncio
class TestEventNamingConvention:
    """Test the new agent.<agentName>.<eventName> naming convention."""
    
    @patch("main.get_api_client")
    async def test_emit_agent_event_naming(self, mock_get_client):
        """Test that emit_agent_event uses the new naming convention."""
        # Mock the API client
        mock_client = AsyncMock()
        mock_get_client.return_value = mock_client
        
        # Mock the emit_event response
        mock_response = AsyncMock()
        mock_response.success = True
        mock_response.event_id = "test-event-123"
        mock_response.message = "Event emitted successfully"
        mock_client.emit_event.return_value = mock_response
        
        # Create test request
        request = AgentEventRequest(
            agent_id="testAgent-12345",
            agent_name="simonSays",
            event_name="commandReceived",
            attributes={"test": True}
        )
        
        # Call the function
        result = await emit_agent_event(request)
        
        # Verify the client was called with the correct event name
        mock_client.emit_event.assert_called_once()
        call_args = mock_client.emit_event.call_args
        
        # Check that the event_name parameter uses the new format
        assert call_args.kwargs["event_name"] == "agent.simonSays.commandReceived"
        assert call_args.kwargs["aggregate_id"] == "testAgent-12345"
        assert "agent_name" in call_args.kwargs["attributes"]
        assert call_args.kwargs["attributes"]["agent_name"] == "simonSays"
    
    @patch("main.get_api_client")
    async def test_start_agent_naming(self, mock_get_client):
        """Test that start_agent uses the new naming convention."""
        # Mock the API client
        mock_client = AsyncMock()
        mock_get_client.return_value = mock_client
        
        # Mock the emit_event response
        mock_response = AsyncMock()
        mock_response.success = True
        mock_response.event_id = "start-event-123"
        mock_response.message = "Agent started successfully"
        mock_client.emit_event.return_value = mock_response
        
        # Create test request
        request = StartAgentRequest(
            agent_name="urlCacher",
            agent_id="urlCacher-67890",
            workflow_id="test-workflow-123",
            parent_agent_id="main-agent-456"
        )
        
        # Call the function
        result = await start_agent(request)
        
        # Verify the client was called with the correct event name
        mock_client.emit_event.assert_called_once()
        call_args = mock_client.emit_event.call_args
        
        # Check that the event_name parameter uses the new format
        assert call_args.kwargs["event_name"] == "agent.urlCacher.started"
        assert call_args.kwargs["aggregate_id"] == "urlCacher-67890"
        assert call_args.kwargs["correlation_id"] == "test-workflow-123"
        assert call_args.kwargs["causation_id"] == "main-agent-456"
    
    @patch("main.get_api_client")
    async def test_complete_agent_success_naming(self, mock_get_client):
        """Test that complete_agent uses the new naming convention for success."""
        # Mock the API client
        mock_client = AsyncMock()
        mock_get_client.return_value = mock_client
        
        # Mock the emit_event response
        mock_response = AsyncMock()
        mock_response.success = True
        mock_response.event_id = "complete-event-123"
        mock_response.message = "Agent completed successfully"
        mock_client.emit_event.return_value = mock_response
        
        # Create test request
        request = CompleteAgentRequest(
            agent_id="lolRecorder-99999",
            agent_name="lolRecorder",
            success=True,
            message="All jokes recorded successfully",
            workflow_id="test-workflow-456",
            parent_agent_id="main-agent-789"
        )
        
        # Call the function
        result = await complete_agent(request)
        
        # Verify the client was called with the correct event name
        mock_client.emit_event.assert_called_once()
        call_args = mock_client.emit_event.call_args
        
        # Check that the event_name parameter uses the new format for completion
        assert call_args.kwargs["event_name"] == "agent.lolRecorder.completed"
        assert call_args.kwargs["aggregate_id"] == "lolRecorder-99999"
        assert call_args.kwargs["correlation_id"] == "test-workflow-456"
        assert call_args.kwargs["causation_id"] == "main-agent-789"
        assert "agent_name" in call_args.kwargs["attributes"]
        assert call_args.kwargs["attributes"]["agent_name"] == "lolRecorder"
        assert call_args.kwargs["attributes"]["success"] is True
    
    @patch("main.get_api_client")
    async def test_complete_agent_failure_naming(self, mock_get_client):
        """Test that complete_agent uses the new naming convention for failure."""
        # Mock the API client
        mock_client = AsyncMock()
        mock_get_client.return_value = mock_client
        
        # Mock the emit_event response
        mock_response = AsyncMock()
        mock_response.success = True
        mock_response.event_id = "fail-event-123"
        mock_response.message = "Agent failure recorded"
        mock_client.emit_event.return_value = mock_response
        
        # Create test request
        request = CompleteAgentRequest(
            agent_id="orchestrator-11111",
            agent_name="orchestrator",
            success=False,
            message="Failed to coordinate tasks",
            workflow_id="test-workflow-999",
            parent_agent_id="main-agent-000"
        )
        
        # Call the function
        result = await complete_agent(request)
        
        # Verify the client was called with the correct event name
        mock_client.emit_event.assert_called_once()
        call_args = mock_client.emit_event.call_args
        
        # Check that the event_name parameter uses the new format for failure
        assert call_args.kwargs["event_name"] == "agent.orchestrator.failed"
        assert call_args.kwargs["aggregate_id"] == "orchestrator-11111"
        assert call_args.kwargs["correlation_id"] == "test-workflow-999"
        assert call_args.kwargs["causation_id"] == "main-agent-000"
        assert "agent_name" in call_args.kwargs["attributes"]
        assert call_args.kwargs["attributes"]["agent_name"] == "orchestrator"
        assert call_args.kwargs["attributes"]["success"] is False
    
    def test_agent_event_request_requires_agent_name(self):
        """Test that AgentEventRequest now requires agent_name."""
        # This should work with agent_name
        request = AgentEventRequest(
            agent_id="test-agent",
            agent_name="testAgent",
            event_name="test_event"
        )
        assert request.agent_name == "testAgent"
        
        # This should fail without agent_name (Pydantic validation error)
        with pytest.raises(Exception):  # Pydantic ValidationError
            AgentEventRequest(
                agent_id="test-agent",
                event_name="test_event"
                # Missing agent_name
            )
    
    def test_complete_agent_request_requires_agent_name(self):
        """Test that CompleteAgentRequest now requires agent_name."""
        # This should work with agent_name
        request = CompleteAgentRequest(
            agent_id="test-agent",
            agent_name="testAgent",
            success=True
        )
        assert request.agent_name == "testAgent"
        
        # This should fail without agent_name (Pydantic validation error)
        with pytest.raises(Exception):  # Pydantic ValidationError
            CompleteAgentRequest(
                agent_id="test-agent",
                success=True
                # Missing agent_name
            )
    
    def test_complete_agent_request_accepts_workflow_and_parent_ids(self):
        """Test that CompleteAgentRequest now accepts workflow_id and parent_agent_id."""
        # This should work with all fields
        request = CompleteAgentRequest(
            agent_id="test-agent",
            agent_name="testAgent",
            success=True,
            message="Test completion",
            workflow_id="test-workflow-123",
            parent_agent_id="parent-agent-456"
        )
        assert request.agent_name == "testAgent"
        assert request.workflow_id == "test-workflow-123"
        assert request.parent_agent_id == "parent-agent-456"
        
        # This should work without workflow_id and parent_agent_id (they are optional)
        request_minimal = CompleteAgentRequest(
            agent_id="test-agent",
            agent_name="testAgent",
            success=True
        )
        assert request_minimal.workflow_id is None
        assert request_minimal.parent_agent_id is None


if __name__ == "__main__":
    # Run a simple test
    async def run_simple_test():
        test_instance = TestEventNamingConvention()
        
        print("Testing agent_name requirement in models...")
        try:
            test_instance.test_agent_event_request_requires_agent_name()
            print("✅ AgentEventRequest requires agent_name")
        except Exception as e:
            print(f"❌ AgentEventRequest test failed: {e}")
        
        try:
            test_instance.test_complete_agent_request_requires_agent_name()
            print("✅ CompleteAgentRequest requires agent_name")
        except Exception as e:
            print(f"❌ CompleteAgentRequest test failed: {e}")
        
        try:
            test_instance.test_complete_agent_request_accepts_workflow_and_parent_ids()
            print("✅ CompleteAgentRequest accepts workflow_id and parent_agent_id")
        except Exception as e:
            print(f"❌ CompleteAgentRequest workflow/parent test failed: {e}")
        
        print("\nNote: Full async tests require pytest to run properly.")
        print("Run: uv run pytest test_event_naming.py -v")
    
    asyncio.run(run_simple_test())