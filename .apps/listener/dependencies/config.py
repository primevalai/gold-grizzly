"""Configuration management for the listener."""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class ListenerConfig:
    """Configuration settings for the event listener."""
    
    # API Settings
    api_url: str = "http://127.0.0.1:8765"
    
    # Processing Settings
    poll_interval: float = 2.0  # seconds
    max_retries: int = 3
    handler_timeout: int = 300  # seconds
    work_queue_check_interval: float = 2.0  # seconds
    
    # Debugging
    verbosity: int = 0
    
    # Paths
    project_root: Optional[Path] = None
    claude_binary: str = "/home/user01/.volta/tools/image/node/24.5.0/bin/claude"
    
    # Shutdown
    shutdown_timeout: int = 30  # seconds
    
    @classmethod
    def from_env(cls) -> "ListenerConfig":
        """Create configuration from environment variables."""
        return cls(
            api_url=os.getenv("LISTENER_API_URL", "http://127.0.0.1:8765"),
            poll_interval=float(os.getenv("LISTENER_POLL_INTERVAL", "2.0")),
            max_retries=int(os.getenv("LISTENER_MAX_RETRIES", "3")),
            handler_timeout=int(os.getenv("LISTENER_HANDLER_TIMEOUT", "300")),
            work_queue_check_interval=float(os.getenv("LISTENER_WORK_QUEUE_INTERVAL", "2.0")),
            verbosity=int(os.getenv("LISTENER_VERBOSITY", "0")),
            claude_binary=os.getenv("LISTENER_CLAUDE_BINARY", 
                                   "/home/user01/.volta/tools/image/node/24.5.0/bin/claude"),
            shutdown_timeout=int(os.getenv("LISTENER_SHUTDOWN_TIMEOUT", "30")),
        )
    
    def get_project_root(self) -> Path:
        """Get the project root directory."""
        if self.project_root is None:
            # Calculate relative to this file: .apps/listener/dependencies/config.py
            self.project_root = Path(__file__).parent.parent.parent.parent
        return self.project_root


# Global configuration instance
config = ListenerConfig.from_env()