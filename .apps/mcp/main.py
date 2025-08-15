"""FastMCP server for eventuali event system integration."""

import asyncio
import logging
import os
from collections import deque
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, AsyncGenerator

from mcp.server import FastMCP
from pydantic import ValidationError

from client import EventAPIClient
from models import (
    AgentEventRequest,
    WorkflowEventRequest,
    SystemEventRequest,
    StartAgentRequest,
    CompleteAgentRequest,
    StartWorkflowRequest,
    CompleteWorkflowRequest,
    GetEventsRequest,
    EventResponse,
    EventsResponse,
    HealthResponse,
    StreamEventItem,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastMCP server
mcp = FastMCP("eventuali-mcp")

# Global API client and event buffer
api_client: Optional[EventAPIClient] = None
event_buffer: deque = deque(maxlen=1000)  # Buffer for recent events
streaming_task: Optional[asyncio.Task] = None
event_subscribers: List[asyncio.Queue] = []


async def get_api_client() -> EventAPIClient:
    """Get or create the API client."""
    global api_client
    if api_client is None:
        base_url = os.getenv("EVENT_API_URL", "http://127.0.0.1:8765")
        api_client = EventAPIClient(base_url)
    return api_client


async def start_event_streaming():
    """Start the background event streaming task."""
    global streaming_task
    if streaming_task is None or streaming_task.done():
        streaming_task = asyncio.create_task(event_streaming_loop())
        logger.info("Event streaming task started")


async def event_streaming_loop():
    """Background task that streams events from the API and buffers them."""
    global event_buffer, event_subscribers
    
    while True:
        try:
            client = await get_api_client()
            logger.info("Starting event stream connection...")
            
            async for stream_item in client.stream_events():
                # Add to buffer
                event_buffer.append(stream_item)
                
                # Notify subscribers
                dead_queues = []
                for queue in event_subscribers:
                    try:
                        queue.put_nowait(stream_item)
                    except asyncio.QueueFull:
                        # Skip if queue is full
                        continue
                    except Exception:
                        # Mark dead queues for removal
                        dead_queues.append(queue)
                
                # Remove dead queues
                for dead_queue in dead_queues:
                    if dead_queue in event_subscribers:
                        event_subscribers.remove(dead_queue)
                
                logger.debug(f"Processed stream event: {stream_item.event}")
        
        except Exception as e:
            logger.error(f"Event streaming error: {e}")
            # Wait before retrying
            await asyncio.sleep(5)


async def subscribe_to_events() -> AsyncGenerator[StreamEventItem, None]:
    """Subscribe to real-time events."""
    global event_subscribers
    
    # Create a queue for this subscriber
    queue = asyncio.Queue(maxsize=100)
    event_subscribers.append(queue)
    
    try:
        # Send buffered events first
        for buffered_event in list(event_buffer):
            yield buffered_event
        
        # Then stream new events
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield event
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                yield StreamEventItem(
                    event="heartbeat",
                    data={
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "status": "connected"
                    }
                )
    finally:
        # Clean up subscriber
        if queue in event_subscribers:
            event_subscribers.remove(queue)


# MCP Tools (for actions)

@mcp.tool()
async def emit_agent_event(request: AgentEventRequest) -> EventResponse:
    """Emit an agent lifecycle or action event.
    
    This tool allows agents to emit events about their lifecycle (started, completed, failed)
    or specific actions they are performing. The event will be stored in the agent aggregate
    and can be retrieved later for analysis and debugging.
    """
    client = await get_api_client()
    
    # Construct the full event name
    event_name = f"agent.{request.agent_name}.{request.event_name}"
    
    # Prepare attributes
    attributes = dict(request.attributes)
    attributes["agent_name"] = request.agent_name
    
    try:
        response = await client.emit_event(
            event_name=event_name,
            attributes=attributes,
            aggregate_id=request.agent_id,
            causation_id=request.parent_agent_id,
            correlation_id=request.workflow_id,
        )
        logger.info(f"Emitted agent event: {event_name} for {request.agent_id}")
        return response
    except Exception as e:
        logger.error(f"Failed to emit agent event: {e}")
        return EventResponse(
            success=False,
            message=f"Failed to emit agent event: {str(e)}",
            timestamp=datetime.now(timezone.utc)
        )


@mcp.tool()
async def emit_workflow_event(request: WorkflowEventRequest) -> EventResponse:
    """Emit a workflow lifecycle or coordination event.
    
    This tool allows emitting events related to workflow management such as workflow
    started, agent added to workflow, or workflow completed. These events help track
    the overall progress of user-initiated workflows.
    """
    client = await get_api_client()
    
    # Construct the full event name
    event_name = f"workflow.{request.event_name}"
    
    # Prepare attributes
    attributes = dict(request.attributes)
    if request.user_prompt:
        attributes["user_prompt"] = request.user_prompt
    
    try:
        response = await client.emit_event(
            event_name=event_name,
            attributes=attributes,
            correlation_id=request.workflow_id,
        )
        logger.info(f"Emitted workflow event: {event_name} for {request.workflow_id}")
        return response
    except Exception as e:
        logger.error(f"Failed to emit workflow event: {e}")
        return EventResponse(
            success=False,
            message=f"Failed to emit workflow event: {str(e)}",
            timestamp=datetime.now(timezone.utc)
        )


@mcp.tool()
async def emit_system_event(request: SystemEventRequest) -> EventResponse:
    """Emit a system-level event.
    
    This tool allows emitting system-level events such as session started/ended,
    configuration changes, or other system-wide operations. These events are grouped
    by session ID for tracking.
    """
    client = await get_api_client()
    
    # Construct the full event name
    event_name = f"system.{request.event_name}"
    
    # Prepare attributes
    attributes = dict(request.attributes)
    if request.session_id:
        attributes["session_id"] = request.session_id
    
    try:
        response = await client.emit_event(
            event_name=event_name,
            attributes=attributes,
        )
        logger.info(f"Emitted system event: {event_name}")
        return response
    except Exception as e:
        logger.error(f"Failed to emit system event: {e}")
        return EventResponse(
            success=False,
            message=f"Failed to emit system event: {str(e)}",
            timestamp=datetime.now(timezone.utc)
        )


@mcp.tool()
async def start_agent(request: StartAgentRequest) -> EventResponse:
    """Start a new agent instance with proper context.
    
    This is a convenience tool that emits an 'agent.started' event with the proper
    agent metadata. It should be called when an agent is first initialized.
    """
    agent_request = AgentEventRequest(
        agent_id=request.agent_id,
        event_name="started",
        agent_name=request.agent_name,
        parent_agent_id=request.parent_agent_id,
        workflow_id=request.workflow_id,
        attributes={
            "agent_name": request.agent_name,
            "agent_id": request.agent_id,
            "parent_agent_id": request.parent_agent_id or "",
            "workflow_id": request.workflow_id or "",
            "start_time": datetime.now(timezone.utc).isoformat(),
        }
    )
    
    return await emit_agent_event(agent_request)


@mcp.tool()
async def complete_agent(request: CompleteAgentRequest) -> EventResponse:
    """Complete an agent instance.
    
    This is a convenience tool that emits an 'agent.completed' or 'agent.failed' event
    depending on the success parameter. It should be called when an agent finishes its work.
    """
    event_name = "completed" if request.success else "failed"
    
    agent_request = AgentEventRequest(
        agent_id=request.agent_id,
        agent_name=request.agent_name,
        event_name=event_name,
        parent_agent_id=request.parent_agent_id,
        workflow_id=request.workflow_id,
        attributes={
            "success": request.success,
            "message": request.message or "",
            "end_time": datetime.now(timezone.utc).isoformat(),
        }
    )
    
    return await emit_agent_event(agent_request)


@mcp.tool()
async def start_workflow(request: StartWorkflowRequest) -> EventResponse:
    """Start a new workflow.
    
    This is a convenience tool that emits a 'workflow.started' event with the user prompt
    and workflow metadata. It should be called when a new workflow is initiated.
    """
    workflow_request = WorkflowEventRequest(
        workflow_id=request.workflow_id,
        event_name="started",
        user_prompt=request.user_prompt,
        attributes={
            "workflow_id": request.workflow_id,
            "user_prompt": request.user_prompt,
            "start_time": datetime.now(timezone.utc).isoformat(),
        }
    )
    
    return await emit_workflow_event(workflow_request)


@mcp.tool()
async def complete_workflow(request: CompleteWorkflowRequest) -> EventResponse:
    """Complete a workflow.
    
    This is a convenience tool that emits a 'workflow.completed' or 'workflow.failed' event
    depending on the success parameter. It should be called when a workflow finishes.
    """
    event_name = "completed" if request.success else "failed"
    
    workflow_request = WorkflowEventRequest(
        workflow_id=request.workflow_id,
        event_name=event_name,
        attributes={
            "success": request.success,
            "message": request.message or "",
            "end_time": datetime.now(timezone.utc).isoformat(),
        }
    )
    
    return await emit_workflow_event(workflow_request)


# MCP Resources (for data access)

@mcp.resource("events://recent")
async def get_recent_events() -> EventsResponse:
    """Get recent events across all aggregates.
    
    This resource provides access to recent events. Returns the latest 50 events
    for an overview of system activity.
    """
    client = await get_api_client()
    
    try:
        response = await client.get_events(limit=50, offset=0)
        logger.info(f"Retrieved {len(response.events)} recent events")
        return response
    except Exception as e:
        logger.error(f"Failed to get recent events: {e}")
        return EventsResponse(
            events=[],
            total=0,
            limit=50,
            offset=0
        )


@mcp.resource("events://agent/{agent_id}")
async def get_agent_events(agent_id: str) -> EventsResponse:
    """Get all events for a specific agent.
    
    This resource provides access to all events associated with a specific agent instance,
    useful for debugging agent behavior and tracking agent lifecycle.
    """
    client = await get_api_client()
    
    try:
        response = await client.get_agent_events(agent_id, 100)
        logger.info(f"Retrieved {len(response.events)} events for agent {agent_id}")
        return response
    except Exception as e:
        logger.error(f"Failed to get agent events: {e}")
        return EventsResponse(
            events=[],
            total=0,
            limit=100,
            offset=0
        )


@mcp.resource("events://workflow/{workflow_id}")
async def get_workflow_events(workflow_id: str) -> EventsResponse:
    """Get all events for a specific workflow.
    
    This resource provides access to all events associated with a specific workflow,
    useful for tracking workflow progress and debugging workflow issues.
    """
    client = await get_api_client()
    
    try:
        response = await client.get_workflow_events(workflow_id, 100)
        logger.info(f"Retrieved {len(response.events)} events for workflow {workflow_id}")
        return response
    except Exception as e:
        logger.error(f"Failed to get workflow events: {e}")
        return EventsResponse(
            events=[],
            total=0,
            limit=100,
            offset=0
        )


@mcp.resource("events://system/{session_id}")
async def get_system_events(session_id: str) -> EventsResponse:
    """Get all system events for a specific session.
    
    This resource provides access to system-level events for a specific session,
    useful for tracking system behavior and configuration changes.
    """
    client = await get_api_client()
    
    try:
        response = await client.get_system_events(session_id, 100)
        logger.info(f"Retrieved {len(response.events)} system events for session {session_id}")
        return response
    except Exception as e:
        logger.error(f"Failed to get system events: {e}")
        return EventsResponse(
            events=[],
            total=0,
            limit=100,
            offset=0
        )


@mcp.resource("workflow://{workflow_id}/agents")
async def get_workflow_agents(workflow_id: str) -> List[Dict[str, Any]]:
    """Get all agents that participated in a specific workflow.
    
    This resource provides a list of all agents that were part of a specific workflow,
    useful for understanding workflow composition and agent coordination.
    """
    client = await get_api_client()
    
    try:
        agents = await client.get_workflow_agents(workflow_id)
        logger.info(f"Retrieved {len(agents)} agents for workflow {workflow_id}")
        return agents
    except Exception as e:
        logger.error(f"Failed to get workflow agents: {e}")
        return []


@mcp.resource("events://stream")
async def stream_events() -> AsyncGenerator[StreamEventItem, None]:
    """Stream real-time events from the event system.
    
    This resource provides a real-time stream of events from the eventuali system.
    It first sends any buffered events, then streams new events as they arrive.
    """
    # Ensure streaming is started
    await start_event_streaming()
    
    # Subscribe to event stream
    async for event in subscribe_to_events():
        yield event


@mcp.resource("health://status")
async def health_check() -> HealthResponse:
    """Check the health of the event API and MCP server.
    
    This resource provides health status information for both the MCP server
    and the underlying event API connection.
    """
    client = await get_api_client()
    
    try:
        health = await client.health_check()
        logger.info(f"Health check: {health.status}")
        return health
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="error",
            timestamp=datetime.now(timezone.utc),
            api_connected=False
        )


async def cleanup():
    """Cleanup function called on server shutdown."""
    global api_client, streaming_task, event_subscribers
    
    # Cancel streaming task
    if streaming_task and not streaming_task.done():
        streaming_task.cancel()
        try:
            await streaming_task
        except asyncio.CancelledError:
            pass
        logger.info("Event streaming task cancelled")
    
    # Clear subscribers
    event_subscribers.clear()
    
    # Close API client
    if api_client:
        await api_client.close()
        logger.info("API client closed")


async def main():
    """Main entry point for the MCP server."""
    logger.info("Starting eventuali MCP server")
    logger.info(f"Event API URL: {os.getenv('EVENT_API_URL', 'http://127.0.0.1:8765')}")
    
    try:
        # Run the FastMCP server with stdio communication
        await mcp.run_stdio_async()
    finally:
        # Cleanup on exit
        await cleanup()


if __name__ == "__main__":
    asyncio.run(main())