#!/bin/bash

# UUID generation script for Gold Grizzly project
# Generates UUIDs for contexts where Python/JavaScript UUID libraries aren't available
# Usage: ./generate-uuid.sh [--agent-id <agentName>] [--short]

set -euo pipefail

generate_uuid() {
    local uuid=""
    
    # Try different methods in order of preference
    if command -v uuidgen >/dev/null 2>&1; then
        # macOS and many Linux systems have uuidgen
        uuid=$(uuidgen | tr '[:upper:]' '[:lower:]')
    elif [[ -r /proc/sys/kernel/random/uuid ]]; then
        # Linux systems with /proc filesystem
        uuid=$(cat /proc/sys/kernel/random/uuid)
    else
        # Fallback method using od and /dev/urandom
        uuid=$(od -x /dev/urandom | head -1 | awk '{OFS="-"; print $2$3,$4,$5,$6,$7$8$9}' | tr '[:upper:]' '[:lower:]')
    fi
    
    echo "$uuid"
}

remove_hyphens() {
    echo "$1" | tr -d '-'
}

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --agent-id <name>  Generate agent ID format: <agentName>-<uuid>"
    echo "  --short            Generate short UUID without hyphens"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Full UUID: 550e8400-e29b-41d4-a716-446655440000"
    echo "  $0 --short                   # Short UUID: 550e8400e29b41d4a716446655440000"
    echo "  $0 --agent-id simonSays      # Agent ID: simonSays-550e8400e29b41d4a716446655440000"
}

main() {
    local agent_name=""
    local short_format=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --agent-id)
                if [[ $# -lt 2 ]]; then
                    echo "Error: --agent-id requires an agent name" >&2
                    exit 1
                fi
                agent_name="$2"
                shift 2
                ;;
            --short)
                short_format=true
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                echo "Error: Unknown option $1" >&2
                print_usage >&2
                exit 1
                ;;
        esac
    done
    
    # Generate UUID
    uuid=$(generate_uuid)
    
    # Validate UUID was generated
    if [[ -z "$uuid" ]]; then
        echo "Error: Failed to generate UUID" >&2
        exit 1
    fi
    
    # Format output based on options
    if [[ -n "$agent_name" ]]; then
        # Agent ID format: <agentName>-<uuid>
        uuid_no_hyphens=$(remove_hyphens "$uuid")
        echo "${agent_name}-${uuid_no_hyphens}"
    elif [[ "$short_format" = true ]]; then
        # Short format without hyphens
        remove_hyphens "$uuid"
    else
        # Full UUID with hyphens
        echo "$uuid"
    fi
}

main "$@"