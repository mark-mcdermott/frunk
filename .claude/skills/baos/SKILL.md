---
name: baos
description: Create a branch and build an entire project from a checklist, TDD-style, autonomously
usage: /baos <branch-name> <checklist or path to checklist file>
examples:
  - /baos todo-app build a todo app with auth, CRUD todos, and filtering
  - /baos ecommerce CHECKLIST.md
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
  - Skill
---

# Branch and One-Shot

Create a new branch, then build an entire project autonomously from a checklist.

## Workflow

1. Parse the first argument as the branch name, everything after as the checklist (or file path).
2. Use the Skill tool to invoke `branch` with the branch name.
3. Use the Skill tool to invoke `one-shot` with the checklist argument.
