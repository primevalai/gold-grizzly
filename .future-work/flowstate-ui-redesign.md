# FlowState UI Redesign

## Purpose

We are going to completely redesign the FlowState UI (the UI). 

### Design Principles

The UI will be both a visually stunning and interactively immersive app. This will use Three.js and React Three Fiber (R3F) to acheive this.

### Components

**EventRiver**
The main component of the home page is the EventRiver, vertical digital river that flows from top to bottom as time passes (use the assets/vertical-digital-river.png) image for inspiration. It is represented as a thick single slightly wavy line horizontally-centered in the middle of the component. The river will only increase in length if new events are received from the EventStream.

**EventStream**
The EventStream is an EventSource that receives events from the `/events/stream` SSE endpoint.

**WorkflowFork**
When a new Workflow is detected from the EventStream, the EventRiver will create a new branch that flows off of the main EventRiver flow. Each unique Workflow will have it's own WorkflowFork. Since a new Workflow is only detected by receving an EventFork, both the new WorkflowFork and EventFork will get created/rendered at the same time. At the end of the WorkflowFork, a small circle will represent the node of the Workflow. If the user taps on this node, the WorkflowId will show above the node.

**EventFork**
When a new AgentEvent is detected from the EventStream, the EventRiver will create a new branch that flows off of the WorkflowFork. This branch will end in a small circle that represents acts as the node for the Event. If the user taps on this node, the AgentId will show above the node.

