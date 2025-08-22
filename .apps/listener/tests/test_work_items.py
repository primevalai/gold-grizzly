"""Tests for WorkItem models."""

import pytest
from datetime import datetime, timezone

from models.work_items import WorkItem


class TestWorkItem:
    """Test cases for WorkItem model."""
    
    def test_work_item_creation(self):
        """Test basic work item creation."""
        work_item = WorkItem(
            id="test-123",
            description="Test work item",
            agent_type="test-agent",
            context={"key": "value"}
        )
        
        assert work_item.id == "test-123"
        assert work_item.description == "Test work item"
        assert work_item.agent_type == "test-agent"
        assert work_item.context == {"key": "value"}
        assert work_item.priority == 1  # default
        assert work_item.created_at is not None
    
    def test_work_item_with_custom_priority(self):
        """Test work item with custom priority."""
        work_item = WorkItem(
            id="test-123",
            description="High priority item",
            agent_type="test-agent",
            context={},
            priority=5
        )
        
        assert work_item.priority == 5
    
    def test_work_item_with_custom_timestamp(self):
        """Test work item with custom created_at timestamp."""
        custom_time = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        
        work_item = WorkItem(
            id="test-123",
            description="Test item",
            agent_type="test-agent",
            context={},
            created_at=custom_time
        )
        
        assert work_item.created_at == custom_time
    
    def test_work_item_auto_timestamp(self):
        """Test that created_at is automatically set if not provided."""
        before = datetime.now(timezone.utc)
        
        work_item = WorkItem(
            id="test-123",
            description="Test item",
            agent_type="test-agent",
            context={}
        )
        
        after = datetime.now(timezone.utc)
        
        assert before <= work_item.created_at <= after
        assert work_item.created_at.tzinfo == timezone.utc