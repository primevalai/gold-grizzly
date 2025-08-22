"""Work item models for the event orchestrator."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Any, Optional


@dataclass
class WorkItem:
    """Represents a work item to be processed by the orchestrator."""
    
    id: str
    description: str
    agent_type: str
    context: Dict[str, Any]
    priority: int = 1
    created_at: Optional[datetime] = None
    
    def __post_init__(self):
        """Initialize created_at if not provided."""
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc)