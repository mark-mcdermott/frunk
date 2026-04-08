---
name: branch
description: Create a new git branch and switch to it
usage: /branch <branch-name>
examples:
  - /branch feat/dark-mode
  - /branch fix/broken-publish
  - /branch learn/react-hooks
allowed-tools:
  - Bash(git:*)
---

# Branch Skill

Create a new branch and switch to it. That's it — no commits, no implementation, just branch and go.

## Usage

```
/branch <branch-name>
```

## Workflow

### 1. Check State
```bash
git status
```
- If there are uncommitted changes, warn the user and stop

### 2. Create & Switch
```bash
git checkout -b <branch-name>
```

### 3. Confirm
```bash
git branch --show-current
```
- Tell the user what branch they're on
