---
name: waos
description: Create a worktree, then one-shot an entire project from a checklist in it
usage: /waos <branch-name> <checklist or path to checklist file>
examples:
  - /waos todo-app build a todo app with auth, CRUD todos, and filtering
  - /waos ecommerce CHECKLIST.md
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
  - TaskGet
---

# Worktree and One-Shot Skill

Create a git worktree for a new branch, then autonomously build an entire project from a checklist in it — like `/one-shot` but in an isolated worktree.

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

### 2. Initialize Progress File

Follow `/one-shot` step 3, but write the progress file to `<WORKTREE_PATH>/.claude/one-shot-progress.md`.

**Add the worktree path to the progress file header:**

```markdown
# One-Shot Progress

## Worktree
**Path**: <WORKTREE_PATH>
**CRITICAL**: ALL file operations must use absolute paths under this directory. If you find yourself using the main repo path, STOP and correct immediately. Alert the user.

## Checklist
- [ ] Feature 1
- [ ] Feature 2
- ...

## Completed Features

(none yet)

## Current State
Starting build.
```

### 3. Build the Project

Follow the same workflow as `/one-shot` (parse checklist, create tasks, ensure test frameworks, TDD cycle for each feature, commit after each, update progress), but:

- **Every Bash call** starts with `cd <WORKTREE_PATH> &&`
- **Every file path** is absolute under `<WORKTREE_PATH>/`
- The progress file is at `<WORKTREE_PATH>/.claude/one-shot-progress.md`
- **Before each feature**: re-read the progress file and verify the worktree path is correct

### 4. After Completion

Report to the user:
- What was built (brief summary)
- All tests passing
- Number of commits made
- The worktree path
- Remind them: "Run `/kw <branch-name>` when done to clean up the worktree."
