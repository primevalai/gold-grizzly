#!/usr/bin/env python3
"""
Event Publisher for Claude Code Agent Eventing System

Captures and processes events from agent output, saving them to the filesystem
with OpenTelemetry-compliant structure.
"""

import json
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
import traceback


class EventPublisher:
    """Processes and publishes events from Claude Code agent output."""
    
    def __init__(self, events_dir: str = ".events"):
        self.events_dir = Path(events_dir)
        self.events_dir.mkdir(exist_ok=True)
        self.event_pattern = re.compile(r'<EVENT>(.*?)</EVENT>', re.DOTALL)
        
        # OTEL trace context (would normally come from CC environment)
        self.trace_id = self._generate_trace_id()
        self.span_id = self._generate_span_id()
        
    def _generate_trace_id(self) -> str:
        """Generate a 32-character hex trace ID."""
        return uuid.uuid4().hex
    
    def _generate_span_id(self) -> str:
        """Generate a 16-character hex span ID."""
        return uuid.uuid4().hex[:16]
    
    def _parse_events_from_output(self, output: str) -> List[Dict[str, Any]]:
        """Extract event JSON from agent output."""
        events = []
        
        for match in self.event_pattern.finditer(output):
            try:
                event_json = match.group(1).strip()
                event = json.loads(event_json)
                events.append(event)
            except json.JSONDecodeError as e:
                print(f"Warning: Failed to parse event JSON: {e}", file=sys.stderr)
                print(f"Event content: {match.group(1)[:100]}...", file=sys.stderr)
                continue
        
        return events
    
    def _enrich_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Add OTEL compliance fields to event."""
        # Ensure timestamp
        if 'timestamp' not in event:
            event['timestamp'] = datetime.now(timezone.utc).isoformat()
        
        # Add OTEL fields
        event['trace_id'] = self.trace_id
        event['span_id'] = self._generate_span_id()
        event['parent_span_id'] = self.span_id
        
        # Add span kind and status if not present
        if 'kind' not in event:
            event['kind'] = 'SPAN_KIND_INTERNAL'
        
        if 'status' not in event:
            # Determine status from event name
            if 'error' in event.get('name', '').lower() or 'failed' in event.get('name', '').lower():
                event['status'] = {'code': 'STATUS_CODE_ERROR'}
            else:
                event['status'] = {'code': 'STATUS_CODE_OK'}
        
        # Ensure attributes exist
        if 'attributes' not in event:
            event['attributes'] = {}
        
        # Add agent metadata if available
        if 'name' in event:
            parts = event['name'].split('.')
            if len(parts) >= 2:
                event['attributes']['agent.name'] = parts[0]
                event['attributes']['event.type'] = parts[1]
        
        return event
    
    def _generate_filename(self, event: Dict[str, Any]) -> str:
        """Generate filename for event."""
        # Parse timestamp and convert to slug format
        timestamp = event.get('timestamp', datetime.now(timezone.utc).isoformat())
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            timestamp_slug = dt.strftime('%Y-%m-%dt%H%M%S%fZ').lower()[:-3]  # Remove microseconds
        except:
            timestamp_slug = datetime.now(timezone.utc).strftime('%Y-%m-%dt%H%M%S%fZ').lower()[:-3]
        
        # Get event name
        event_name = event.get('name', 'unknown').replace('.', '-').lower()
        
        # Generate unique ID (last 8 chars of span_id)
        event_id = event.get('span_id', uuid.uuid4().hex[:16])[-8:]
        
        return f"{timestamp_slug}-{event_name}-{event_id}.json"
    
    def publish_event(self, event: Dict[str, Any]) -> Optional[Path]:
        """Save event to filesystem."""
        try:
            enriched_event = self._enrich_event(event)
            filename = self._generate_filename(enriched_event)
            filepath = self.events_dir / filename
            
            with open(filepath, 'w') as f:
                json.dump(enriched_event, f, indent=2, default=str)
            
            return filepath
        except Exception as e:
            print(f"Error publishing event: {e}", file=sys.stderr)
            return None
    
    def process_agent_output(self, output: str) -> int:
        """Process agent output and publish all events found."""
        events = self._parse_events_from_output(output)
        
        if not events:
            print("No events found in agent output", file=sys.stderr)
            return 0
        
        published_count = 0
        for event in events:
            filepath = self.publish_event(event)
            if filepath:
                print(f"Published event: {filepath}", file=sys.stderr)
                published_count += 1
        
        return published_count


def main():
    """Main entry point for event publisher."""
    try:
        # Read input from stdin (agent output from Claude Code)
        input_data = sys.stdin.read()
        
        # Try to parse as JSON (Claude Code tool output format)
        try:
            tool_output = json.loads(input_data)
            # Extract the actual agent output
            if isinstance(tool_output, dict):
                # Look for agent output in various possible fields
                agent_output = (
                    tool_output.get('output', '') or
                    tool_output.get('result', '') or
                    tool_output.get('content', '') or
                    str(tool_output)
                )
            else:
                agent_output = str(tool_output)
        except json.JSONDecodeError:
            # If not JSON, treat as raw text
            agent_output = input_data
        
        # Initialize publisher
        publisher = EventPublisher()
        
        # Process events
        count = publisher.process_agent_output(agent_output)
        
        print(f"Successfully published {count} events", file=sys.stderr)
        
        # Pass through the original output
        sys.stdout.write(input_data)
        
        return 0
        
    except Exception as e:
        print(f"Event publisher error: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        
        # Pass through the original input even on error
        try:
            sys.stdout.write(input_data)
        except:
            pass
        
        return 1


if __name__ == "__main__":
    sys.exit(main())