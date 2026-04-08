---
name: waf
description: Create a worktree, then build a feature in it
usage: /waf <branch-name> <feature description>
examples:
  - /waf login add a login page that redirects to dashboard
  - /waf dark-mode add a dark mode toggle using Tailwind
allowed-tools:
  - Bash(git:*)
  - Bash(npx:*)
  - Bash(npm:*)
  - Bash(node:*)
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Agent
  - TaskCreate
  - TaskUpdate
---

# Worktree and Feature Skill

Create a git worktree for a new branch, then build a feature in it — like `/baf` but in an isolated worktree.

## Worktree Path Rules (CRITICAL)

**Read these rules before every file operation. Re-read after context compression.**

After creating the worktree, all work MUST happen in the worktree directory:

- **Bash commands**: Always prefix with `cd <WORKTREE_PATH> &&`
- **Read/Edit/Write/Glob/Grep**: Always use absolute paths under `<WORKTREE_PATH>/`
- **NEVER** operate on files in the original repo directory by accident

**Self-check**: Before every file operation, verify the path starts with the worktree directory. If you catch yourself using the original repo path, STOP and alert the user: "Warning: I almost edited a file in the main repo instead of the worktree. Correcting now."

## Workflow

### 1. Create Worktree

```bash
REPO_DIR=$(pwd)
PARENT_DIR=$(dirname "$REPO_DIR")
WORKTREE_PATH="$PARENT_DIR/<branch-name>"
git worktree add "$WORKTREE_PATH" -b <branch-name>
```

Save `WORKTREE_PATH` — this is the root for ALL subsequent operations.

### 2. Build the Feature

Follow the same workflow as `/branch-and-feature` (steps 4-5: implement the feature, run checks, slop check, update README, auto-PR check), but:

- **Every Bash call** starts with `cd <WORKTREE_PATH> &&`
- **Every file path** is absolute under `<WORKTREE_PATH>/`
- Explore the codebase in the worktree, not the main repo

### 3. After Completion

Report to the user:
- What was built
- The worktree path
- Remind them: "Run `/kw <branch-name>` when done to clean up the worktree."
