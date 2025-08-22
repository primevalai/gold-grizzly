"""Priority models for event processing.

This module contains models for event prioritization as outlined in section 1.2.1
of the improvement plan. Currently contains structure ready for implementation.
"""

from dataclasses import dataclass
from enum import IntEnum
from typing import Dict, Any, Optional


class EventPriority(IntEnum):
    """Event priority levels for queue processing."""
    
    CRITICAL = 4  # System errors, urgent workflows
    HIGH = 3      # User-initiated actions
    NORMAL = 2    # Standard event processing
    LOW = 1       # Background tasks, cleanup


@dataclass
class PrioritizedEvent:
    """Represents an event with priority information for queue processing.
    
    This model will be used when implementing priority queues as per section 1.2.1
    of the improvement plan.
    """
    
    event: Dict[str, Any]
    priority: EventPriority
    content_hash: str
    received_at: float
    batch_key: Optional[str] = None
    
    def __lt__(self, other: "PrioritizedEvent") -> bool:
        """Compare events for priority queue ordering.
        
        Higher priority events come first, then earlier timestamp for same priority.
        """
        if self.priority != other.priority:
            return self.priority > other.priority
        return self.received_at < other.received_at


def determine_event_priority(event: Dict[str, Any]) -> EventPriority:
    """Determine the priority of an event based on its attributes.
    
    This is a placeholder implementation. The full implementation will include
    sophisticated priority determination logic as per section 1.2.1.
    """
    event_name = event.get("event_name", "").lower()
    event_type = event.get("event_type", "")
    attributes = event.get("attributes", {})
    
    # Critical: System errors, failures
    if "error" in event_name or "failed" in event_name:
        return EventPriority.CRITICAL
    
    # High: User-initiated workflows, commands
    if event_type == "workflow_event" or "command" in attributes:
        return EventPriority.HIGH
    
    # Low: Heartbeats, metrics, logging
    if event_name in ["heartbeat", "metrics", "log"]:
        return EventPriority.LOW
    
    # Default: Normal priority
    return EventPriority.NORMAL