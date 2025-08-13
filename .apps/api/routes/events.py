"""Event API routes."""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Annotated, Dict, Any, AsyncGenerator, List

from eventuali import Event, EventStore, Aggregate
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from dependencies.database import get_event_store, db_manager
from models.events import EventRequest, EventResponse, HealthResponse

router = APIRouter(prefix="/events", tags=["events"])


# GenericEvent removed - all events must use Agent, Workflow, or System event classes


class AgentEvent(Event):
    """Event class specifically for agent lifecycle and actions."""
    
    # Agent-specific fields
    agent_name: str = ""
    agent_id: str = ""
    parent_agent_id: str = ""
    workflow_id: str = ""
    event_name: str = ""
    attributes: Dict[str, Any] = {}
    
    def get_event_type(self) -> str:
        return self.event_name if self.event_name else "agent_event"


# EventAggregate removed - all events must belong to Agent, Workflow, or System aggregates


class AgentAggregate(Aggregate):
    """Aggregate for managing agent instances and their lifecycle."""
    
    # Define Pydantic fields for the aggregate state
    agent_name: str = ""
    agent_id: str = ""
    parent_agent_id: str = ""
    workflow_id: str = ""
    status: str = "initialized"  # initialized, started, running, completed, failed
    start_time: str = ""
    end_time: str = ""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def start_agent(self, agent_name: str, agent_id: str, parent_id: str = None, 
                   workflow_id: str = None) -> None:
        """Initialize and start an agent instance."""
        event = AgentEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            agent_name=agent_name,
            agent_id=agent_id,
            parent_agent_id=parent_id or "",
            workflow_id=workflow_id or "",
            event_name="agent.started",
            attributes={
                "agent_name": agent_name,
                "agent_id": agent_id,
                "parent_agent_id": parent_id,
                "workflow_id": workflow_id
            }
        )
        self.apply(event)
    
    def emit_agent_event(self, event_name: str, attributes: Dict[str, Any] = None) -> None:
        """Emit an agent-specific event."""
        event = AgentEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            agent_name=self.agent_name,
            agent_id=self.agent_id,
            parent_agent_id=self.parent_agent_id,
            workflow_id=self.workflow_id,
            event_name=event_name,
            attributes=attributes or {}
        )
        self.apply(event)
    
    def complete_agent(self, success: bool = True, message: str = "") -> None:
        """Mark agent as completed or failed."""
        status = "completed" if success else "failed"
        event = AgentEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            agent_name=self.agent_name,
            agent_id=self.agent_id,
            parent_agent_id=self.parent_agent_id,
            workflow_id=self.workflow_id,
            event_name=f"agent.{status}",
            attributes={
                "success": success,
                "message": message,
                "end_time": datetime.now(timezone.utc).isoformat()
            }
        )
        self.apply(event)
    
    # Apply methods for agent events
    def apply_agent_started(self, event: AgentEvent) -> None:
        """Apply agent started event."""
        self.agent_name = event.agent_name
        self.agent_id = event.agent_id
        self.parent_agent_id = event.parent_agent_id
        self.workflow_id = event.workflow_id
        self.status = "started"
        self.start_time = datetime.now(timezone.utc).isoformat()
    
    def apply_agent_completed(self, event: AgentEvent) -> None:
        """Apply agent completed event."""
        self.status = "completed"
        self.end_time = event.attributes.get("end_time", "")
    
    def apply_agent_failed(self, event: AgentEvent) -> None:
        """Apply agent failed event."""
        self.status = "failed"
        self.end_time = event.attributes.get("end_time", "")
    
    def apply_generic_agent_event(self, event: AgentEvent) -> None:
        """Apply any agent event (for custom agent events)."""
        # Update status to running if not already set
        if self.status == "started":
            self.status = "running"
    
    def __getattr__(self, name: str):
        """Dynamically handle apply methods for any agent event type."""
        if name.startswith('apply_'):
            # Return a generic handler for any apply method
            return self.apply_generic_agent_event
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    @classmethod
    def get_aggregate_type(cls) -> str:
        return "agent_aggregate"


