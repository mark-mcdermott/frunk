# Agents Index

## Available Agents

| Agent | Delegate When | How |
|-------|---------------|-----|
| `git-manager.md` | Complex git (conflicts, rebase, PRs, branch strategy) | Task tool |


> **Git Routing**: Simple commits use `/commit` skill. Only delegate to git-manager for complex operations.

## Decision Tree

```
Need to do git operations?
  |-> Read-only (status/log/diff)?
  |     -> Execute directly
  |-> Simple commit?
  |     -> /commit skill (keeps conversation context)
  --> Complex (conflicts/rebase/PRs)?
        -> DELEGATE to git-manager.md

```

## Agents (Detailed)

### git-manager.md
**Use for**: Merge conflict resolution, rebase/history rewriting, branch strategy, PR creation, repo initialization
**Don't use for**: Simple commits (use `/commit`) or simple branch creation (use `/branch`)

