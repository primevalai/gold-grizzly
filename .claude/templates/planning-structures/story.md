---
type: story
id: story-{uuid}
parent: feature-{parent_uuid}
slug: {slug}
status: ready
priority: medium
points: {story_points}
created: {timestamp}
updated: {timestamp}
---

# User Story: {title}

## Story
**As a** {actor}  
**I want** {action}  
**So that** {benefit}

## Acceptance Criteria
```gherkin
Given {precondition}
When {action}
Then {expected_result}
```

Additional criteria:
- [ ] {criterion_1}
- [ ] {criterion_2}
- [ ] {criterion_3}

## Technical Details

### Implementation Notes
{implementation_notes}

### API Endpoints
- `{method} {endpoint}`: {endpoint_description}

### Data Model
```json
{
  "field1": "type",
  "field2": "type"
}
```

## Tasks

### Task 1: {task_1_title}
- **Type**: {task_1_type}
- **Estimate**: {task_1_estimate}
- **Assigned**: {task_1_assignee}
- **Status**: {task_1_status}

### Task 2: {task_2_title}
- **Type**: {task_2_type}
- **Estimate**: {task_2_estimate}
- **Assigned**: {task_2_assignee}
- **Status**: {task_2_status}

## Test Scenarios
1. {test_scenario_1}
2. {test_scenario_2}
3. {test_scenario_3}

## UI Mockups
{mockup_links_or_descriptions}

## Dependencies
- **Blocked by**: {blockers}
- **Related stories**: {related_stories}

## Notes
{additional_notes}

---

*Story Points: {points} | Sprint: {sprint_number}*