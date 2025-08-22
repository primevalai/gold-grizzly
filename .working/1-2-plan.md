# Section 1.2 - Event Prioritization & Batching Implementation Plan

## Overview
Implement priority queues, event batching, and deduplication to optimize event processing throughput and reduce redundant work. This will allow critical events to be processed first and similar events to be batched for efficiency.

## Current State Analysis
- **Problem**: All events processed sequentially in order received, no deduplication
- **Impact**: Critical events wait behind low-priority ones, duplicate events processed multiple times
- **Location**: `.apps/listener/main.py` - `_stream_and_process`, `_process_event`, `_process_work_queue`

## Requirements from next-steps.md
1. **1.2.1** Implement priority queues for critical vs. background events
2. **1.2.2** Create batching logic for similar events to handlers
3. **1.2.3** Add event deduplication based on content hash
4. **1.2.4** Implement time-window based batching
5. **1.2.5** Add batch size limits and overflow handling

## Implementation Steps

### 1. Create Event Priority System (`.apps/listener/event_priority.py`)

```python
from enum import IntEnum
from dataclasses import dataclass
import hashlib
from typing import Dict, Any, Optional

class EventPriority(IntEnum):
    CRITICAL = 4  # System errors, urgent workflows
    HIGH = 3      # User-initiated actions
    NORMAL = 2    # Standard event processing
    LOW = 1       # Background tasks, cleanup

@dataclass
class PrioritizedEvent:
    event: Dict[str, Any]
    priority: EventPriority
    content_hash: str
    received_at: float
    batch_key: Optional[str] = None
    
    def __lt__(self, other):
        # Higher priority first, then earlier timestamp
        if self.priority != other.priority:
            return self.priority > other.priority
        return self.received_at < other.received_at
```

### 2. Implement Event Deduplication (`.apps/listener/event_dedup.py`)

```python
class EventDeduplicator:
    def __init__(self, ttl_seconds: int = 300):
        self.seen_hashes: Dict[str, float] = {}
        self.ttl = ttl_seconds
    
    def compute_hash(self, event: Dict) -> str:
        """Generate content hash for deduplication"""
        # Hash based on event type, name, and key attributes
        content = {
            "event_type": event.get("event_type"),
            "event_name": event.get("event_name"),
            "aggregate_id": event.get("aggregate_id"),
            # Exclude timestamp and event_id from hash
            "attributes": self._normalize_attributes(event.get("attributes", {}))
        }
        return hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest()
    
    def is_duplicate(self, event_hash: str) -> bool:
        """Check if event was recently processed"""
        self._cleanup_expired()
        if event_hash in self.seen_hashes:
            return True
        self.seen_hashes[event_hash] = time.time()
        return False
    
    def _cleanup_expired(self):
        """Remove expired hashes"""
        now = time.time()
        expired = [h for h, t in self.seen_hashes.items() if now - t > self.ttl]
        for h in expired:
            del self.seen_hashes[h]
```

### 3. Create Event Batcher (`.apps/listener/event_batcher.py`)

```python
class EventBatcher:
    def __init__(self, 
                 batch_window_ms: int = 100,
                 max_batch_size: int = 10):
        self.batch_window = batch_window_ms / 1000.0
        self.max_batch_size = max_batch_size
        self.batches: Dict[str, List[PrioritizedEvent]] = {}
        self.batch_timers: Dict[str, asyncio.Task] = {}
    
    def get_batch_key(self, event: Dict) -> str:
        """Generate batch key for grouping similar events"""
        # Batch by handler name and event type
        event_name = event.get("event_name", "")
        handler_name = f"{event_name}-handler"
        return handler_name
    
    async def add_event(self, event: PrioritizedEvent) -> Optional[List[PrioritizedEvent]]:
        """Add event to batch, returns batch if ready"""
        batch_key = event.batch_key or self.get_batch_key(event.event)
        
        if batch_key not in self.batches:
            self.batches[batch_key] = []
            # Start timer for this batch
            self.batch_timers[batch_key] = asyncio.create_task(
                self._batch_timeout(batch_key)
            )
        
        self.batches[batch_key].append(event)
        
        # Check if batch is full
        if len(self.batches[batch_key]) >= self.max_batch_size:
            return self._flush_batch(batch_key)
        
        return None
    
    def _flush_batch(self, batch_key: str) -> List[PrioritizedEvent]:
        """Flush and return a batch"""
        if batch_key in self.batch_timers:
            self.batch_timers[batch_key].cancel()
            del self.batch_timers[batch_key]
        
        batch = self.batches.pop(batch_key, [])
        return batch
    
    async def _batch_timeout(self, batch_key: str):
        """Timeout handler for batches"""
        await asyncio.sleep(self.batch_window)
        # Batch timeout - process whatever we have
        return self._flush_batch(batch_key)
```

