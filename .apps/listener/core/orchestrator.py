"""Main event orchestrator for streaming and processing events."""

import asyncio
import json
import logging
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from core.processor import EventProcessor
from handlers.registry import HandlerRegistry
from handlers.pool import HandlerPool
from models.work_items import WorkItem
from services.deduplicator import EventDeduplicator
from services.batcher import EventBatcher
from dependencies.config import config

logger = logging.getLogger(__name__)

# Global verbosity level for debug_print function
VERBOSITY_LEVEL = 0


def debug_print(message: str, level: int = 1, prefix: str = "🐛"):
    """Print debug message if verbosity level is met."""
    if VERBOSITY_LEVEL >= level:
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] {prefix} {message}")
        sys.stdout.flush()


class EventOrchestrator:
    """Main orchestrator class that streams events and creates work items."""
    
    def __init__(self, verbosity: int = 0):
        """Initialize the orchestrator."""
        global VERBOSITY_LEVEL
        VERBOSITY_LEVEL = verbosity
        
        # Update config verbosity
        config.verbosity = verbosity
        
        # Initialize components
        self.event_processor = EventProcessor()
        self.handler_registry = HandlerRegistry()
        self.handler_pool = HandlerPool(pool_size=3)  # Placeholder for future
        self.deduplicator = EventDeduplicator(ttl_seconds=300)  # Placeholder for future
        self.batcher = EventBatcher(batch_window_ms=100, max_batch_size=10)  # Placeholder for future
        
        self.running = False
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        debug_print(f"EventOrchestrator initialized with verbosity level {verbosity}", 1)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.running = False
    
    async def start(self):
        """Start the orchestrator with event streaming."""
        logger.info("Starting Event Streaming Orchestrator...")
        
        self.running = True
        
        try:
            # Start handler pool (placeholder for future)
            await self.handler_pool.start()
            
            # Start processing work queue in background
            work_processor_task = asyncio.create_task(self._work_processor_loop())
            
            # Start streaming events
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
            await self._shutdown()
            logger.info("Event Orchestrator stopped")
        
        return True
    
    async def _shutdown(self):
        """Gracefully shutdown all components."""
        try:
            await self.handler_pool.shutdown()
            await self.event_processor.close()
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
    
    async def _stream_and_process(self):
        """Stream events and process them."""
        logger.info("Starting event stream...")
        print("🎧 Event Orchestrator listening for events...")
        print("=" * 60)
        debug_print("Event stream starting, connecting to MCP server", 1, "🔌")
        debug_print(f"MCP client endpoint: {self.event_processor.event_api_client}", 2)
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
                    event_id = event_data.get("event_id", "unknown")
                    
                    debug_print(f"Raw stream event received: {stream_item.event}", 2, "📡")
                    debug_print(f"Event data keys: {list(event_data.keys())}", 3)
                    
                    print(f"\n[{timestamp}] 📨 EVENT RECEIVED")
                    print(f"   Type: {event_type}")
                    print(f"   Aggregate: {aggregate_type}")
                    print(f"   Name: {event_name}")
                    print(f"   Data: {json.dumps(event_data, indent=2)}")
                    print("-" * 40)
                    
                    debug_print(f"Stream event ID: {event_id}", 2)
                    debug_print(f"Full event data: {json.dumps(event_data, indent=2)}", 3)
                    sys.stdout.flush()
                    
                    # Skip if already processed
                    if self.event_processor.is_event_processed(event_id):
                        debug_print(f"Event {event_id[:8]} already processed, skipping", 2, "⏩")
                        continue
                    
                    debug_print(f"Event {event_id[:8]} is NEW, processing...", 1, "✨")
                    
                    # Process the event
                    await self._process_event(event_data)
                    
                    # Mark as processed
                    self.event_processor.mark_event_processed(event_id)
                
                elif stream_item.event == "heartbeat":
                    print(f"[{timestamp}] 💓 Heartbeat")
                    debug_print("Stream heartbeat received - connection alive", 3, "💓")
                    sys.stdout.flush()
                
                elif stream_item.event == "error":
                    print(f"\n[{timestamp}] ❌ STREAM ERROR")
                    print(f"   Error: {json.dumps(stream_item.data, indent=2)}")
                    print("-" * 40)
                    debug_print(f"Stream error data: {stream_item.data}", 1, "❌")
                    sys.stdout.flush()
                
                else:
                    debug_print(f"Unknown stream event type: {stream_item.event}", 2, "❓")
        
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
                await asyncio.sleep(config.work_queue_check_interval)
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
            event_id = event.get("event_id", "unknown")
            
            debug_print(f"Processing event: {event_type} from {aggregate_type}", 1)
            debug_print(f"Event name: {event_name} | ID: {event_id}", 2)
            debug_print(f"Event attributes: {json.dumps(attributes, indent=2)}", 3)
            
            logger.debug(f"Processing event: {event_type} ({aggregate_type}.{event_name})")
            
            # Check if this event should trigger an event-handler agent
            handler_name = f"{event_name}-handler"
            debug_print(f"Checking for handler: {handler_name}", 1)
            
            debug_print(f"Invoking {handler_name}", 1, "⚙️")
            await self._invoke_event_handler(handler_name, event)
            return
            
            # Legacy event processing (currently disabled)
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
    
    async def _invoke_event_handler(self, handler_name: str, event: Dict[str, Any]):
        """Invoke an event-handler agent with the event payload."""
        try:
            logger.info(f"Invoking event handler: {handler_name}")
            print(f"🎯 Invoking event handler: {handler_name}")
            debug_print(f"Handler invocation starting for: {handler_name}", 1, "🚀")
            debug_print(f"Event being passed to handler: {event.get('event_id', 'unknown')}", 2)
            sys.stdout.flush()
            
            # Prepare the event context block for Claude Code to process
            event_context = json.dumps(event, indent=2)
            prompt = f"""Execute the {handler_name} agent for the following event:
===EVENT_CONTEXT===
{event_context}
===END_CONTEXT==="""  
            
            debug_print(f"Generated prompt length: {len(prompt)} chars", 2)
            debug_print(f"Full prompt for handler:\n{prompt}", 3)
            
            # Build the command
            cmd = [
                config.claude_binary,
                "--add-dir", str(config.get_project_root()),
                "--dangerously-skip-permissions",
                "--print",
                prompt
            ]
            
            debug_print(f"Executing command: {' '.join(cmd[:4])} [prompt]", 2)
            debug_print(f"Full command: {cmd}", 3)
            debug_print(f"Working directory: {config.get_project_root()}", 2)
            
            # Execute Claude Code with the specific agent
            result = subprocess.run(
                cmd,
                capture_output=True, 
                text=True,
                cwd=str(config.get_project_root()),
                timeout=config.handler_timeout
            )
            
            success = result.returncode == 0
            
            debug_print(f"Handler execution completed with return code: {result.returncode}", 1)
            debug_print(f"Handler stdout length: {len(result.stdout) if result.stdout else 0} chars", 2)
            debug_print(f"Handler stderr length: {len(result.stderr) if result.stderr else 0} chars", 2)
            
            if result.stdout:
                print(f"📄 Event handler output:\n{result.stdout}")
                debug_print(f"Full stdout:\n{result.stdout}", 3)
            if result.stderr:
                print(f"⚠️ Event handler stderr:\n{result.stderr}")
                debug_print(f"Full stderr:\n{result.stderr}", 3)
            
            logger.info(f"Event handler {handler_name} completed with success: {success}")
            print(f"{'✅' if success else '❌'} Event handler {handler_name} completed")
            debug_print(f"Handler {handler_name} final status: {'SUCCESS' if success else 'FAILED'}", 1, "✅" if success else "❌")
            
        except subprocess.TimeoutExpired:
            logger.error(f"Event handler {handler_name} timed out")
            print(f"⏱️ Event handler {handler_name} timed out")
        
        except Exception as e:
            logger.error(f"Error invoking event handler {handler_name}: {e}")
            print(f"❌ Error invoking event handler {handler_name}: {e}")
        
        finally:
            sys.stdout.flush()
    
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
                # Create a workflowInitiator work item with the command as the prompt
                work_item = WorkItem(
                    id=f"workflowInitiator-{event.get('event_id', 'unknown')[:8]}",
                    description=f"Execute system command via workflowInitiator: {command}",
                    agent_type="workflowInitiator",
                    context={
                        "command": command,
                        "original_event": event,
                        "session_id": attributes.get("session_id", "default"),
                        "source": attributes.get("source", "unknown")
                    },
                    priority=3  # High priority for system commands
                )
                self.event_processor.add_work_item(work_item)
                logger.info(f"Created workflowInitiator work item for system command: {command}")
                print(f"🎯 Creating workflowInitiator task for command: '{command}'")
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
            self.event_processor.add_work_item(work_item)
            logger.info(f"Created system check work item for: {event_name}")
    
    async def _process_work_queue(self):
        """Process items in the work queue."""
        work_queue = self.event_processor.get_pending_work()
        if not work_queue:
            return
        
        # Sort by priority (higher number = higher priority)
        work_queue.sort(key=lambda x: x.priority, reverse=True)
        
        # Process work items (limit concurrent processing)
        max_concurrent = 2
        processed = 0
        
        # Clear the work queue and process items
        self.event_processor.work_queue.clear()
        
        for work_item in work_queue[:max_concurrent]:
            await self._execute_work_item(work_item)
            processed += 1
        
        # Add back unprocessed items
        if len(work_queue) > max_concurrent:
            self.event_processor.work_queue.extend(work_queue[max_concurrent:])
    
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
                parent_agent_id="listener",
                attributes={
                    "work_item_id": work_item.id,
                    "description": work_item.description
                }
            )
            
            # For workflowInitiator agents, execute the command directly using Claude Code
            if work_item.agent_type == "workflowInitiator":
                await self._execute_workflow_initiator(work_item, agent_id, workflow_id)
            else:
                # For other agent types, just log for now
                logger.info(f"Would invoke {work_item.agent_type} agent with context: {agent_id}")
                await asyncio.sleep(1)  # Simulate processing time
                
                await self.event_processor.emit_agent_event(
                    agent_id=agent_id,
                    agent_name=work_item.agent_type,
                    event_name="completed",
                    workflow_id=workflow_id,
                    parent_agent_id="listener",
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
    
    async def _execute_workflow_initiator(self, work_item: WorkItem, agent_id: str, workflow_id: str):
        """Execute a workflowInitiator work item."""
        command = work_item.context.get("command", "")
        if not command:
            return
        
        print(f"🎯 Invoking workflowInitiator agent with command: '{command}'")
        sys.stdout.flush()
        
        try:
            # Use subprocess to call Claude CLI with simple command prompt
            result = subprocess.run([
                config.claude_binary,
                "--add-dir", str(config.get_project_root()),
                "--dangerously-skip-permissions",
                "--print",
                f"{command} IMPORTANT! Save any output to the .output directory."
            ], 
            capture_output=True, 
            text=True,
            cwd=str(config.get_project_root()),
            timeout=36000  # 10 hour timeout
            )
            
            success = result.returncode == 0
            message = f"Command executed with return code {result.returncode}"
            
            if result.stdout:
                print(f"📄 workflowInitiator output:\n{result.stdout}")
            if result.stderr:
                print(f"⚠️ workflowInitiator stderr:\n{result.stderr}")
            
            # Emit completion event
            await self.event_processor.emit_agent_event(
                agent_id=agent_id,
                agent_name=work_item.agent_type,
                event_name="completed" if success else "failed",
                workflow_id=workflow_id,
                parent_agent_id="listener",
                attributes={
                    "success": success,
                    "message": message,
                    "work_item_id": work_item.id,
                    "command": command,
                    "return_code": result.returncode,
                    "stdout": result.stdout[:1000] if result.stdout else "",
                    "stderr": result.stderr[:1000] if result.stderr else ""
                }
            )
            
            print(f"✅ workflowInitiator agent completed with success: {success}")
            
        except subprocess.TimeoutExpired:
            logger.error(f"workflowInitiator agent timed out for command: {command}")
            await self.event_processor.emit_agent_event(
                agent_id=agent_id,
                agent_name=work_item.agent_type,
                event_name="failed",
                workflow_id=workflow_id,
                parent_agent_id="listener",
                attributes={
                    "success": False,
                    "message": "Agent execution timed out",
                    "work_item_id": work_item.id,
                    "command": command
                }
            )
        
        except Exception as e:
            logger.error(f"Error executing workflowInitiator agent: {e}")
            await self.event_processor.emit_agent_event(
                agent_id=agent_id,
                agent_name=work_item.agent_type,
                event_name="failed",
                workflow_id=workflow_id,
                parent_agent_id="listener",
                attributes={
                    "success": False,
                    "message": f"Agent execution failed: {str(e)}",
                    "work_item_id": work_item.id,
                    "command": command
                }
            )