class WorkflowEvent(Event):
    """Event class for workflow lifecycle and coordination."""
    
    workflow_id: str = ""
    user_prompt: str = ""
    event_name: str = ""
    attributes: Dict[str, Any] = {}
    
    def get_event_type(self) -> str:
        return self.event_name if self.event_name else "workflow_event"


class WorkflowAggregate(Aggregate):
    """Aggregate for managing user-initiated workflows."""
    
    # Define Pydantic fields for the aggregate state
    workflow_id: str = ""
    user_prompt: str = ""
    agent_ids: list = []
    status: str = "initialized"  # initialized, started, running, completed
    start_time: str = ""
    end_time: str = ""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def start_workflow(self, workflow_id: str, user_prompt: str) -> None:
        """Start a new workflow."""
        event = WorkflowEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            workflow_id=workflow_id,
            user_prompt=user_prompt,
            event_name="workflow.started",
            attributes={
                "workflow_id": workflow_id,
                "user_prompt": user_prompt,
                "start_time": datetime.now(timezone.utc).isoformat()
            }
        )
        self.apply(event)
    
    def add_agent(self, agent_id: str, agent_name: str) -> None:
        """Add an agent to this workflow."""
        event = WorkflowEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            workflow_id=self.workflow_id,
            event_name="workflow.agent_added",
            attributes={
                "agent_id": agent_id,
                "agent_name": agent_name
            }
        )
        self.apply(event)
    
    def complete_workflow(self, success: bool = True, message: str = "") -> None:
        """Complete the workflow."""
        status = "completed" if success else "failed"
        event = WorkflowEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            workflow_id=self.workflow_id,
            event_name=f"workflow.{status}",
            attributes={
                "success": success,
                "message": message,
                "end_time": datetime.now(timezone.utc).isoformat(),
                "total_agents": len(self.agent_ids)
            }
        )
        self.apply(event)
    
    # Apply methods for workflow events
    def apply_workflow_started(self, event: WorkflowEvent) -> None:
        """Apply workflow started event."""
        self.workflow_id = event.workflow_id
        self.user_prompt = event.user_prompt
        self.status = "started"
        self.start_time = event.attributes.get("start_time", "")
    
    def apply_workflow_agent_added(self, event: WorkflowEvent) -> None:
        """Apply agent added to workflow event."""
        agent_id = event.attributes.get("agent_id")
        if agent_id and agent_id not in self.agent_ids:
            self.agent_ids.append(agent_id)
        if self.status == "started":
            self.status = "running"
    
    def apply_workflow_completed(self, event: WorkflowEvent) -> None:
        """Apply workflow completed event."""
        self.status = "completed"
        self.end_time = event.attributes.get("end_time", "")
    
    def apply_workflow_failed(self, event: WorkflowEvent) -> None:
        """Apply workflow failed event."""
        self.status = "failed"
        self.end_time = event.attributes.get("end_time", "")
    
    def __getattr__(self, name: str):
        """Dynamically handle apply methods for any workflow event type."""
        if name.startswith('apply_'):
            # Return a no-op for unknown workflow events
            return lambda event: None
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    @classmethod
    def get_aggregate_type(cls) -> str:
        return "workflow_aggregate"


class SystemEvent(Event):
    """Event class for system-level events."""
    
    session_id: str = ""
    event_name: str = ""
    attributes: Dict[str, Any] = {}
    
    def get_event_type(self) -> str:
        return self.event_name if self.event_name else "system_event"


