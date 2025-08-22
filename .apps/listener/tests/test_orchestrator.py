"""Tests for the EventOrchestrator class."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import asyncio

from core.orchestrator import EventOrchestrator
from models.work_items import WorkItem


class TestEventOrchestrator:
    """Test cases for EventOrchestrator."""
    
    @pytest.fixture
    def orchestrator(self):
        """Create an orchestrator instance for testing."""
        return EventOrchestrator(verbosity=0)
    
    def test_initialization(self, orchestrator):
        """Test orchestrator initialization."""
        assert orchestrator.running is False
        assert orchestrator.event_processor is not None
        assert orchestrator.handler_registry is not None
        assert orchestrator.handler_pool is not None
    
    @pytest.mark.asyncio
    async def test_signal_handler(self, orchestrator):
        """Test signal handler sets running to False."""
        orchestrator.running = True
        orchestrator._signal_handler(2, None)  # SIGINT
        assert orchestrator.running is False
    
    @pytest.mark.asyncio
    async def test_shutdown(self, orchestrator):
        """Test graceful shutdown."""
        with patch.object(orchestrator.handler_pool, 'shutdown', new_callable=AsyncMock) as mock_pool_shutdown, \
             patch.object(orchestrator.event_processor, 'close', new_callable=AsyncMock) as mock_processor_close:
            
            await orchestrator._shutdown()
            
            mock_pool_shutdown.assert_called_once()
            mock_processor_close.assert_called_once()
    
    def test_work_item_creation(self, orchestrator):
        """Test work item creation for system events."""
        event = {
            "event_name": "system.command",
            "event_id": "test-123",
            "attributes": {
                "command": "test command",
                "session_id": "test-session"
            }
        }
        
        # Test system event handling
        orchestrator._handle_system_event(event)
        
        # Should have created a work item
        assert len(orchestrator.event_processor.work_queue) == 1
        work_item = orchestrator.event_processor.work_queue[0]
        assert work_item.agent_type == "workflowInitiator"
        assert work_item.context["command"] == "test command"