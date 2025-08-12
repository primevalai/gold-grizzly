#!/usr/bin/env python3
"""
Event Publisher for Orchestrator Eventing System

This script is triggered by Claude Code hooks to capture and publish events
from agent outputs to configured sinks (filesystem, OTEL collectors, etc.).
"""

import json
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional
import os


class EventSink:
    """Base class for event sinks"""
    def publish(self, event: Dict[str, Any]) -> bool:
        raise NotImplementedError


class FilesystemSink(EventSink):
    """Publishes events to filesystem as JSON files"""
    
    def __init__(self, base_path: str = ".events"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)
    
    def publish(self, event: Dict[str, Any]) -> bool:
        try:
            # Generate filename: <iso8601-utc-slug>-<event-name>-<event-id>.json
            timestamp = datetime.fromisoformat(event["timestamp"].replace('Z', '+00:00'))
            iso_slug = timestamp.strftime("%Y-%m-%dt%H%M%S%fz")[:-3] + 'z'
            
            # Use the span_id from the enriched event (should always exist after enrichment)
            event_id = event["span_id"]
            event_name = event["name"].replace(".", "-").lower()
            
            filename = f"{iso_slug}-{event_name}-{event_id}.json"
            filepath = self.base_path / filename
            
            with open(filepath, 'w') as f:
                json.dump(event, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error publishing to filesystem: {e}", file=sys.stderr)
            return False


class EventPublisher:
    """Main event publisher that processes Claude Code hook input"""
    
    def __init__(self):
        self.sinks: List[EventSink] = [
            FilesystemSink()
        ]
        self.session_trace_id = self._get_or_create_session_trace_id()
    
    def _get_or_create_session_trace_id(self) -> str:
        """Get or create session trace ID"""
        # In a real implementation, this might be stored in a session file
        # For now, generate a new one each time
        return str(uuid.uuid4()).replace('-', '')
    
    def _generate_trace_ids(self) -> Dict[str, str]:
        """Generate OTEL trace and span IDs"""
        return {
            "trace_id": self.session_trace_id,
            "span_id": str(uuid.uuid4()).replace('-', '')[:16],
            "parent_span_id": None  # Would be set for nested spans
        }
    
    def _extract_events_from_output(self, tool_output: str) -> List[Dict[str, Any]]:
        """Extract event markers from tool output"""
        events = []
        
        # Look for <EVENT>...</EVENT> markers
        event_pattern = r'<EVENT>(.*?)</EVENT>'
        matches = re.findall(event_pattern, tool_output, re.DOTALL)
        
        for match in matches:
            try:
                event_data = json.loads(match.strip())
                events.append(event_data)
            except json.JSONDecodeError as e:
                print(f"Invalid event JSON: {e}", file=sys.stderr)
                continue
        
        return events
    
    def _enrich_event(self, event: Dict[str, Any], tool_info: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich event with OTEL compliance and additional context"""
        
        # Generate trace context if not present
        trace_ids = self._generate_trace_ids()
        
        # Base OTEL structure
        enriched = {
            "timestamp": event.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "trace_id": trace_ids["trace_id"],
            "span_id": trace_ids["span_id"],
            "parent_span_id": trace_ids["parent_span_id"],
            "name": event.get("name", "unknown.event"),
            "kind": "SPAN_KIND_INTERNAL",
            "status": {
                "code": "STATUS_CODE_OK"
            },
            "attributes": {}
        }
        
        # Add event attributes
        if "attributes" in event:
            enriched["attributes"].update(event["attributes"])
        
        # Add system context
        enriched["attributes"].update({
            "system.version": "1.0.0",
            "system.source": "claude-code-agent",
            "tool.name": tool_info.get("name", "Task"),
            "tool.status": tool_info.get("status", "unknown")
        })
        
        # Add user context if available
        user_prompt = tool_info.get("input", {}).get("prompt", "")
        if user_prompt:
            enriched["attributes"]["user.prompt"] = user_prompt[:500]  # Truncate for size
        
        return enriched
    
    def process_hook_input(self, hook_data: Dict[str, Any]) -> None:
        """Process Claude Code hook input and publish events"""
        
        try:
            tool_output = hook_data.get("tool_result", {}).get("content", "")
            if not tool_output:
                return
            
            # Extract events from output
            raw_events = self._extract_events_from_output(tool_output)
            if not raw_events:
                return
            
            print(f"Found {len(raw_events)} events to publish", file=sys.stderr)
            
            # Process and publish each event
            for raw_event in raw_events:
                enriched_event = self._enrich_event(raw_event, hook_data)
                
                # Publish to all sinks
                success_count = 0
                for sink in self.sinks:
                    if sink.publish(enriched_event):
                        success_count += 1
                
                event_name = enriched_event.get("name", "unknown")
                if success_count > 0:
                    print(f"Published event: {event_name}", file=sys.stderr)
                else:
                    print(f"Failed to publish event: {event_name}", file=sys.stderr)
                    
        except Exception as e:
            print(f"Error processing hook input: {e}", file=sys.stderr)


def main():
    """Main entry point for the event publisher"""
    
    try:
        # Read hook data from stdin
        hook_input = sys.stdin.read()
        if not hook_input.strip():
            print("No hook input received", file=sys.stderr)
            return
        
        # Parse hook data
        try:
            hook_data = json.loads(hook_input)
        except json.JSONDecodeError as e:
            print(f"Invalid hook input JSON: {e}", file=sys.stderr)
            return
        
        # Process events
        publisher = EventPublisher()
        publisher.process_hook_input(hook_data)
        
    except Exception as e:
        print(f"Event publisher error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()