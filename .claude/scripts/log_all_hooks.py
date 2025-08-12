#!/usr/bin/env uv run
"""Log all Claude Code hook events to timestamped files."""

import sys
import json
from datetime import datetime
import os

def main():
    # Create .logs directory if it doesn't exist
    logs_dir = ".logs"
    os.makedirs(logs_dir, exist_ok=True)
    
    # Get current date for filename
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    log_file = os.path.join(logs_dir, f"{date_str}_log.txt")
    
    # Get all Claude-related environment variables
    claude_env_vars = {k: v for k, v in os.environ.items() if k.startswith('CLAUDE_')}
    
    # Read all input from stdin
    input_data = sys.stdin.read().strip()
    
    # Try to parse JSON data for better formatting
    parsed_data = None
    try:
        parsed_data = json.loads(input_data) if input_data else {}
    except json.JSONDecodeError:
        pass
    
    # Extract key information from parsed data
    hook_event_name = parsed_data.get('hook_event_name', 'UNKNOWN') if parsed_data else 'UNKNOWN'
    session_id = parsed_data.get('session_id', 'UNKNOWN') if parsed_data else 'UNKNOWN'
    tool_name = parsed_data.get('tool_name', 'N/A') if parsed_data else 'N/A'
    cwd = parsed_data.get('cwd', 'UNKNOWN') if parsed_data else 'UNKNOWN'
    
    # Append comprehensive hook information to the log file
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write(f"HOOK EVENT: {datetime.utcnow().isoformat()}Z\n")
        f.write("=" * 80 + "\n")
        
        # Environment Information
        f.write("ENVIRONMENT VARIABLES:\n")
        f.write("-" * 40 + "\n")
        for key, value in claude_env_vars.items():
            f.write(f"{key}: {value}\n")
        f.write(f"PWD: {os.getcwd()}\n")
        f.write(f"USER: {os.environ.get('USER', 'UNKNOWN')}\n")
        f.write(f"SHELL: {os.environ.get('SHELL', 'UNKNOWN')}\n")
        f.write("\n")
        
        # Hook Event Summary
        f.write("HOOK EVENT SUMMARY:\n")
        f.write("-" * 40 + "\n")
        f.write(f"Event Name: {hook_event_name}\n")
        f.write(f"Session ID: {session_id}\n")
        f.write(f"Tool Name: {tool_name}\n")
        f.write(f"Working Directory: {cwd}\n")
        f.write("\n")
        
        # Raw Input Data
        f.write("RAW STDIN DATA:\n")
        f.write("-" * 40 + "\n")
        f.write(input_data + "\n")
        f.write("\n")
        
        # Parsed JSON Data (if available)
        if parsed_data:
            f.write("PARSED JSON STRUCTURE:\n")
            f.write("-" * 40 + "\n")
            f.write(json.dumps(parsed_data, indent=2, ensure_ascii=False) + "\n")
            f.write("\n")
            
            # Extract and display specific tool information
            if 'tool_input' in parsed_data:
                f.write("TOOL INPUT DETAILS:\n")
                f.write("-" * 40 + "\n")
                tool_input = parsed_data['tool_input']
                for key, value in tool_input.items():
                    f.write(f"{key}: {json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value}\n")
                f.write("\n")
            
            if 'tool_response' in parsed_data:
                f.write("TOOL RESPONSE DETAILS:\n")
                f.write("-" * 40 + "\n")
                tool_response = parsed_data['tool_response']
                if isinstance(tool_response, dict):
                    for key, value in tool_response.items():
                        # Truncate very long responses for readability
                        if isinstance(value, str) and len(value) > 500:
                            f.write(f"{key}: {value[:500]}... [TRUNCATED - {len(value)} total chars]\n")
                        else:
                            f.write(f"{key}: {json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value}\n")
                else:
                    f.write(f"Response: {tool_response}\n")
                f.write("\n")
        
        # System Information
        f.write("SYSTEM CONTEXT:\n")
        f.write("-" * 40 + "\n")
        f.write(f"Timestamp: {datetime.utcnow().isoformat()}Z\n")
        f.write(f"Process ID: {os.getpid()}\n")
        f.write(f"Parent Process ID: {os.getppid()}\n")
        f.write("\n")
        
        f.write("=" * 80 + "\n\n")

if __name__ == "__main__":
    main()