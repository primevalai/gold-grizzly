#!/usr/bin/env python3
"""
Event emitter script for agents to publish events.
Usage: python3 emit-event.py <event_name> [--attr key=value ...]
"""

import sys
import json
from datetime import datetime, timezone
from pathlib import Path
import uuid

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 emit-event.py <event_name> [--attr key=value ...]", file=sys.stderr)
        sys.exit(1)
    
    event_name = sys.argv[1]
    
    # Parse attributes
    attributes = {}
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
        else:
            i += 1
    
    # Create event
    event = {
        "name": event_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "attributes": attributes
    }
    
    # Output as EVENT tag for event publisher to process
    print(f'<EVENT>{json.dumps(event)}</EVENT>')
    
    # Also save directly to .events folder as backup
    events_dir = Path(".events")
    events_dir.mkdir(exist_ok=True)
    
    # Generate filename
    timestamp_slug = datetime.now(timezone.utc).strftime('%Y-%m-%dt%H%M%S%f')[:-3]
    event_slug = event_name.replace(".", "-").lower()
    event_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp_slug}-{event_slug}-{event_id}.json"
    
    # Add OTEL fields
    event["trace_id"] = uuid.uuid4().hex
    event["span_id"] = uuid.uuid4().hex[:16]
    event["kind"] = "SPAN_KIND_INTERNAL"
    event["status"] = {"code": "STATUS_CODE_OK"}
    
    # Save to file
    filepath = events_dir / filename
    with open(filepath, 'w') as f:
        json.dump(event, f, indent=2)
    
    print(f"Event emitted: {event_name} -> {filepath}", file=sys.stderr)

if __name__ == "__main__":
    main()