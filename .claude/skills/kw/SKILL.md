---
name: kw
description: Remove a git worktree and optionally delete the branch
usage: /kw <branch-name>
examples:
  - /kw login-feature
  - /kw fix/broken-nav
allowed-tools:
  - Bash(git:*)
  - Read
---

# Kill Worktree Skill

Remove a git worktree and clean up.

## Workflow

### 1. List Worktrees to Confirm

```bash
git worktree list
```

### 2. Remove the Worktree

```bash
PARENT_DIR=$(dirname "$(pwd)")
git worktree remove "$PARENT_DIR/<branch-name>"
```

If removal fails because of uncommitted changes, inform the user and ask whether to force remove with `--force`.

### 3. Ask About Branch

Ask the user if they also want to delete the branch:
- If yes: `git branch -D <branch-name>`
- If no: leave the branch

### 4. Confirm

Print what was removed.
