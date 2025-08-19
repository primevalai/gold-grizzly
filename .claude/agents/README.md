# Claude Code Agents Organization

This directory contains all Claude Code agents organized by their primary utility and purpose.

## Directory Structure

### 🏗️ Architecture (`./architecture/`)
Agents focused on system design, architecture patterns, and technical specifications.

- **architect-orchestrator.md** - Master orchestrator for comprehensive architecture design
- **integration-architect.md** - API/service integration architecture design
- **performance-architect.md** - Performance optimization and scalability architecture
- **security-architect.md** - Security architecture and threat modeling
- **system-architect.md** - High-level system design and component architecture
- **technology-selector.md** - Technology stack evaluation and selection

### 📋 Planning (`./planning/`)
Agents focused on project planning, management, and workflow organization.

- **planning-orchestrator.md** - Master orchestrator for project planning workflows
- **dependency-analyzer.md** - Dependency analysis and mapping
- **external-integration.md** - External system integration planning
- **progress-tracker.md** - Project progress monitoring and metrics
- **strawman-generator.md** - Initial planning document generation
- **template-engine.md** - Document template management and generation
- **worktree-manager.md** - Git worktree management and coordination

### ⚙️ Orchestration (`./orchestration/`)
High-level orchestrator agents that coordinate multiple other agents and workflows.

- **orchestrator.md** - General-purpose orchestrator agent
- **system-orchestrator.md** - Master system orchestrator for multi-phase workflows

### 💻 Development (`./development/`)
Agents focused on code implementation, evaluation, and development processes.

- **continuation-agent.md** - Context continuation and resumption management
- **developer-agent.md** - Code implementation and development
- **evaluator-agent.md** - Code and output quality evaluation
- **iterative-refinement-agent.md** - Iterative improvement and refinement processes
- **meta-agent.md** - Agent generation and meta-programming

### 🎭 Utility (`./utility/`)
Specialized utility agents for specific tasks and functions.

- **lol-recorder.md** - Humor and memorable moment preservation
- **simon-says.md** - Command acknowledgment and game functionality
- **url-cacher.md** - Web content caching and reference management

## Usage Notes

- All agents follow the Gold Grizzly evented format with MCP event tools integration
- Each agent includes comprehensive documentation and usage instructions
- Agents can be invoked individually or through orchestrator agents
- The folder structure supports easy discovery and logical grouping of related functionality

## Event System Integration

All agents in this directory are integrated with the Gold Grizzly Event System and emit events following the pattern:
```
agent.<agentName>.<eventName>
```

This enables comprehensive tracking, monitoring, and coordination across the entire agent ecosystem.