# Stable Technology Standards

## Core Principles
**Use latest stable versions while strictly avoiding pre-release software.** This ensures production readiness, security, and maintainability while staying current with technological advances.

**Open source solutions are absolutely required unless specifically exempted by explicit business requirements.** This ensures transparency, security auditability, vendor independence, and community-driven innovation.

## Version Classification Framework

### ✅ APPROVED: Stable Versions
- **General Availability (GA)** releases
- **Long Term Support (LTS)** versions
- **Stable** tagged releases
- **Production** or **Production-Ready** releases
- **Current** stable versions (not pre-release current)
- Semantic versioning: Major.Minor.Patch (e.g., 3.2.1, 16.18.0)

### ❌ REJECTED: Pre-Release Versions
- **Alpha** releases (any version containing "alpha", "a")
- **Beta** releases (any version containing "beta", "b") 
- **Release Candidate** (RC, rc) versions
- **Development** builds (dev, devel, development)
- **Nightly** builds or snapshots
- **Canary** releases
- **Experimental** features or versions
- **Preview** or **Pre** releases
- **Snapshot** builds (-SNAPSHOT)
- **Edge** or **Bleeding Edge** versions
- **Master/Main** branch builds (unless explicitly stable)
- Semantic versioning pre-release identifiers: 3.2.1-alpha.1, 2.0.0-beta.3, 1.5.0-rc.2

## Open Source Requirements

### ✅ APPROVED: Open Source Licenses
- **MIT License** - Maximum flexibility and compatibility
- **Apache 2.0** - Patent protection with corporate-friendly terms
- **BSD (2-Clause, 3-Clause)** - Simple, permissive licenses
- **GPL (v2, v3, AGPL)** - Copyleft licenses for community-driven projects
- **Mozilla Public License (MPL) 2.0** - File-level copyleft balance
- **ISC License** - Simple, permissive alternative to MIT
- **LGPL (v2.1, v3)** - Library-focused copyleft for limited scenarios

### ❌ REJECTED: Proprietary/Restrictive Licenses
- **Proprietary/Commercial** licenses without source access
- **Custom restrictive** licenses limiting usage or modification
- **Source-available but not OSI-approved** licenses
- **Freemium with usage restrictions** (unless explicitly required)
- **Academic/research-only** licenses for production systems
- **GPL-incompatible** licenses when GPL compatibility is required

### 🔍 REPOSITORY VITALITY ASSESSMENT

#### Vitality Classification Framework

**🟢 HEALTHY (Score: 8-10)**
- **Recent Activity**: >50 commits in last 6 months
- **Release Cadence**: Regular releases within last 3 months
- **Issue Response**: <7 days average response to issues
- **Active Maintainers**: ≥3 contributors in last 6 months
- **Security**: No unpatched high/critical CVEs >30 days old
- **Documentation**: Up-to-date docs with recent updates

**🟡 STABLE (Score: 5-7)**
- **Recent Activity**: 10-50 commits in last 6 months
- **Release Cadence**: Releases within last 6 months
- **Issue Response**: 7-14 days average response to issues
- **Active Maintainers**: 1-2 contributors in last 6 months  
- **Security**: Patches within 60 days for high/critical issues
- **Documentation**: Mostly current with some outdated sections

**🟠 DECLINING (Score: 2-4)**
- **Recent Activity**: 1-10 commits in last 6 months
- **Release Cadence**: Last release 6-12 months ago
- **Issue Response**: 14-30 days average response to issues
- **Active Maintainers**: <1 regular contributor
- **Security**: Slow patching (60-90 days for critical issues)
- **Documentation**: Outdated with significant gaps

**🔴 ABANDONED (Score: 0-1)**
- **Recent Activity**: <1 commit in last 6 months
- **Release Cadence**: No releases >12 months
- **Issue Response**: >30 days or no response to issues
- **Active Maintainers**: No visible maintenance activity
- **Security**: Unpatched vulnerabilities >90 days old
- **Documentation**: Severely outdated or unmaintained

#### Repository Health Indicators

**Positive Health Signals:**
- Consistent commit history with multiple contributors
- Regular release schedule with semantic versioning
- Active issue triage and prompt bug fixes
- Security advisories with timely patches
- CI/CD pipeline with automated testing
- Code review process with merge requirements
- Community guidelines and contributor documentation
- Active discussions/forums with maintainer participation

**Warning Signs:**
- Single maintainer dependency (bus factor = 1)
- Irregular release patterns with long gaps
- Accumulating unaddressed issues and PRs
- Outdated dependencies with security implications
- No response to security vulnerability reports
- Declining contributor activity over time
- Documentation drift from actual functionality

**Critical Failure Indicators:**
- No commits from maintainers in >6 months
- Unresponded security issues or CVEs
- Major dependencies with known vulnerabilities
- Broken CI/CD pipeline for extended periods
- Official statement of discontinued development
- Migration recommendations from maintainers to alternatives

### Open Source Validation Requirements

#### Mandatory Verification Steps
1. **License Verification**: Confirm OSI-approved license in repository
2. **Source Access**: Verify complete source code availability  
3. **Build Reproducibility**: Ensure source can build the distributed software
4. **Repository Hosting**: Confirm hosting on established platforms (GitHub, GitLab, etc.)
5. **Fork Rights**: Verify rights to fork, modify, and redistribute
6. **Patent Rights**: Review license terms for patent grant provisions

#### Repository Analysis Process
1. **Activity Assessment**: Analyze commit history, release frequency, contributor activity
2. **Health Metrics**: Calculate vitality score using quantitative criteria
3. **Community Evaluation**: Assess maintainer responsiveness and community engagement
4. **Security Review**: Check for unpatched vulnerabilities and security practices
5. **Dependency Audit**: Verify all dependencies meet same open source standards
6. **Governance Assessment**: Review project governance model and decision-making process

