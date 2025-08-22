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
import logging
import sys
from pathlib import Path

# Add the current directory to the path for imports
sys.path.insert(0, str(Path(__file__).parent))

from core.orchestrator import EventOrchestrator

logger = logging.getLogger(__name__)


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
    else:
        logging.basicConfig(level=logging.WARNING, force=True)
    
    logger.info(f"Event Orchestrator starting with verbosity level {args.verbose}...")
    
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