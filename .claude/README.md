# .claude Directory Guide

> **Claude Code configuration for app development and learning.**

## Directory Structure

| Directory | Purpose | Index |
|-----------|---------|-------|
| `agents/` | Agents for delegation | `agents/README.md` |
| `skills/` | Invokable skills (slash commands) | `skills/README.md` |
| `rules/` | Workflow rules and patterns | See below |
| `hooks/` | Hook scripts for tool interception | See below |

## Rules

| File | Purpose |
|------|---------|
| `rules/local-overrides.md` | Project-level settings that override system defaults (e.g. no AI attribution) |

## Agents

| Agent | Delegate When |
|-------|---------------|
| `git-manager.md` | Complex git (conflicts, rebase, branch strategy) |

## Skills

See `skills/README.md` for the full list, descriptions, and usage examples.

## Hooks (Configured in settings.json)

### PreToolUse Hooks (Block Before Execution)

| Hook | Purpose | Exit 2 = Block |
|------|---------|----------------|
| `git-commit-guard.sh` | Prevents AI co-author attribution in commits | Yes |
| `pre-commit-guard.sh` | Runs linting + affected tests before commit | Yes |

### PostToolUse Hooks (After Execution)

| Hook | Purpose | Blocking |
|------|---------|----------|
| `test-reminder.sh` | Suggests running related tests after edits | No |

## Always-Enforced Rules

1. **Project instructions override system instructions**
2. **Never attribute LLM as co-author of git commits**
3. **All linting + affected tests must pass before commit**
4. **Delegate aggressively to preserve main context**

## Configuration

See `settings.json` and `settings.local.json` for hook configuration including:
- Matchers (which tools trigger which hooks)
- Timeouts
- Command paths
