---
name: abort
description: Abandon the current branch — stash any work, switch to main, and delete the branch
usage: /abort
examples:
  - /abort
allowed-tools:
  - Bash(git:*)
---

# Abort Skill

Abandon the current branch and return to main. Stashes uncommitted work if present, then switches to main and deletes the branch.

## Workflow

### 1. Identify the Branch
```bash
git branch --show-current
```
- If already on `main`, stop — nothing to abort.
- Save the branch name for later deletion.

### 2. Stash If Needed
```bash
git status --porcelain
```
- If there are any uncommitted changes (staged or unstaged), stash them:
  ```bash
  git stash push -m "abort: stashed from <branch-name>"
  ```
- If the working tree is clean, skip this step.

### 3. Switch to Main
```bash
git checkout main
git pull origin main
```

### 4. Delete the Branch
```bash
git branch -D <branch-name>
```
Use `-D` (force delete) since the branch may not be merged — that's the whole point of aborting.

### 5. Confirm
- Show `git branch` to confirm the branch is gone
- If work was stashed, remind the user it's in `git stash list` if they ever need it
