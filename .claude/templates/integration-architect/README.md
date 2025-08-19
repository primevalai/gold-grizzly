# Integration Architect Template Library

This directory contains comprehensive templates for integration architecture deliverables. These templates ensure consistent, professional outputs and cover all critical aspects of integration design and implementation.

## Available Templates

### 1. OpenAPI Specification Template
**File:** `openapi-spec-template.yaml`  
**Purpose:** Complete OpenAPI 3.0.3 specification template for API design  
**Features:**
- Full CRUD operations with proper HTTP methods
- Comprehensive error handling with RFC 7807 format
- Security schemes (OAuth2, API Key, mTLS)
- Request/response schemas with validation
- Rate limiting and monitoring extensions
- Pagination and filtering support

**Usage:** Replace placeholder values like `{API_NAME}`, `{RESOURCE_NAME}`, etc.

### 2. Integration Test Plan Template
**File:** `integration-test-plan-template.md`  
**Purpose:** Comprehensive testing methodology for integration projects  
**Features:**
- Contract testing with Pact framework examples
- Data transformation and validation testing
- Error handling and resilience testing
- Performance and load testing scenarios
- Security testing procedures
- End-to-end workflow validation
- Automation strategies with code examples

**Usage:** Customize test scenarios, data sets, and success criteria for your integration

### 3. Architecture Decision Record Template
**File:** `architecture-decision-record-template.md`  
**Purpose:** Document integration architecture decisions with full context  
**Features:**
- Structured decision documentation format
- Technology stack justifications
- Alternative analysis with decision matrix
- Implementation roadmap with phases
- Risk assessment and mitigation strategies
- Monitoring and success metrics
- Compliance and governance sections

**Usage:** Fill in decision context, alternatives considered, and chosen approach

### 4. Data Flow Diagram Template
**File:** `data-flow-diagram-template.md`  
**Purpose:** Visual and technical documentation of data flows  
**Features:**
- Mermaid diagram syntax for visual flows
- Detailed data transformation specifications
- Error handling flow documentation
- Batch and real-time processing patterns
- Security and monitoring touchpoints
- Performance optimization strategies

**Usage:** Adapt flow diagrams and transformation rules for your data patterns

### 5. Security Assessment Template
**File:** `security-assessment-template.md`  
**Purpose:** Comprehensive security evaluation framework  
**Features:**
- STRIDE threat modeling methodology
- Authentication and authorization assessment
- Encryption and key management analysis
- Vulnerability assessment procedures
- Compliance requirements (GDPR, HIPAA, SOC 2)
- Incident response planning
- Security controls validation

**Usage:** Conduct thorough security evaluation using provided framework

### 6. Performance Test Plan Template
**File:** `performance-test-plan-template.md`  
**Purpose:** Complete performance testing methodology  
**Features:**
- Load testing scenarios with k6/JMeter examples
- Stress testing and capacity planning
- Resource utilization analysis
- Bottleneck identification procedures
- SLA validation and compliance testing
- Performance tuning recommendations

**Usage:** Define performance requirements and execute testing scenarios

### 7. Infrastructure Analysis Template
**File:** `infrastructure-analysis-template.md`  
**Purpose:** Comprehensive infrastructure assessment and optimization  
**Features:**
- Container platform analysis (Kubernetes, Docker)
- Cloud infrastructure assessment (AWS, Azure, GCP)
- Database performance analysis with SQL queries
- Auto-scaling and load distribution analysis
- Cost analysis and optimization opportunities
- Security infrastructure assessment
- Monitoring and observability setup
- Disaster recovery and compliance evaluation

**Usage:** Analyze current infrastructure and plan optimizations

## Template Usage Guidelines

### 1. Placeholder Replacement
All templates use standardized placeholders in the format `{PLACEHOLDER_NAME}`. When using templates:
- Replace all placeholders with actual values
- Maintain consistent formatting and structure
- Remove unused sections or mark as "Not Applicable"

### 2. Customization Approach
- Start with the base template structure
- Add project-specific sections as needed
- Maintain template version for future updates
- Document any significant modifications

### 3. Quality Standards
- Ensure all placeholders are replaced
- Validate technical accuracy of implementations
- Review for completeness and clarity
- Test any code examples or configurations

### 4. Template Combinations
Many templates work together:
- ADR references the OpenAPI spec and test plans
- Data flow diagrams inform the test plans
- Security assessment influences all other deliverables
- Performance test plans validate architecture decisions
- Infrastructure analysis supports all deployment planning
- Security assessment informs infrastructure hardening

## Quick Reference

### Common Placeholder Patterns
```yaml
# System and Integration Names
{INTEGRATION_NAME}
{SYSTEM_A}, {SYSTEM_B}
{API_NAME}
{VERSION}

# Technical Specifications
{ENDPOINT_NAME}
{DATA_TYPE}
{PROTOCOL}
{AUTH_METHOD}

# Performance and Metrics
{RESPONSE_TIME_TARGET}
{THROUGHPUT_TARGET}
{ERROR_RATE_TARGET}

# Dates and People
{DATE}
{AUTHOR}
{REVIEWER}
```

### Example Usage Workflow
1. **Start with ADR template** - Define architectural decisions
2. **Create OpenAPI spec** - Design API contracts
3. **Document data flows** - Map data transformations
4. **Analyze infrastructure** - Assess current capabilities and requirements
5. **Plan testing strategy** - Define validation approach
6. **Assess security** - Evaluate threat landscape
7. **Plan performance testing** - Validate scalability

## Integration with Agent Tools

The integration-architect agent has access to these templates and can:
- Read templates using the Read tool
- Generate customized versions using Write/MultiEdit
- Execute test scenarios using Bash for API calls
- Validate implementations using various tools
- Create comprehensive deliverable packages

## Template Maintenance

### Version Control
- Templates are version controlled with the project
- Changes should be backward compatible when possible
- Update placeholder documentation with any changes

### Feedback and Improvements
- Templates evolve based on project experience
- Regular reviews ensure best practices alignment
- Community feedback incorporated into updates

## Support and Documentation

For questions about template usage or customization:
- Review the template comments and examples
- Check the integration-architect agent prompt for guidance
- Reference industry best practices and standards

---

**Last Updated:** {CURRENT_DATE}  
**Template Version:** 1.0  
**Maintained By:** Integration Architecture Team