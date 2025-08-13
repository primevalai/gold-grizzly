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
import urllib.request
import urllib.parse
import urllib.error

def send_to_api(event_name: str, attributes: dict, timestamp: str) -> bool:
    """Send event to FastAPI service using urllib."""
    try:
        event_data = {
            "name": event_name,
            "attributes": attributes,
            "timestamp": timestamp
        }
        
        # Convert to JSON and encode
        json_data = json.dumps(event_data).encode('utf-8')
        
        # Create request
        req = urllib.request.Request(
            "http://127.0.0.1:8000/events/",
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
    
    # Create event with timestamp
    timestamp = datetime.now(timezone.utc).isoformat()
    event = {
        "name": event_name,
        "timestamp": timestamp,
        "attributes": attributes
    }
    
    # Output as EVENT tag for event publisher to process (preserve compatibility)
    print(f'<EVENT>{json.dumps(event)}</EVENT>')
    
    # Try to send to API first, fallback to file storage
    api_success = send_to_api(event_name, attributes, timestamp)
    
    if not api_success:
        print("Falling back to file storage...", file=sys.stderr)
        save_to_file(event)

if __name__ == "__main__":
    main()