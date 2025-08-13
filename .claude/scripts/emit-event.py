#!/usr/bin/env python3
"""
Event emitter script for agents to publish events.
Usage: python3 emit-event.py <event_name> [options]

Options:
  --attr key=value      Event attributes (can be used multiple times)
  --aggregate-id ID     Aggregate ID (defaults to generated UUID for event aggregate)
  --causation-id ID     Causation ID (for parent-child relationships)
  --correlation-id ID   Correlation ID (for workflow grouping)
"""

import sys
import json
from datetime import datetime, timezone
from pathlib import Path
import uuid
import urllib.request
import urllib.parse
import urllib.error

def send_to_api(event_name: str, attributes: dict, timestamp: str, 
                aggregate_id: str = None, causation_id: str = None, 
                correlation_id: str = None) -> bool:
    """Send event to FastAPI service using urllib."""
    try:
        event_data = {
            "name": event_name,
            "attributes": attributes,
            "timestamp": timestamp
        }
        
        # Add aggregate management fields if provided
        if aggregate_id:
            event_data["aggregate_id"] = aggregate_id
        if causation_id:
            event_data["causation_id"] = causation_id
        if correlation_id:
            event_data["correlation_id"] = correlation_id
        
        # Convert to JSON and encode
        json_data = json.dumps(event_data).encode('utf-8')
        
        # Create request
        req = urllib.request.Request(
            "http://127.0.0.1:8765/events/",
            data=json_data,
            headers={'Content-Type': 'application/json'}
        )
        
        # Send request with timeout
        with urllib.request.urlopen(req, timeout=5.0) as response:
            if response.status == 200:
                response_data = json.loads(response.read().decode('utf-8'))
                print(f"API Response: {response_data['message']}", file=sys.stderr)
                return True
            else:
                response_text = response.read().decode('utf-8')
                print(f"API Error: {response.status} - {response_text}", file=sys.stderr)
                return False
                
    except urllib.error.URLError as e:
        print(f"API Connection failed: {str(e)}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"API request failed: {str(e)}", file=sys.stderr)
        return False


def save_to_file(event: dict) -> None:
    """Fallback: save event to file system."""
    events_dir = Path(".events")
    events_dir.mkdir(exist_ok=True)
    
    # Add OTEL fields
    event["trace_id"] = uuid.uuid4().hex
    event["span_id"] = uuid.uuid4().hex[:16]
    event["kind"] = "SPAN_KIND_INTERNAL"
    event["status"] = {"code": "STATUS_CODE_OK"}
    
    # Generate daily log filename
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    filename = f"{today}.log"
    
    # Save to daily JSONL file
    filepath = events_dir / filename
    with open(filepath, 'a') as f:
        f.write(json.dumps(event) + '\n')
    
    print(f"Event saved to file: {event['name']} -> {filepath}", file=sys.stderr)


def validate_event_name(event_name: str) -> None:
    """Validate that event name follows the three-aggregate naming convention."""
    valid_prefixes = ["agent.", "workflow.", "system."]
    
    if not any(event_name.startswith(prefix) for prefix in valid_prefixes):
        print(f"ERROR: Event name must start with one of: {', '.join(valid_prefixes)}", file=sys.stderr)
        print(f"Got: {event_name}", file=sys.stderr)
        print("", file=sys.stderr)
        print("Examples:", file=sys.stderr)
        print("  agent.lolRecorder.started", file=sys.stderr)
        print("  workflow.started", file=sys.stderr)  
        print("  system.session_started", file=sys.stderr)
        sys.exit(1)
    
    # Additional validation based on event type
    if event_name.startswith("agent."):
        parts = event_name.split(".")
        if len(parts) < 3:
            print("ERROR: Agent events must follow format: agent.<agentName>.<eventName>", file=sys.stderr)
            print(f"Got: {event_name}", file=sys.stderr)
            sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("ERROR: emit-event.py called without parameters", file=sys.stderr)
        print("", file=sys.stderr)
        print("Usage: uv run .claude/scripts/emit-event.py <event_name> [options]", file=sys.stderr)
        print("Options:")
        print("  --attr key=value      Event attributes (can be used multiple times)")
        print("  --aggregate-id ID     Aggregate ID (required for agent events)")
        print("  --causation-id ID     Causation ID (for parent-child relationships)")
        print("  --correlation-id ID   Correlation ID (required for workflow events)")
        print("", file=sys.stderr)
        print("Event naming convention:")
        print("  agent.<agentName>.<eventName>  - Agent lifecycle and actions")
        print("  workflow.<eventName>           - Workflow lifecycle")
        print("  system.<eventName>             - System-level events")
        print("", file=sys.stderr)
        
        # Check if this might be an auto-spawn scenario
        if not sys.stdin.isatty():
            print("INFO: Non-interactive context detected", file=sys.stderr)
            print("INFO: This may be Claude Code auto-spawning the script incorrectly", file=sys.stderr)
            print("INFO: Agents should extract AGENT_ID from ===AGENT_CONTEXT=== blocks", file=sys.stderr)
            print("INFO: Check CLAUDE.md for proper agent invocation protocol", file=sys.stderr)
        
        sys.exit(1)
    
    event_name = sys.argv[1]
    
    # Validate event name follows naming convention
    validate_event_name(event_name)
    
    # Parse arguments
    attributes = {}
    aggregate_id = None
    causation_id = None
    correlation_id = None
    
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--attr" and i + 1 < len(sys.argv):
            key_value = sys.argv[i + 1]
            if "=" in key_value:
                key, value = key_value.split("=", 1)
                # Try to parse as JSON for complex types
                try:
                    attributes[key] = json.loads(value)
                except:
                    attributes[key] = value
            i += 2
        elif sys.argv[i] == "--aggregate-id" and i + 1 < len(sys.argv):
            aggregate_id = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--causation-id" and i + 1 < len(sys.argv):
            causation_id = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--correlation-id" and i + 1 < len(sys.argv):
            correlation_id = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    # Additional validation based on event type
    if event_name.startswith("agent."):
        if not aggregate_id or aggregate_id.strip() == "":
            print("ERROR: Agent events require --aggregate-id parameter with non-empty value", file=sys.stderr)
            print(f"Event: {event_name}", file=sys.stderr)
            print("HELP: Ensure AGENT_ID is extracted from ===AGENT_CONTEXT=== block in agent prompt", file=sys.stderr)
            print("HELP: Check that Claude Code provided proper context when invoking this agent", file=sys.stderr)
            
            # Check if this might be an auto-spawn scenario
            if not sys.stdin.isatty():
                print("INFO: Non-interactive context detected - possible auto-spawn by Claude Code", file=sys.stderr)
                print("INFO: This script should be called with proper parameters by agents", file=sys.stderr)
            
            sys.exit(1)
    
    if event_name.startswith("workflow."):
        if not correlation_id or correlation_id.strip() == "":
            print("ERROR: Workflow events require --correlation-id parameter with non-empty value", file=sys.stderr)
            print(f"Event: {event_name}", file=sys.stderr)
            print("HELP: Ensure WORKFLOW_ID is extracted from ===AGENT_CONTEXT=== block in agent prompt", file=sys.stderr)
            sys.exit(1)
    
    # Create event with timestamp
    timestamp = datetime.now(timezone.utc).isoformat()
    event = {
        "name": event_name,
        "timestamp": timestamp,
        "attributes": attributes
    }
    
    # Add aggregate management fields if provided
    if aggregate_id:
        event["aggregate_id"] = aggregate_id
    if causation_id:
        event["causation_id"] = causation_id
    if correlation_id:
        event["correlation_id"] = correlation_id
    
    # Output as EVENT tag for event publisher to process (preserve compatibility)
    print(f'<EVENT>{json.dumps(event)}</EVENT>')
    
    # Try to send to API first, fallback to file storage
    api_success = send_to_api(event_name, attributes, timestamp, 
                              aggregate_id, causation_id, correlation_id)
    
    if not api_success:
        print("Falling back to file storage...", file=sys.stderr)
        save_to_file(event)

if __name__ == "__main__":
    main()