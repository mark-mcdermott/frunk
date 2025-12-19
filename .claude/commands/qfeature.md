---
description: Feature development - complete development workflow from requirements to PR
alwaysApply: false
---

# QFEATURE - Feature Development

See @.llm/workflows/feature-development.md for the complete workflow.

## Usage
When the user types "qfeature", execute the feature development workflow that coordinates all specialized agents to take a feature from requirements through to pull request.

## Workflow Overview

This workflow orchestrates 9 specialized agents through 5 phases:

1. **Discovery & Planning** - Requirements → Validated architectural plan
2. **Test-First Development** - TDD implementation with code review
3. **Quality Assurance** - Full testing, linting, quality validation
4. **Documentation & UX** - Code docs and UX testing
5. **Deployment** - Git operations and PR creation

## Agent Coordination

The workflow automatically coordinates:
- application-architect (planning)
- dan-abramov-code-reviewer (quality standards)
- test-writer-javascript (test creation)
- feature-implementer (production code)
- integration-tester (test execution)
- code-quality-enforcer (linting)
- code-documentation-writer (documentation)
- deployment-coordinator (git/PR)

## User Checkpoints

- After Phase 1: Plan approval required before implementation
- Before Phase 5: Deployment approval required before PR creation

## Expected Duration

30-60+ minutes for non-trivial features

## Success Criteria

Complete when:
- Implementation plan approved
- All code written and reviewed
- All tests passing with 100% coverage of new code
- All linting/quality checks passing
- Code meets Dan Abramov quality standards
- Documentation complete
- UX validated
- PR created with complete description