### 4. Update EventProcessor with Priority Queue (`main.py`)

```python
import heapq
from asyncio import PriorityQueue

class EventProcessor:
    def __init__(self):
        # ... existing code ...
        self.event_queue = PriorityQueue(maxsize=1000)
        self.deduplicator = EventDeduplicator(ttl_seconds=300)
        self.batcher = EventBatcher(
            batch_window_ms=int(os.getenv("BATCH_WINDOW_MS", "100")),
            max_batch_size=int(os.getenv("MAX_BATCH_SIZE", "10"))
        )
    
    def determine_priority(self, event: Dict) -> EventPriority:
        """Determine event priority based on type and attributes"""
        event_name = event.get("event_name", "")
        event_type = event.get("event_type", "")
        attributes = event.get("attributes", {})
        
        # Critical: System errors, failures
        if "error" in event_name.lower() or "failed" in event_name.lower():
            return EventPriority.CRITICAL
        
        # High: User-initiated workflows, commands
        if event_type == "workflow_event" or "command" in attributes:
            return EventPriority.HIGH
        
        # Low: Heartbeats, metrics, logging
        if event_name in ["heartbeat", "metrics", "log"]:
            return EventPriority.LOW
        
        # Default: Normal priority
        return EventPriority.NORMAL
```

### 5. Update Stream Processing (`main.py`)

```python
async def _stream_and_process(self):
    """Stream events with prioritization and batching"""
    # Start background processor for priority queue
    queue_processor = asyncio.create_task(self._priority_queue_processor())
    
    try:
        async for stream_item in self.event_processor.event_api_client.stream_events():
            if not self.running:
                break
            
            if stream_item.event == "event_created":
                event_data = stream_item.data
                
                # Compute hash for deduplication
                event_hash = self.event_processor.deduplicator.compute_hash(event_data)
                
                # Skip duplicates
                if self.event_processor.deduplicator.is_duplicate(event_hash):
                    debug_print(f"Duplicate event detected, skipping: {event_hash[:8]}", 2, "🔁")
                    continue
                
                # Create prioritized event
                priority = self.event_processor.determine_priority(event_data)
                prioritized_event = PrioritizedEvent(
                    event=event_data,
                    priority=priority,
                    content_hash=event_hash,
                    received_at=time.time()
                )
                
                # Add to priority queue
                await self.event_processor.event_queue.put(prioritized_event)
                debug_print(f"Event queued with priority {priority.name}", 1, "📊")
    
    finally:
        queue_processor.cancel()

async def _priority_queue_processor(self):
    """Process events from priority queue with batching"""
    while self.running:
        try:
            # Get next priority event
            prioritized_event = await self.event_processor.event_queue.get()
            
            # Try to batch the event
            batch = await self.event_processor.batcher.add_event(prioritized_event)
            
            if batch:
                # Process batch of events
                await self._process_event_batch(batch)
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in priority queue processor: {e}")

async def _process_event_batch(self, batch: List[PrioritizedEvent]):
    """Process a batch of similar events"""
    if not batch:
        return
    
    # Log batch processing
    handler_name = batch[0].batch_key or "unknown"
    debug_print(f"Processing batch of {len(batch)} events for {handler_name}", 1, "📦")
    
    # For now, process individually (can be optimized to pass batch to handler)
    for prioritized_event in batch:
        await self._process_event(prioritized_event.event)
```

