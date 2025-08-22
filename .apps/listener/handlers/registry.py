"""Handler registry for event-handler agent discovery."""

import logging
from pathlib import Path
from typing import Set, List

from dependencies.config import config

logger = logging.getLogger(__name__)


class HandlerRegistry:
    """Manages discovery and registration of event handlers."""
    
    def __init__(self):
        self._discovered_handlers: Set[str] = set()
        self._handlers_dir = config.get_project_root() / ".claude/agents/event-handlers"
        
    async def discover_handlers(self) -> List[str]:
        """Discover available event handler agents."""
        try:
            if not self._handlers_dir.exists():
                logger.warning(f"Handlers directory does not exist: {self._handlers_dir}")
                return []
            
            handlers = []
            for handler_file in self._handlers_dir.glob("*.md"):
                handler_name = handler_file.stem
                handlers.append(handler_name)
                self._discovered_handlers.add(handler_name)
            
            logger.debug(f"Discovered {len(handlers)} handlers: {handlers}")
            return handlers
            
        except Exception as e:
            logger.error(f"Error discovering handlers: {e}")
            return []
    
    async def handler_exists(self, handler_name: str) -> bool:
        """Check if a specific event handler exists."""
        try:
            handler_path = self._handlers_dir / f"{handler_name}.md"
            exists = handler_path.exists()
            
            if exists:
                self._discovered_handlers.add(handler_name)
            
            logger.debug(f"Handler {handler_name}: {'EXISTS' if exists else 'NOT FOUND'}")
            return exists
            
        except Exception as e:
            logger.error(f"Error checking handler {handler_name}: {e}")
            return False
    
    def get_discovered_handlers(self) -> Set[str]:
        """Get the set of discovered handlers."""
        return self._discovered_handlers.copy()
    
    def get_handler_path(self, handler_name: str) -> Path:
        """Get the path to a specific handler."""
        return self._handlers_dir / f"{handler_name}.md"