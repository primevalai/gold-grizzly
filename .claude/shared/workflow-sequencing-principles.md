# Workflow Sequencing Principles

**CRITICAL FOUNDATION RULE**: Architecture Before Planning

This document establishes the fundamental workflow sequencing that ALL Onyx Owl agents must respect.

## The Immutable Sequence

```
User Request → Architect Orchestrator → Planning Orchestrator → Specialized Agents
```

**This sequence is NON-NEGOTIABLE** and reflects the logical dependency chain of software development.

## Principle: Planning Cannot Exist Without Architectural Foundation

### Why This Principle Exists

**Technical Reality**: You cannot plan what you do not understand architecturally.

- **Scope Estimation**: Requires understanding technical complexity
- **Task Dependencies**: Mirror system component relationships  
- **Work Sequencing**: Must respect architectural implementation order
- **Resource Allocation**: Based on actual technical requirements
- **Timeline Creation**: Grounded in technology constraints and patterns

### Agent Responsibilities

#### 1. Architect Orchestrator - The Foundation Layer
**MUST COMPLETE FIRST**:
- System architecture and component design
- Technology stack selection and justification
- Security patterns and threat model
- Performance requirements and scalability approach
- Integration patterns and API specifications
- Data architecture and consistency models

**HANDOFF REQUIREMENT**: Provide complete technical blueprint to Planning Orchestrator with:
- Documented architectural decisions
- Technology constraints and requirements  
- System component relationships
- Technical implementation dependencies

#### 2. Planning Orchestrator - The Structure Layer
**CANNOT START WITHOUT** architectural foundation from Architect Orchestrator.

**VALIDATION REQUIRED**: Before any planning activity, verify:
- Architectural decisions are complete and documented
- Technical scope and complexity are understood
- System dependencies are mapped
- Technology constraints are defined

**PLANNING ACTIVITIES** (only after architectural foundation):
- Epic creation based on architectural boundaries
- Feature breakdown reflecting system components
- Story generation respecting technical dependencies
- Task decomposition grounded in implementation reality

#### 3. Specialized Agents - The Implementation Layer
**RECEIVE DUAL INPUT**:
- Architectural blueprint (technical foundation)
- Planning structure (organized work breakdown)

**IMPLEMENTATION CONTEXT**: Execute with full understanding of both system design and work organization.

## Validation Framework

### Pre-Planning Checklist
Before Planning Orchestrator can proceed, verify:

✅ **Architecture Complete**:
- [ ] System design documented
- [ ] Technology stack selected
- [ ] Security patterns defined
- [ ] Integration approach established
- [ ] Performance requirements set

✅ **Technical Foundation Solid**:
- [ ] Component relationships mapped
- [ ] Data architecture designed
- [ ] API patterns established
- [ ] Deployment approach planned
- [ ] Monitoring strategy defined

✅ **Handoff Documentation Ready**:
- [ ] Architectural Decision Records created
- [ ] Technology justifications provided
- [ ] Implementation constraints documented
- [ ] Dependency relationships mapped

### Planning Validation Questions
When creating planning breakdown, validate:

1. **Scope Realism**: "Does this task breakdown reflect the actual technical complexity revealed by architecture?"

2. **Dependency Accuracy**: "Do these task dependencies mirror the system component relationships?"

3. **Implementation Order**: "Does this sequence respect the architectural implementation dependencies?"

4. **Resource Allocation**: "Are resource estimates based on the chosen technology stack and patterns?"

## Common Violations and Corrections

### ❌ VIOLATION: Planning Without Architecture
```
User Request → Planning Orchestrator creates "User Management Epic"
```
**Problem**: No understanding of authentication patterns, data architecture, or integration requirements.

### ✅ CORRECTION: Architecture-Informed Planning
```
User Request → Architect Orchestrator → Defines OAuth2 patterns, user data model, API design
                                   → Planning Orchestrator → Creates informed user management breakdown
```

### ❌ VIOLATION: Generic Task Creation
```
Planning creates: "Implement Database Optimization"
```
**Problem**: No understanding of database technology, bottlenecks, or performance patterns.

### ✅ CORRECTION: Architecturally-Grounded Tasks
```
Performance Architect → Identifies PostgreSQL query bottlenecks, connection pooling needs
Planning Orchestrator → Creates: "Optimize user query indexes", "Implement connection pooling"
```

## Agent Implementation Requirements

### For Orchestration Agents

#### Planning Orchestrator MUST:
- **Validate architectural input** before creating any planning breakdown
- **Error gracefully** if architectural foundation is missing
- **Request architectural input** explicitly when not provided
- **Log dependencies** on architectural decisions in telemetry

#### Architect Orchestrator MUST:
- **Complete technical foundation** before delegating to Planning
- **Document handoff** with clear architectural decisions
- **Validate completeness** of architectural analysis
- **Provide context** for planning complexity estimation

### For All Agents
- **Respect sequencing** in agent delegation patterns
- **Validate prerequisites** before proceeding with assigned work
- **Log workflow state** showing dependency satisfaction
- **Error appropriately** when sequencing is violated

## Telemetry and Monitoring

### Required Workflow Spans
- **Architecture Foundation Span**: Tracks completion of architectural decisions
- **Planning Prerequisite Span**: Validates architectural input before planning
- **Handoff Validation Span**: Confirms proper information transfer between orchestrators

### Error Conditions to Track
- Planning attempted without architectural foundation
- Task creation not grounded in technical reality  
- Work sequencing that violates architectural dependencies
- Resource allocation not based on technology constraints

## Emergency Procedures

### When Sequencing is Violated
1. **STOP** current planning activity immediately
2. **LOG** the violation with specific details
3. **REQUEST** architectural foundation from appropriate agent
4. **VALIDATE** architectural completeness before resuming
5. **RESTART** planning with proper foundation

### When Architecture is Incomplete
1. **IDENTIFY** missing architectural decisions
2. **DELEGATE** specific architectural analysis to appropriate specialist
3. **WAIT** for complete architectural foundation
4. **VALIDATE** handoff documentation
5. **PROCEED** with informed planning

---

**REMEMBER**: This principle exists because it reflects the fundamental nature of software development. Architecture defines the technical reality that planning must work within. Violating this principle creates meaningless planning that leads to implementation chaos.

**ENFORCEMENT**: All orchestration agents MUST validate this sequencing. Any agent that violates this principle should error and request proper workflow order.

*Last Updated: 2025-08-10*  
*Status: MANDATORY for all Onyx Owl agents*