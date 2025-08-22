"""Event processor for handling API communication and event management."""

import logging
import sys
from pathlib import Path
from typing import List, Set

# Import EventAPIClient from the PyPI package
from eventuali_mcp_server import EventAPIClient

from models.work_items import WorkItem
from dependencies.config import config

logger = logging.getLogger(__name__)


class EventProcessor:
    """Processes streaming events and manages work items."""
    
    def __init__(self):
        """Initialize the event processor."""
        self.event_api_client = EventAPIClient(config.api_url)
        self.processed_events: Set[str] = set()
        self.work_queue: List[WorkItem] = []
        
        logger.debug(f"EventProcessor initialized with API URL: {config.api_url}")
    
    async def emit_agent_event(self, agent_id: str, agent_name: str, event_name: str, **kwargs):
        """Emit an agent event via the API."""
        try:
            # Prepare attributes
            attributes = {
                "agent_id": agent_id,
                "agent_name": agent_name,
                **kwargs.get("attributes", {})
            }
            
            # Call emit_event with correct parameter structure
            await self.event_api_client.emit_event(
                event_name=f"agent.{agent_name}.{event_name}",
                attributes=attributes,
                aggregate_id=agent_id,
                correlation_id=kwargs.get("workflow_id"),
                causation_id=kwargs.get("parent_agent_id")
            )
            logger.debug(f"Emitted agent event: {event_name} for {agent_name}")
            
        except Exception as e:
            logger.error(f"Error emitting agent event: {e}")
    
    def add_work_item(self, work_item: WorkItem):
        """Add a work item to the queue."""
        self.work_queue.append(work_item)
        logger.debug(f"Added work item: {work_item.id} ({work_item.agent_type})")
    
    def get_pending_work(self) -> List[WorkItem]:
        """Get all pending work items."""
        return self.work_queue.copy()
    
    def mark_event_processed(self, event_id: str):
        """Mark an event as processed."""
        if event_id:
            self.processed_events.add(event_id)
            logger.debug(f"Event {event_id[:8]} marked as processed")
    
    def is_event_processed(self, event_id: str) -> bool:
        """Check if an event has been processed."""
        return event_id in self.processed_events
    
    async def close(self):
        """Close the event processor and cleanup resources."""
        try:
            await self.event_api_client.close()
            logger.debug("EventProcessor closed successfully")
        except Exception as e:
            logger.error(f"Error closing EventProcessor: {e}")