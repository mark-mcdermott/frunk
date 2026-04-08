---
name: merged
description: Clean up after merging a PR — checkout main, delete the branch locally and on remote
usage: /merged
examples:
  - /merged
allowed-tools:
  - Bash(git:*)
  - Bash(gh:*)
---

# Merged Skill

Clean up after a PR has been merged. Switches to main and deletes the merged branch locally and on the remote.

## Workflow

### 1. Identify the Branch
- Use conversation context to determine which branch/PR was just merged
- If unclear, check `gh pr list --state merged --limit 1` or ask the user

### 2. Checkout Main
```bash
git checkout main
git pull origin main
```

### 3. Delete Branch Locally
```bash
git branch -d <branch-name>
```
Use `-d` (safe delete) — it will refuse if the branch hasn't been merged. Only use `-D` if the user explicitly asks.

### 4. Delete Branch on Remote
```bash
git push origin --delete <branch-name>
```
If the remote branch was already deleted (e.g., GitHub auto-delete on merge), this may fail — that's fine, just note it.

### 5. Confirm
- Show `git branch` to confirm the branch is gone locally
- Confirm the user is on `main` and up to date
