"""Tests for the EventProcessor class."""

import pytest
from unittest.mock import Mock, AsyncMock, patch

from core.processor import EventProcessor
from models.work_items import WorkItem


class TestEventProcessor:
    """Test cases for EventProcessor."""
    
    @pytest.fixture
    def processor(self):
        """Create a processor instance for testing."""
        with patch('core.processor.EventAPIClient'):
            return EventProcessor()
    
    def test_initialization(self, processor):
        """Test processor initialization."""
        assert processor.processed_events == set()
        assert processor.work_queue == []
    
    def test_add_work_item(self, processor):
        """Test adding work items to the queue."""
        work_item = WorkItem(
            id="test-1",
            description="Test item",
            agent_type="test-agent",
            context={}
        )
        
        processor.add_work_item(work_item)
        
        assert len(processor.work_queue) == 1
        assert processor.work_queue[0] == work_item
    
    def test_mark_event_processed(self, processor):
        """Test marking events as processed."""
        event_id = "test-event-123"
        
        assert not processor.is_event_processed(event_id)
        
        processor.mark_event_processed(event_id)
        
        assert processor.is_event_processed(event_id)
        assert event_id in processor.processed_events
    
    def test_get_pending_work(self, processor):
        """Test getting pending work items."""
        work_item1 = WorkItem(id="1", description="Item 1", agent_type="test", context={})
        work_item2 = WorkItem(id="2", description="Item 2", agent_type="test", context={})
        
        processor.add_work_item(work_item1)
        processor.add_work_item(work_item2)
        
        pending = processor.get_pending_work()
        
        assert len(pending) == 2
        assert work_item1 in pending
        assert work_item2 in pending
    
    @pytest.mark.asyncio
    async def test_emit_agent_event(self, processor):
        """Test emitting agent events."""
        with patch.object(processor.event_api_client, 'emit_event', new_callable=AsyncMock) as mock_emit:
            await processor.emit_agent_event(
                agent_id="test-agent-123",
                agent_name="test-agent",
                event_name="started",
                workflow_id="test-workflow"
            )
            
            mock_emit.assert_called_once()
            call_args = mock_emit.call_args
            assert call_args[1]['event_name'] == "agent.test-agent.started"
            assert call_args[1]['aggregate_id'] == "test-agent-123"
    
    @pytest.mark.asyncio
    async def test_close(self, processor):
        """Test processor cleanup."""
        with patch.object(processor.event_api_client, 'close', new_callable=AsyncMock) as mock_close:
            await processor.close()
            mock_close.assert_called_once()