#!/usr/bin/env python3
"""Test script to verify event publisher processes multiple events correctly."""

import subprocess
import json

# Sample agent output with multiple events
test_output = """
<EVENT>{"name": "lolRecorder.momentTriggered", "timestamp": "2025-08-12T18:00:00.000Z", "attributes": {"trigger_phrase": "test lol moment", "trigger_words": ["lol"], "humor_category": "test"}}</EVENT>

Starting to process the lol moment...

<EVENT>{"name": "lolRecorder.contextGathered", "timestamp": "2025-08-12T18:00:01.000Z", "attributes": {"conversation_turns": 5, "technical_context_available": true, "project_context_available": true, "metadata_fields_collected": 10}}</EVENT>

Creating folder...

<EVENT>{"name": "lolRecorder.folderCreated", "timestamp": "2025-08-12T18:00:02.000Z", "attributes": {"folder_path": ".lol-agent", "already_existed": false}}</EVENT>

Saving the moment...

<EVENT>{"name": "lolRecorder.momentRecorded", "timestamp": "2025-08-12T18:00:03.000Z", "attributes": {"file_path": "/test/path.json", "file_size": 1024, "humor_category": "test", "trigger_phrase": "test lol moment"}}</EVENT>

All done!

<EVENT>{"name": "lolRecorder.preservationComplete", "timestamp": "2025-08-12T18:00:04.000Z", "attributes": {"file_path": "/test/path.json", "preservation_note": "test complete", "cultural_significance": "test", "moment_classification": "test"}}</EVENT>
"""

# Wrap in JSON structure like Claude Code would
tool_output = json.dumps({"output": test_output})

# Run event publisher
result = subprocess.run(
    ["python3", "event-publisher.py"],
    input=tool_output,
    capture_output=True,
    text=True
)

print("STDERR Output (debug info):")
print(result.stderr)
print("\nSTDOUT Output (passthrough):")
print(result.stdout[:200] + "..." if len(result.stdout) > 200 else result.stdout)
print(f"\nReturn code: {result.returncode}")