### 6. Configuration & Overflow Handling

```python
class QueueOverflowHandler:
    def __init__(self, max_queue_size: int = 1000):
        self.max_size = max_queue_size
        self.overflow_count = 0
    
    async def handle_overflow(self, queue: PriorityQueue, new_event: PrioritizedEvent):
        """Handle queue overflow - drop lowest priority or oldest events"""
        if queue.qsize() >= self.max_size:
            self.overflow_count += 1
            
            # Strategy 1: Drop if lower priority than lowest in queue
            # Strategy 2: Write to disk for later processing
            # Strategy 3: Alert and reject new events
            
            logger.warning(f"Queue overflow! Count: {self.overflow_count}")
            
            # For now, drop LOW priority events
            if new_event.priority <= EventPriority.LOW:
                debug_print(f"Dropping low priority event due to overflow", 1, "🗑️")
                return False
        
        return True
```

## File Changes Summary

### New Files:
1. `.apps/listener/event_priority.py` (~50 lines)
   - EventPriority enum
   - PrioritizedEvent dataclass

2. `.apps/listener/event_dedup.py` (~80 lines)
   - EventDeduplicator class
   - Hash computation and TTL management

3. `.apps/listener/event_batcher.py` (~100 lines)
   - EventBatcher class
   - Time-window and size-based batching

### Modified Files:
1. `.apps/listener/main.py` (~150 line changes)
   - Add priority queue to EventProcessor
   - Update stream processing for deduplication
   - Add batch processing logic
   - Implement overflow handling

## Testing Strategy

1. **Test Priority Ordering**:
   - Send mix of CRITICAL, HIGH, NORMAL, LOW events
   - Verify processing order matches priority

2. **Test Deduplication**:
   - Send identical events rapidly
   - Verify only first is processed
   - Test TTL expiration

3. **Test Batching**:
   - Send burst of similar events
   - Verify batching up to max_batch_size
   - Test time-window timeout

4. **Test Overflow**:
   - Flood system with events
   - Verify overflow handling works
   - Check no data loss for critical events

## Success Metrics

- ✅ Critical events processed within 10ms of receipt
- ✅ Duplicate events filtered out (>95% detection rate)
- ✅ Similar events batched (average batch size > 3)
- ✅ Queue overflow handled gracefully
- ✅ No blocking of event stream
- ✅ Memory usage stable under load

## Configuration

Environment variables:
- `EVENT_QUEUE_SIZE`: Max queue size (default: 1000)
- `DEDUP_TTL_SECONDS`: Deduplication window (default: 300)
- `BATCH_WINDOW_MS`: Batching time window (default: 100)
- `MAX_BATCH_SIZE`: Maximum events per batch (default: 10)
- `ENABLE_BATCHING`: Enable/disable batching (default: true)
- `ENABLE_DEDUP`: Enable/disable deduplication (default: true)

## Risk Mitigation

1. **Risk**: Priority starvation (low priority never processed)
   - **Mitigation**: Implement aging - increase priority over time

2. **Risk**: Hash collisions in deduplication
   - **Mitigation**: Use SHA256, include multiple event fields

3. **Risk**: Memory growth from dedup cache
   - **Mitigation**: TTL-based cleanup, max cache size

4. **Risk**: Batch timeout delays critical events
   - **Mitigation**: Skip batching for CRITICAL priority

## Implementation Order

1. Implement EventPriority and PrioritizedEvent
2. Create EventDeduplicator with hash computation
3. Add priority queue to EventProcessor
4. Update stream processing to use queue
5. Implement EventBatcher
6. Add batch processing logic
7. Test with varying loads
8. Add overflow handling
9. Optimize and tune parameters

## Integration with 1.1 (Handler Pooling)

This implementation complements handler pooling:
- Priority queue ensures important events get workers first
- Batching reduces total handler invocations
- Deduplication prevents redundant work
- Can be developed and tested independently