class SystemAggregate(Aggregate):
    """Aggregate for managing system-level events and session lifecycle."""
    
    # Define Pydantic fields for the aggregate state
    session_id: str = ""
    start_time: str = ""
    end_time: str = ""
    environment: Dict[str, Any] = {}
    status: str = "initialized"  # initialized, started, running, ended
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def start_session(self, session_id: str, environment: Dict[str, Any] = None) -> None:
        """Start a new session."""
        event = SystemEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            session_id=session_id,
            event_name="system.session_started",
            attributes={
                "session_id": session_id,
                "environment": environment or {},
                "start_time": datetime.now(timezone.utc).isoformat()
            }
        )
        self.apply(event)
    
    def emit_system_event(self, event_name: str, attributes: Dict[str, Any] = None) -> None:
        """Emit a system event."""
        event = SystemEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            session_id=self.session_id,
            event_name=event_name,
            attributes=attributes or {}
        )
        self.apply(event)
    
    def end_session(self, message: str = "") -> None:
        """End the session."""
        event = SystemEvent(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            aggregate_type=self.get_aggregate_type(),
            session_id=self.session_id,
            event_name="system.session_ended",
            attributes={
                "message": message,
                "end_time": datetime.now(timezone.utc).isoformat()
            }
        )
        self.apply(event)
    
    # Apply methods for system events
    def apply_system_session_started(self, event: SystemEvent) -> None:
        """Apply session started event."""
        self.session_id = event.session_id
        self.environment = event.attributes.get("environment", {})
        self.status = "started"
        self.start_time = event.attributes.get("start_time", "")
    
    def apply_system_session_ended(self, event: SystemEvent) -> None:
        """Apply session ended event."""
        self.status = "ended"
        self.end_time = event.attributes.get("end_time", "")
    
    def apply_generic_system_event(self, event: SystemEvent) -> None:
        """Apply any system event."""
        # Update status to running if not already set
        if self.status == "started":
            self.status = "running"
    
    def __getattr__(self, name: str):
        """Dynamically handle apply methods for any system event type."""
        if name.startswith('apply_'):
            # Return a generic handler for any system event
            return self.apply_generic_system_event
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    @classmethod
    def get_aggregate_type(cls) -> str:
        return "system_aggregate"


@router.post("/", response_model=EventResponse)
async def create_event(
    event_request: EventRequest,
    store: Annotated[EventStore, Depends(get_event_store)]
) -> EventResponse:
    """Create and store a new event using the three-aggregate system."""
    try:
        # Set timestamp if not provided
        timestamp = event_request.timestamp or datetime.now(timezone.utc)
        
        # Generate unique event ID
        event_id = str(uuid.uuid4())
        
        # Determine aggregate type and route event accordingly
        event_name = event_request.name
        
        if event_name.startswith("agent."):
            # Agent events - use aggregate_id as agent instance ID
            if not event_request.aggregate_id:
                raise HTTPException(
                    status_code=400,
                    detail="Agent events require aggregate_id parameter"
                )
            
            # Check if aggregate exists, if not create it
            try:
                aggregate = await store.load(event_request.aggregate_id)
                if not aggregate or aggregate.get_aggregate_type() != "agent_aggregate":
                    # Create new agent aggregate
                    aggregate = AgentAggregate(id=event_request.aggregate_id)
            except:
                # Create new agent aggregate if load fails
                aggregate = AgentAggregate(id=event_request.aggregate_id)
            
            # Create agent event
            event = AgentEvent(
                event_id=event_id,
                aggregate_id=event_request.aggregate_id,
                aggregate_type="agent_aggregate",
                agent_name=event_name.split(".")[1] if "." in event_name else "",
                agent_id=event_request.aggregate_id,
                parent_agent_id=event_request.causation_id or "",
                workflow_id=event_request.correlation_id or "",
                event_name=event_name,
                attributes=event_request.attributes
            )
            
            aggregate.apply(event)
            
        elif event_name.startswith("workflow."):
            # Workflow events - use correlation_id as workflow ID
            if not event_request.correlation_id:
                raise HTTPException(
                    status_code=400,
                    detail="Workflow events require correlation_id parameter"
                )
            
            # Check if aggregate exists, if not create it
            try:
                aggregate = await store.load(event_request.correlation_id)
                if not aggregate or aggregate.get_aggregate_type() != "workflow_aggregate":
                    aggregate = WorkflowAggregate(id=event_request.correlation_id)
            except:
                aggregate = WorkflowAggregate(id=event_request.correlation_id)
            
            # Create workflow event
            event = WorkflowEvent(
                event_id=event_id,
                aggregate_id=event_request.correlation_id,
                aggregate_type="workflow_aggregate",
                workflow_id=event_request.correlation_id,
                user_prompt=event_request.attributes.get("user_prompt", ""),
                event_name=event_name,
                attributes=event_request.attributes
            )
            
            aggregate.apply(event)
            
        elif event_name.startswith("system."):
            # System events - use session-based aggregation
            session_id = event_request.attributes.get("session_id", "default_session")
            aggregate_id = f"system_{session_id}"
            
            # Check if aggregate exists, if not create it
            try:
                aggregate = await store.load(aggregate_id)
                if not aggregate or aggregate.get_aggregate_type() != "system_aggregate":
                    aggregate = SystemAggregate(id=aggregate_id)
            except:
                aggregate = SystemAggregate(id=aggregate_id)
            
            # Create system event
            event = SystemEvent(
                event_id=event_id,
                aggregate_id=aggregate_id,
                aggregate_type="system_aggregate",
                session_id=session_id,
                event_name=event_name,
                attributes=event_request.attributes
            )
            
            aggregate.apply(event)
            
        else:
            # Reject events that don't match the three-aggregate pattern
            raise HTTPException(
                status_code=400,
                detail=f"Event name must start with 'agent.', 'workflow.', or 'system.'. Got: {event_name}"
            )
        
        # Store aggregate in eventuali
        await store.save(aggregate)
        
        return EventResponse(
            success=True,
            event_id=event_id,
            message=f"Event '{event_request.name}' stored successfully in {aggregate.get_aggregate_type()}",
            timestamp=timestamp
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store event: {str(e)}"
        )


