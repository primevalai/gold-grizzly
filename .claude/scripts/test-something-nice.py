#!/usr/bin/env python3
"""
Test Event Generator for Something Nice Workflow

This script generates test events to demonstrate the event-handler agent pattern
by emitting a workflow.saySomethingNiceRequested event that will trigger the
complete event handler chain.

Usage:
    uv run .claude/scripts/test-something-nice.py [options]

Options:
    --recipient NAME      Recipient of the nice message (default: Alice)  
    --occasion OCCASION   Occasion for the message (default: birthday)
    --preferences LIST    Comma-separated preferences (default: thoughtful,creative)
    --workflow-id ID      Custom workflow ID (auto-generated if not provided)
    --dry-run            Show what would be sent without actually sending
"""

import sys
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
import urllib.request
import urllib.parse
import urllib.error
import argparse

def generate_workflow_id() -> str:
    """Generate a unique workflow ID."""
    return f"workflow-saySomethingNice-{uuid.uuid4().hex}"

def send_event_to_api(event_data: dict) -> bool:
    """Send event to the eventuali API."""
    try:
        # Convert to JSON and encode
        json_data = json.dumps(event_data).encode('utf-8')
        
        # Create request
        req = urllib.request.Request(
            "http://127.0.0.1:8765/events/",
            data=json_data,
            headers={'Content-Type': 'application/json'}
        )
        
        # Send request with timeout
        with urllib.request.urlopen(req, timeout=10.0) as response:
            if response.status == 200:
                response_data = json.loads(response.read().decode('utf-8'))
                print(f"✅ Event sent successfully: {response_data.get('message', 'Success')}")
                return True
            else:
                response_text = response.read().decode('utf-8')
                print(f"❌ API Error: {response.status} - {response_text}")
                return False
                
    except urllib.error.URLError as e:
        print(f"❌ Connection failed: {str(e)}")
        print("💡 Make sure the eventuali API is running on http://127.0.0.1:8765")
        return False
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def create_test_event(recipient: str, occasion: str, preferences: list, workflow_id: str) -> dict:
    """Create a test workflow.saySomethingNiceRequested event."""
    timestamp = datetime.now(timezone.utc).isoformat()
    
    event_data = {
        "name": "workflow.saySomethingNiceRequested",
        "attributes": {
            "recipient": recipient,
            "occasion": occasion,
            "preferences": preferences,
            "test_event": True,
            "generated_by": "test-something-nice.py",
            "timestamp": timestamp
        },
        "timestamp": timestamp,
        "correlation_id": workflow_id,
        "aggregate_id": workflow_id
    }
    
    return event_data

def main():
    parser = argparse.ArgumentParser(
        description="Generate test events for Something Nice workflow",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run .claude/scripts/test-something-nice.py
  uv run .claude/scripts/test-something-nice.py --recipient Bob --occasion promotion
  uv run .claude/scripts/test-something-nice.py --preferences funny,casual --dry-run
        """
    )
    
    parser.add_argument(
        "--recipient", 
        default="Alice",
        help="Recipient of the nice message (default: Alice)"
    )
    
    parser.add_argument(
        "--occasion",
        default="birthday", 
        help="Occasion for the message (default: birthday)"
    )
    
    parser.add_argument(
        "--preferences",
        default="thoughtful,creative",
        help="Comma-separated preferences (default: thoughtful,creative)"
    )
    
    parser.add_argument(
        "--workflow-id",
        help="Custom workflow ID (auto-generated if not provided)"
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be sent without actually sending"
    )
    
    args = parser.parse_args()
    
    # Parse preferences
    preferences = [p.strip() for p in args.preferences.split(",") if p.strip()]
    
    # Generate or use provided workflow ID
    workflow_id = args.workflow_id or generate_workflow_id()
    
    # Create test event
    event_data = create_test_event(args.recipient, args.occasion, preferences, workflow_id)
    
    # Display event details
    print("🧪 Something Nice Workflow Test Event")
    print("=" * 50)
    print(f"Recipient: {args.recipient}")
    print(f"Occasion: {args.occasion}")
    print(f"Preferences: {', '.join(preferences)}")
    print(f"Workflow ID: {workflow_id}")
    print()
    
    if args.dry_run:
        print("🔍 DRY RUN - Event that would be sent:")
        print(json.dumps(event_data, indent=2))
        print("\nTo actually send this event, run without --dry-run")
        return
    
    print("📡 Sending event to API...")
    success = send_event_to_api(event_data)
    
    if success:
        print(f"\n✅ Test event sent successfully!")
        print(f"🎯 Workflow ID: {workflow_id}")
        print(f"📋 Expected handler chain:")
        print(f"   1. workflow.saySomethingNiceRequested-handler")
        print(f"   2. agent.saySomethingNiceRequestedHandler.somethingNiceSaid-handler")
        print(f"   3. agent.somethingNiceVerifiedHandler.verified-handler")
        print(f"\n💡 Check the listener service output to see the workflow execution.")
        print(f"💡 Look for completion report in .output/ directory.")
    else:
        print(f"\n❌ Failed to send test event")
        print(f"💡 Make sure:")
        print(f"   - The eventuali API is running (port 8765)")
        print(f"   - The listener service is running (.apps/listener/main.py)")
        print(f"   - Event handler agents exist in .claude/agents/event-handlers/")
        sys.exit(1)

if __name__ == "__main__":
    main()