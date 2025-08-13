"""Tests for event API endpoints."""

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from ..main import app


@pytest.fixture
def client():
    """Test client fixture."""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Async test client fixture."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


class TestEventEndpoints:
    """Test event API endpoints."""
    
    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Event Processing API"
        assert data["version"] == "0.1.0"
    
    def test_health_endpoint(self, client):
        """Test health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_events_health_endpoint(self, client):
        """Test events health endpoint."""
        response = client.get("/events/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    @patch("..routes.events.get_event_store")
    def test_create_event_success(self, mock_get_store, client):
        """Test successful event creation."""
        # Mock the event store
        mock_store = AsyncMock()
        mock_get_store.return_value.__aenter__.return_value = mock_store
        
        event_data = {
            "name": "test_event",
            "attributes": {"key": "value", "number": 42}
        }
        
        response = client.post("/events/", json=event_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "event_id" in data
        assert data["message"] == "Event 'test_event' stored successfully"
        assert "timestamp" in data
    
    @patch("..routes.events.get_event_store")
    def test_create_event_with_timestamp(self, mock_get_store, client):
        """Test event creation with custom timestamp."""
        mock_store = AsyncMock()
        mock_get_store.return_value.__aenter__.return_value = mock_store
        
        custom_time = datetime.now(timezone.utc)
        event_data = {
            "name": "timed_event",
            "attributes": {"test": True},
            "timestamp": custom_time.isoformat()
        }
        
        response = client.post("/events/", json=event_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        # Verify the timestamp matches (allowing for microsecond differences)
        response_time = datetime.fromisoformat(
            data["timestamp"].replace("Z", "+00:00")
        )
        time_diff = abs((response_time - custom_time).total_seconds())
        assert time_diff < 1  # Within 1 second
    
    @patch("..routes.events.get_event_store")
    def test_create_event_store_failure(self, mock_get_store, client):
        """Test event creation with store failure."""
        mock_store = AsyncMock()
        mock_store.save_event.side_effect = Exception("Database error")
        mock_get_store.return_value.__aenter__.return_value = mock_store
        
        event_data = {
            "name": "failing_event",
            "attributes": {}
        }
        
        response = client.post("/events/", json=event_data)
        assert response.status_code == 500
        
        data = response.json()
        assert "Failed to store event" in data["detail"]
    
    def test_create_event_invalid_data(self, client):
        """Test event creation with invalid data."""
        # Missing required 'name' field
        event_data = {
            "attributes": {"key": "value"}
        }
        
        response = client.post("/events/", json=event_data)
        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
class TestAsyncEventEndpoints:
    """Test event endpoints with async client."""
    
    @patch("..routes.events.get_event_store")
    async def test_create_event_async(self, mock_get_store, async_client):
        """Test event creation with async client."""
        mock_store = AsyncMock()
        mock_get_store.return_value.__aenter__.return_value = mock_store
        
        event_data = {
            "name": "async_event",
            "attributes": {"async": True}
        }
        
        response = await async_client.post("/events/", json=event_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Event 'async_event' stored successfully"