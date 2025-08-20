#!/usr/bin/env python3
"""
Event Streaming Orchestrator

An autonomous system that streams events from the MCP eventuali server in real-time
and orchestrates work items by invoking Claude Code agents as needed.

Usage:
    uv run .apps/listener/event-orchestrator.py

Features:
- Streams events in real-time from /events/stream endpoint
- Analyzes event patterns to determine needed work
- Invokes Claude Code agents for complex tasks
- Runs autonomously with graceful shutdown
"""

import asyncio
import json
import logging
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass

# Add the MCP client path so we can import it
mcp_path = Path(__file__).parent.parent / 'mcp'
sys.path.insert(0, str(mcp_path))
from client import EventAPIClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class WorkItem:
    """Represents a work item to be processed."""
    id: str
    description: str
    agent_type: str
    context: Dict[str, Any]
    priority: int = 1
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc)


class EventProcessor:
    """Processes streaming events and manages work items."""
    
    def __init__(self):
        self.event_api_client = EventAPIClient("http://127.0.0.1:8765")
        self.processed_events: Set[str] = set()
        self.work_queue: List[WorkItem] = []
    
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
    
    async def close(self):
        """Close the event processor."""
        await self.event_api_client.close()


class EventOrchestrator:
    """Main orchestrator class that streams events and creates work items."""
    
    def __init__(self):
        self.event_processor = EventProcessor()
        self.running = False
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.running = False
    
    async def start(self):
        """Start the orchestrator with event streaming."""
        logger.info("Starting Event Streaming Orchestrator...")
        
        self.running = True
        
        try:
            # Start processing work queue in background
            work_processor_task = asyncio.create_task(self._work_processor_loop())
            
            # Start streaming events (debug mode - just print to stdout)
            await self._stream_and_process()
            
            # Wait for work processor to finish
            work_processor_task.cancel()
            try:
                await work_processor_task
            except asyncio.CancelledError:
                pass
        
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
        
        finally:
            await self.event_processor.close()
            logger.info("Event Orchestrator stopped")
        
        return True
    
    async def _stream_and_process(self):
        """Stream events and write them to stdout for debugging."""
        logger.info("Starting event stream...")
        print("🎧 Event Orchestrator listening for events...")
        print("=" * 60)
        sys.stdout.flush()
        
        try:
            async for stream_item in self.event_processor.event_api_client.stream_events():
                if not self.running:
                    break
                
                # Print all stream items to stdout for debugging
                timestamp = datetime.now().strftime("%H:%M:%S")
                
                if stream_item.event == "event_created":
                    event_data = stream_item.data
                    event_type = event_data.get("event_type", "unknown")
                    event_name = event_data.get("event_name", "")
                    aggregate_type = event_data.get("aggregate_type", "")
                    
                    print(f"\n[{timestamp}] 📨 EVENT RECEIVED")
                    print(f"   Type: {event_type}")
                    print(f"   Aggregate: {aggregate_type}")
                    print(f"   Name: {event_name}")
                    print(f"   Data: {json.dumps(event_data, indent=2)}")
                    print("-" * 40)
                    sys.stdout.flush()
                    
                    # Skip if already processed
                    event_id = event_data.get("event_id")
                    if event_id in self.event_processor.processed_events:
                        continue
                    
                    # Process the event
                    await self._process_event(event_data)
                    
                    # Mark as processed
                    if event_id:
                        self.event_processor.processed_events.add(event_id)
                
                elif stream_item.event == "heartbeat":
                    print(f"[{timestamp}] 💓 Heartbeat")
                    sys.stdout.flush()
                
                elif stream_item.event == "error":
                    print(f"\n[{timestamp}] ❌ STREAM ERROR")
                    print(f"   Error: {json.dumps(stream_item.data, indent=2)}")
                    print("-" * 40)
                    sys.stdout.flush()
        
        except Exception as e:
            logger.error(f"Error in event streaming: {e}")
            print(f"\n❌ Connection error: {e}")
            print("🔄 Retrying in 5 seconds...")
            if self.running:
                # Wait a bit before retrying
                await asyncio.sleep(5)
                # Recursively retry streaming
                await self._stream_and_process()
    
    async def _work_processor_loop(self):
        """Background loop to process work queue."""
        while self.running:
            try:
                await self._process_work_queue()
                await asyncio.sleep(2)  # Check work queue every 2 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in work processor: {e}")
                await asyncio.sleep(5)
    
    async def _process_event(self, event: Dict[str, Any]):
        """Process a single event and create work items as needed."""
        try:
            event_type = event.get("event_type", "")
            aggregate_type = event.get("aggregate_type", "")
            event_name = event.get("event_name", "")
            attributes = event.get("attributes", {})
            
            logger.debug(f"Processing event: {event_type} ({aggregate_type}.{event_name})")
            
            # Agent event processing
            if aggregate_type == "agent_aggregate":
                await self._handle_agent_event(event)
            
            # Workflow event processing
            elif aggregate_type == "workflow_aggregate":
                await self._handle_workflow_event(event)
            
            # System event processing
            elif aggregate_type == "system_aggregate":
                await self._handle_system_event(event)
            
            else:
                logger.debug(f"Unhandled event type: {aggregate_type}")
        
        except Exception as e:
            logger.error(f"Error processing event: {e}")
    
    async def _handle_agent_event(self, event: Dict[str, Any]):
        """Handle agent-specific events."""
        event_name = event.get("event_name", "")
        agent_name = event.get("agent_name", "")
        logger.debug(f"Handling agent event: {agent_name} - {event_name}")
        # For now, just log agent events - can be extended later
    
    async def _handle_workflow_event(self, event: Dict[str, Any]):
        """Handle workflow-specific events."""
        event_name = event.get("event_name", "")
        workflow_id = event.get("workflow_id", "")
        logger.debug(f"Handling workflow event: {workflow_id} - {event_name}")
        # For now, just log workflow events - can be extended later
    
    async def _handle_system_event(self, event: Dict[str, Any]):
        """Handle system-specific events."""
        event_name = event.get("event_name", "")
        attributes = event.get("attributes", {})
        
        # Handle system events that start with "system."
        if event_name.startswith("system."):
            command = attributes.get("command", "")
            if command:
                # Create a workflow-orchestrator work item with the command as the prompt
                work_item = WorkItem(
                    id=f"workflow-orchestrator-{int(time.time())}-{event.get('event_id', 'unknown')[:8]}",
                    description=f"Execute system command via workflow-orchestrator: {command}",
                    agent_type="workflow-orchestrator",
                    context={
                        "command": command,
                        "original_event": event,
                        "session_id": attributes.get("session_id", "default"),
                        "source": attributes.get("source", "unknown")
                    },
                    priority=3  # High priority for system commands
                )
                self.event_processor.work_queue.append(work_item)
                logger.info(f"Created workflow-orchestrator work item for system command: {command}")
                print(f"🎯 Creating workflow-orchestrator task for command: '{command}'")
                sys.stdout.flush()
        
        # Example: System maintenance or health check events
        elif event_name in ["error", "warning"]:
            work_item = WorkItem(
                id=f"system-check-{int(time.time())}",
                description=f"Investigate system event: {event_name}",
                agent_type="general-purpose",
                context={
                    "system_event": event
                },
                priority=2
            )
            self.event_processor.work_queue.append(work_item)
            logger.info(f"Created system check work item for: {event_name}")
    
    async def _process_work_queue(self):
        """Process items in the work queue."""
        if not self.event_processor.work_queue:
            return
        
        # Sort by priority (higher number = higher priority)
        self.event_processor.work_queue.sort(key=lambda x: x.priority, reverse=True)
        
        # Process work items (limit concurrent processing)
        max_concurrent = 2
        processed = 0
        
        while self.event_processor.work_queue and processed < max_concurrent:
            work_item = self.event_processor.work_queue.pop(0)
            await self._execute_work_item(work_item)
            processed += 1
    # 
    async def _execute_work_item(self, work_item: WorkItem):
        """Execute a work item by invoking a Claude Code agent."""
        try:
            logger.info(f"Executing work item: {work_item.description}")
            print(f"🚀 Executing: {work_item.description}")
            sys.stdout.flush()
            
            # Generate agent context IDs
            agent_id = f"{work_item.agent_type}-{int(time.time())}-{work_item.id.split('-')[-1][:8]}"
            workflow_id = work_item.context.get("workflow_id") or f"orchestrator-{int(time.time())}"
            
            # Emit agent started event
            await self.event_processor.emit_agent_event(
                agent_id=agent_id,
                agent_name=work_item.agent_type,
                event_name="started",
                workflow_id=workflow_id,
                parent_agent_id="event-orchestrator",
                attributes={
                    "work_item_id": work_item.id,
                    "description": work_item.description
                }
            )
            
            # For workflow-orchestrator agents, execute the command directly using Claude Code
            if work_item.agent_type == "workflow-orchestrator":
                command = work_item.context.get("command", "")
                if command:
                    print(f"🎯 Invoking workflow-orchestrator agent with command: '{command}'")
                    sys.stdout.flush()
                    
                    # Execute Claude Code with workflow-orchestrator agent
                    try:
                        # Determine the project root directory
                        project_root = str(Path(__file__).parent.parent.parent)
                        
                        # Use subprocess to call Claude CLI with simple command prompt
                        result = subprocess.run([
                            "/home/user01/.volta/tools/image/node/24.5.0/bin/claude",
                            "--add-dir", project_root,  # Grant access to project directory
                            "--print",  # Non-interactive mode
                            command  # Pass command directly
                        ], 
                        capture_output=True, 
                        text=True,
                        cwd=project_root,  # Set working directory to project root
                        timeout=36000  # 10 hour timeout
                        )
                        
                        success = result.returncode == 0
                        message = f"Command executed with return code {result.returncode}"
                        
                        if result.stdout:
                            print(f"📄 Workflow-orchestrator output:\n{result.stdout}")
                        if result.stderr:
                            print(f"⚠️ Workflow-orchestrator stderr:\n{result.stderr}")
                        
                        # Emit completion event
                        await self.event_processor.emit_agent_event(
                            agent_id=agent_id,
                            agent_name=work_item.agent_type,
                            event_name="completed" if success else "failed",
                            workflow_id=workflow_id,
                            parent_agent_id="event-orchestrator",
                            attributes={
                                "success": success,
                                "message": message,
                                "work_item_id": work_item.id,
                                "command": command,
                                "return_code": result.returncode,
                                "stdout": result.stdout[:1000] if result.stdout else "",  # Limit output size
                                "stderr": result.stderr[:1000] if result.stderr else ""
                            }
                        )
                        
                        print(f"✅ Workflow-orchestrator agent completed with success: {success}")
                        
                    except subprocess.TimeoutExpired:
                        logger.error(f"Workflow-orchestrator agent timed out for command: {command}")
                        await self.event_processor.emit_agent_event(
                            agent_id=agent_id,
                            agent_name=work_item.agent_type,
                            event_name="failed",
                            workflow_id=workflow_id,
                            parent_agent_id="event-orchestrator",
                            attributes={
                                "success": False,
                                "message": "Agent execution timed out",
                                "work_item_id": work_item.id,
                                "command": command
                            }
                        )
                    
                    except Exception as e:
                        logger.error(f"Error executing workflow-orchestrator agent: {e}")
                        await self.event_processor.emit_agent_event(
                            agent_id=agent_id,
                            agent_name=work_item.agent_type,
                            event_name="failed",
                            workflow_id=workflow_id,
                            parent_agent_id="event-orchestrator",
                            attributes={
                                "success": False,
                                "message": f"Agent execution failed: {str(e)}",
                                "work_item_id": work_item.id,
                                "command": command
                            }
                        )
            
            else:
                # For other agent types, just log for now
                logger.info(f"Would invoke {work_item.agent_type} agent with context: {agent_id}")
                await asyncio.sleep(1)  # Simulate processing time
                
                await self.event_processor.emit_agent_event(
                    agent_id=agent_id,
                    agent_name=work_item.agent_type,
                    event_name="completed",
                    workflow_id=workflow_id,
                    parent_agent_id="event-orchestrator",
                    attributes={
                        "success": True,
                        "message": f"Work item processed: {work_item.description}",
                        "work_item_id": work_item.id
                    }
                )
            
            sys.stdout.flush()
            
        except Exception as e:
            logger.error(f"Error executing work item {work_item.id}: {e}")
            print(f"❌ Error executing work item: {e}")
            sys.stdout.flush()


async def main():
    """Main entry point."""
    logger.info("Event Orchestrator starting...")
    
    # Check if we're in the right directory
    # if not Path(".apps/listener").exists():
    #     logger.error("Must run from the project root directory")
    #     sys.exit(1)
    
    # Create and start the orchestrator
    orchestrator = EventOrchestrator()
    success = await orchestrator.start()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)