"""Simplified event API client for the listener."""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)


@dataclass
class StreamItem:
    """Simple stream item representation."""
    event: str
    data: Optional[Dict[str, Any]] = None


class EventAPIClient:
    """Simplified async HTTP client for the eventuali event API."""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8765"):
        """Initialize the client with base URL."""
        self.base_url = base_url.rstrip("/")
        self.events_url = f"{self.base_url}/events"
        self._client: Optional[httpx.AsyncClient] = None
        self._closed = False
    
    async def _ensure_client(self):
        """Ensure HTTP client is created."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),
                headers={"Content-Type": "application/json"}
            )
    
    async def emit_event(
        self,
        event_name: str,
        attributes: Optional[Dict[str, Any]] = None,
        aggregate_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        causation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Emit an event to the API."""
        await self._ensure_client()
        
        payload = {
            "event_name": event_name,
            "attributes": attributes or {},
        }
        
        if aggregate_id:
            payload["aggregate_id"] = aggregate_id
        if correlation_id:
            payload["correlation_id"] = correlation_id
        if causation_id:
            payload["causation_id"] = causation_id
        
        logger.debug(f"Emitting event: {event_name}")
        
        response = await self._client.post(self.events_url, json=payload)
        response.raise_for_status()
        return response.json()
    
    async def stream_events(self, poll_interval: float = 2.0) -> AsyncGenerator[StreamItem, None]:
        """Stream events from the API with polling."""
        await self._ensure_client()
        
        logger.info("Starting event stream...")
        last_event_time = None
        
        while not self._closed:
            try:
                # Prepare query parameters
                params = {"limit": 100}
                if last_event_time:
                    params["since"] = last_event_time
                
                # Get events
                response = await self._client.get(f"{self.events_url}/stream", params=params)
                response.raise_for_status()
                data = response.json()
                
                events = data.get("events", [])
                
                if events:
                    for event in events:
                        # Update last event time
                        if "timestamp" in event:
                            last_event_time = event["timestamp"]
                        
                        yield StreamItem(event="event_created", data=event)
                else:
                    # No new events, send heartbeat
                    yield StreamItem(event="heartbeat")
                
                # Wait before next poll
                await asyncio.sleep(poll_interval)
                
            except httpx.HTTPError as e:
                logger.error(f"HTTP error in event stream: {e}")
                yield StreamItem(event="error", data={"error": str(e)})
                await asyncio.sleep(poll_interval)
            
            except Exception as e:
                logger.error(f"Unexpected error in event stream: {e}")
                yield StreamItem(event="error", data={"error": str(e)})
                await asyncio.sleep(poll_interval)
    
    async def close(self):
        """Close the client."""
        self._closed = True
        if self._client:
            await self._client.aclose()
            self._client = None
        logger.debug("EventAPIClient closed")