#!/usr/bin/env python3
"""
Event Streaming Orchestrator

An autonomous system that streams events from the MCP eventuali server in real-time
and orchestrates work items by invoking Claude Code agents as needed.

Usage:
    uv run .apps/listener/main.py [-v] [-vv] [-vvv]

Verbosity levels:
    (default)  Quiet mode - minimal output
    -v         Basic debug info (event flow)
    -vv        Detailed debug info (event data, commands)
    -vvv       Full trace mode (complete payloads, paths)

Features:
- Streams events in real-time from /events/stream endpoint
- Analyzes event patterns to determine needed work
- Invokes Claude Code agents for complex tasks
- Runs autonomously with graceful shutdown
"""

import argparse
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

# Global verbosity level
VERBOSITY_LEVEL = 0

def debug_print(message: str, level: int = 1, prefix: str = "🐛"):
    """Print debug message if verbosity level is met."""
    if VERBOSITY_LEVEL >= level:
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] {prefix} {message}")
        sys.stdout.flush()


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
    
    def __init__(self, verbosity: int = 0):
        global VERBOSITY_LEVEL
        VERBOSITY_LEVEL = verbosity
        
        self.event_processor = EventProcessor()
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
                    if event_id in self.event_processor.processed_events:
                        debug_print(f"Event {event_id[:8]} already processed, skipping", 2, "⏩")
                        continue
                    
                    debug_print(f"Event {event_id[:8]} is NEW, processing...", 1, "✨")
                    
                    # Process the event
                    await self._process_event(event_data)
                    
                    # Mark as processed
                    if event_id:
                        self.event_processor.processed_events.add(event_id)
                        debug_print(f"Event {event_id[:8]} marked as processed", 2, "✓")
                
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
            event_id = event.get("event_id", "unknown")
            
            debug_print(f"Processing event: {event_type} from {aggregate_type}", 1)
            debug_print(f"Event name: {event_name} | ID: {event_id}", 2)
            debug_print(f"Event attributes: {json.dumps(attributes, indent=2)}", 3)
            
            logger.debug(f"Processing event: {event_type} ({aggregate_type}.{event_name})")
            
            # Check if this event should trigger an event-handler agent
            handler_name = f"{event_name}-handler"
            debug_print(f"Checking for handler: {handler_name}", 1)
            
            # if await self._event_handler_exists(handler_name):
            #     debug_print(f"Handler found! Invoking {handler_name}", 1, "⚙️")
            #     await self._invoke_event_handler(handler_name, event)
            #     return
            # else:
            #     debug_print(f"No handler found for {handler_name}, proceeding with default processing", 1, "⚠️")
            
            debug_print(f"Invoking {handler_name}", 1, "⚙️")
            await self._invoke_event_handler(handler_name, event)
            return
            
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
    
    async def _event_handler_exists(self, handler_name: str) -> bool:
        """Check if an event-handler agent exists for the given handler name."""
        try:
            handler_path = Path(f".claude/agents/event-handlers/{handler_name}.md")
            debug_print(f"Checking handler path: {handler_path.resolve()}", 2)
            
            exists = handler_path.exists()
            debug_print(f"Handler {'EXISTS' if exists else 'NOT FOUND'}: {handler_name}", 1, "🔍" if exists else "❌")
            
            if not exists and VERBOSITY_LEVEL >= 2:
                # Show what files are actually available for debugging
                handlers_dir = Path(".claude/agents/event-handlers")
                if handlers_dir.exists():
                    available = list(handlers_dir.glob("*.md"))
                    debug_print(f"Available handlers: {[f.stem for f in available]}", 2)
                else:
                    debug_print("Event handlers directory does not exist!", 2, "⚠️")
            
            return exists
        except Exception as e:
            debug_print(f"Error checking handler {handler_name}: {e}", 1, "❌")
            logger.error(f"Error checking for event handler {handler_name}: {e}")
            return False
    
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
            
            # Determine the project root directory
            project_root = str(Path(__file__).parent.parent.parent)
            debug_print(f"Project root: {project_root}", 2)
            
            # Build the command
            cmd = [
                "/home/user01/.volta/tools/image/node/24.5.0/bin/claude",
                "--add-dir", project_root,
                "--dangerously-skip-permissions",
                "--print",
                prompt
            ]
            
            debug_print(f"Executing command: {' '.join(cmd[:4])} [prompt]", 2)
            debug_print(f"Full command: {cmd}", 3)
            debug_print(f"Working directory: {project_root}", 2)
            
            # Execute Claude Code with the specific agent
            result = subprocess.run(
                cmd,
                capture_output=True, 
                text=True,
                cwd=project_root,
                timeout=300  # 5 minute timeout for event handlers
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
                    id=f"workflowInitiator-{event.get('event_id', 'unknown')[:8]}", # come back here, use the str(uuid.uuid4()) if this does not work
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
                self.event_processor.work_queue.append(work_item)
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
                parent_agent_id="listener",
                attributes={
                    "work_item_id": work_item.id,
                    "description": work_item.description
                }
            )
            
            # For workflowInitiator agents, execute the command directly using Claude Code
            if work_item.agent_type == "workflowInitiator":
                command = work_item.context.get("command", "")
                if command:
                    print(f"🎯 Invoking workflowInitiator agent with command: '{command}'")
                    sys.stdout.flush()
                    
                    # Execute Claude Code with workflowInitiator agent
                    try:
                        # Determine the project root directory
                        project_root = str(Path(__file__).parent.parent.parent)
                        
                        # Use subprocess to call Claude CLI with simple command prompt
                        result = subprocess.run([
                            "/home/user01/.volta/tools/image/node/24.5.0/bin/claude",
                            "--add-dir", project_root,  # Grant access to project directory
                            "--dangerously-skip-permissions", # Ya, that's the stuff
                            "--print",  # Non-interactive mode
                            f"{command} IMPORTANT! Save any ouput to the .output directory."  # Pass command directly
                        ], 
                        capture_output=True, 
                        text=True,
                        cwd=project_root,  # Set working directory to project root
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
                                "stdout": result.stdout[:1000] if result.stdout else "",  # Limit output size
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


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Event Streaming Orchestrator - listens for events and triggers handlers",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Verbosity levels:
  (default)  Quiet mode - minimal output
  -v         Basic debug info (event flow, handler detection)
  -vv        Detailed debug info (event data, commands, paths)
  -vvv       Full trace mode (complete payloads, all subprocess details)"""
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="count",
        default=0,
        help="Increase verbosity (use -v, -vv, or -vvv)"
    )
    
    return parser.parse_args()

async def main():
    """Main entry point."""
    args = parse_args()
    
    # Set logging level based on verbosity
    if args.verbose >= 3:
        logging.basicConfig(level=logging.DEBUG, force=True)
    elif args.verbose >= 1:
        logging.basicConfig(level=logging.INFO, force=True)
    
    logger.info(f"Event Orchestrator starting with verbosity level {args.verbose}...")
    
    # Check if we're in the right directory
    # if not Path(".apps/listener").exists():
    #     logger.error("Must run from the project root directory")
    #     sys.exit(1)
    
    # Create and start the orchestrator with verbosity level
    orchestrator = EventOrchestrator(verbosity=args.verbose)
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