async def event_stream() -> AsyncGenerator[Dict[str, Any], None]:
    """Stream events via Server-Sent Events."""
    last_check = datetime.now(timezone.utc)
    
    while True:
        try:
            # Get recent events since last check
            events = await db_manager.get_recent_events(limit=50)
            
            # Send events that are newer than last check
            for event in events:
                event_time_str = event.get('timestamp')
                if event_time_str:
                    event_time = datetime.fromisoformat(
                        event_time_str.replace('Z', '+00:00')
                    )
                    if event_time > last_check:
                        yield {
                            "event": "event_created",
                            "data": json.dumps(event),
                            "id": event.get('event_id', ''),
                        }
            
            # Update last check time
            last_check = datetime.now(timezone.utc)
            
            # Send heartbeat to keep connection alive
            yield {
                "event": "heartbeat",
                "data": json.dumps({
                    "timestamp": last_check.isoformat(),
                    "status": "connected"
                }),
            }
            
            # Wait before next poll
            await asyncio.sleep(2)
            
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }),
            }
            await asyncio.sleep(5)


@router.get("/stream")
async def stream_events():
    """Stream events using Server-Sent Events."""
    return EventSourceResponse(event_stream())


@router.get("/", response_model=List[Dict[str, Any]])
async def get_events(
    limit: int = 100,
    offset: int = 0,
    event_type: str = None
) -> List[Dict[str, Any]]:
    """Get events with pagination and filtering."""
    return await db_manager.get_recent_events(
        limit=limit,
        offset=offset,
        event_type=event_type
    )


@router.get("/agents/{agent_id}", response_model=List[Dict[str, Any]])
async def get_agent_events(agent_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Get all events for a specific agent aggregate."""
    return await db_manager.get_agent_events(agent_id, limit)


@router.get("/workflows/{workflow_id}", response_model=List[Dict[str, Any]])
async def get_workflow_events(workflow_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Get all events for a specific workflow aggregate."""
    return await db_manager.get_workflow_events(workflow_id, limit)


@router.get("/workflows/{workflow_id}/agents", response_model=List[Dict[str, Any]])
async def get_workflow_agents(workflow_id: str) -> List[Dict[str, Any]]:
    """Get all agents that participated in a specific workflow."""
    return await db_manager.get_workflow_agents(workflow_id)


@router.get("/system/{session_id}", response_model=List[Dict[str, Any]])
async def get_system_events(session_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Get all system events for a specific session."""
    return await db_manager.get_system_events(session_id, limit)


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc)
    )