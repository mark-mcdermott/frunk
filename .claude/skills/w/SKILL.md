---
name: w
description: Create a git worktree for a new branch and print the path
usage: /w <branch-name>
examples:
  - /w login-feature
  - /w fix/broken-nav
allowed-tools:
  - Bash(git:*)
  - Read
---

# Worktree Skill

Create a git worktree for a new branch. Prints the path so you can launch a separate Claude instance there.

## Workflow

### 1. Create the Worktree

Determine the parent directory of the current repo:
```bash
REPO_DIR=$(pwd)
PARENT_DIR=$(dirname "$REPO_DIR")
```

Create the worktree as a sibling directory:
```bash
git worktree add "$PARENT_DIR/<branch-name>" -b <branch-name>
```

If the branch already exists (no `-b`):
```bash
git worktree add "$PARENT_DIR/<branch-name>" <branch-name>
```

### 2. Print Instructions

Print the absolute path and next steps:
```
Worktree created: /absolute/path/to/<branch-name>

To start working in it:
  cd /absolute/path/to/<branch-name> && claude
```
