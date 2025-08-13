# CLAUDE.md - API Module

## Project Information

This file contains API-specific project information and context for Claude Code within the gold-grizzly/.apps/api module.

## Critical Directives

### Python and FastAPI Development Standards

**MANDATORY: Comprehensive Python Standards Compliance**

All Python code in this API module MUST adhere to the following standards:

- **PEP 8 Style**: Enforced with black and flake8, strict 79-character line length
- **PEP 257 Docstrings**: Checked with pydocstyle to enhance FastAPI's Swagger UI documentation
- **PEP 621 Project Metadata**: Use pyproject.toml for all project configuration
- **PEP 517/518 Build System**: Use UV for build system requirements and dependency management
- **PEP 20 Principles**: Follow "The Zen of Python" for clean, explicit design

### Code Organization Requirements

- **Type Hints**: All function signatures must include type hints
- **Pydantic Models**: Use for all request/response validation
- **Module Structure**: Organize code following FastAPI best practices:
  - `routes/` - API endpoint definitions
  - `models/` - Pydantic models and data structures
  - `dependencies/` - Dependency injection components

### Modern Python Project Standards (PEP 420 Compliance)

**MANDATORY: No Legacy __init__.py Files**

- **DO NOT** create `__init__.py` files in directories (Python 3.3+ uses implicit namespace packages per PEP 420)
- **Exception**: Only create `__init__.py` if you need to execute initialization code or control imports
- **Clean Imports**: Rely on implicit namespace packages for cleaner project structure

**MANDATORY: Clean Development Environment**

- **NO `__pycache__/` directories** in version control - these are automatically generated
- **NO `.pyc` files** in repository - bytecode files are temporary artifacts  
- **NO `*.egg-info/`** directories - these are build artifacts
- **NO `build/` or `dist/` directories** - these are packaging artifacts

**MANDATORY: Proper .gitignore Coverage**

The `.gitignore` file MUST include patterns for:
```
__pycache__/
*.py[cod]
*$py.class
.pytest_cache/
build/
dist/
*.egg-info/
.coverage*
htmlcov/
```

### Dependency Management

- **Primary Tool**: Use UV for all dependency management
- **Core Dependencies**: Include fastapi, uvicorn, pydantic
- **Testing Framework**: Use pytest and httpx for testing
- **Quality Assurance**: Ensure all code complies with PEP 8 and PEP 257

### Database and File Management

**MANDATORY: Proper Path Handling**

- **Use relative paths** for local development (e.g., `Path(".events")` for eventuali database)
- **DO NOT** force absolute paths unless specifically required
- **Let tools handle path resolution** naturally rather than over-engineering
- **Database files** (*.db) should be in `.gitignore` - they're environment-specific

**MANDATORY: Eventuali Integration Standards**

- **Use proper DDD patterns** - work with Aggregates, not individual Events
- **Implement required apply methods** - each event type needs `apply_<event_type>` method
- **Follow eventuali conventions** - use EventStore.save(aggregate), not save_event()

### Development Workflow

All development must maintain compliance with the above standards through automated tooling and manual review processes.

**Pre-Development Checklist:**
1. ✅ No `__init__.py` files created unnecessarily
2. ✅ Comprehensive `.gitignore` in place
3. ✅ Clean working directory (no `__pycache__/` or `.pyc` files)
4. ✅ Proper PEP compliance for all new code