## Technology-Specific Guidelines

### Programming Languages
- **Node.js**: Use Current LTS or Active LTS versions only
- **Python**: Use stable releases (3.11.x, 3.10.x), avoid development versions
- **Java**: Use LTS versions (8, 11, 17, 21), avoid EA builds
- **Go**: Use stable releases, avoid tip/master builds
- **Rust**: Use stable channel releases, avoid nightly/beta

### Frameworks & Libraries
- **React**: Use stable releases, avoid alpha/beta/RC versions
- **Angular**: Use stable major versions, avoid pre-release versions
- **Vue**: Use stable releases from stable branch
- **Django/Flask**: Use stable package versions from PyPI
- **Spring**: Use GA releases, avoid milestone/snapshot versions

### Databases
- **PostgreSQL**: Use stable major versions (13, 14, 15, 16)
- **MySQL**: Use GA versions, avoid development releases
- **MongoDB**: Use stable releases, avoid development series
- **Redis**: Use stable releases, avoid unstable branches

### Infrastructure & DevOps
- **Docker**: Use stable tags, avoid "latest" in production
- **Kubernetes**: Use stable releases, avoid alpha/beta features
- **Terraform**: Use stable provider versions with version constraints
- **CI/CD Tools**: Use stable/LTS versions of Jenkins, GitHub Actions, etc.

## Version Detection Patterns

### Filename/URL Patterns to Avoid
```regex
# Pre-release indicators in version strings
/-(alpha|beta|rc|dev|nightly|canary|experimental|preview|snapshot)/i
/\.(alpha|beta|rc|dev|nightly|canary|experimental|preview|snapshot)/i

# Development branch indicators
/(master|main|develop|edge|bleeding|unstable)/i

# Pre-release semantic versioning
/\d+\.\d+\.\d+-(alpha|beta|rc|dev|pre|snapshot)\./i
```

### Package Manager Patterns
```bash
# NPM - avoid pre-release tags
npm install package@alpha     # ❌ AVOID
npm install package@beta      # ❌ AVOID  
npm install package@next      # ❌ AVOID
npm install package@latest    # ✅ ACCEPTABLE (if stable)

# Python pip - avoid pre-release
pip install package==1.0.0a1  # ❌ AVOID (alpha)
pip install package==1.0.0b1  # ❌ AVOID (beta)
pip install package==1.0.0rc1 # ❌ AVOID (release candidate)
pip install package==1.0.0    # ✅ PREFERRED

# Docker - avoid development tags
docker pull image:latest      # ⚠️  CAUTION (verify stability)
docker pull image:nightly     # ❌ AVOID
docker pull image:edge        # ❌ AVOID
docker pull image:3.2.1       # ✅ PREFERRED (specific stable version)
```

## Validation Requirements

### Before Recommending Any Technology
1. **Version Check**: Verify the recommended version is stable/GA
2. **Latest Available Check**: Ensure using the most recent stable version available
3. **Release Notes**: Confirm it's marked as production-ready
4. **Maturity Assessment**: Ensure sufficient production usage (>6 months stable)
5. **CVE Check**: Verify no critical unpatched vulnerabilities
6. **LTS Status**: Prefer LTS versions when available

### Documentation Requirements
When recommending technologies, always document:
- **Exact version**: Specify precise stable version numbers
- **Stability Evidence**: Link to official release notes confirming GA status
- **Production Usage**: Evidence of enterprise/production adoption
- **Support Timeline**: Expected support/security update timeline

## Exception Handling

### Rare Cases Where Pre-Release May Be Considered
Only under ALL of the following conditions:
1. **Critical Security Fix**: Stable version has critical unpatched vulnerability
2. **Official Recommendation**: Technology maintainers explicitly recommend upgrade
3. **Extensive Testing**: Pre-release has been thoroughly tested in isolated environment
4. **Rollback Plan**: Clear rollback path to previous stable version
5. **Business Justification**: Critical business need that cannot wait for stable release

### Documentation for Exceptions
- **Risk Assessment**: Document specific risks and mitigation strategies
- **Testing Evidence**: Comprehensive test results showing stability
- **Upgrade Timeline**: Plan for migrating to stable version once available
- **Approval Chain**: Stakeholder approval for deviation from stable-only policy

## Agent Implementation Guidelines

### For Technology Selection Agents
- **Scoring Penalty**: Apply -5 point penalty for any pre-release version
- **Automatic Filtering**: Filter out pre-release versions before evaluation
- **Latest Version Priority**: Check for and prioritize the most recent stable version
- **Version Verification**: Always verify recommended versions against stable release lists
- **Source Validation**: Prefer official documentation and release channels

### For All Agents Making Technology Recommendations
- **Include This File**: Reference this document in agent prompts
- **Validation Step**: Add explicit stable version validation step
- **Evidence Required**: Require evidence of stability before recommending
- **Documentation**: Always specify exact stable versions in recommendations

## Monitoring and Updates

### Regular Review Schedule
- **Monthly**: Update version patterns as new pre-release conventions emerge
- **Quarterly**: Review and update technology-specific guidelines
- **Per Release**: Update LTS/stable version recommendations

### Continuous Improvement
- Track instances where agents recommend pre-release software
- Update detection patterns based on observed failures
- Refine scoring criteria based on real-world stability data
- Collect feedback from development teams on stability issues

---

*Last Updated: 2025-08-10*  
*Version: 1.0*  
*Purpose: Ensure all agents prioritize stable, production-ready technology choices*