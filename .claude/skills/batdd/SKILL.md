---
name: batdd
description: Create a branch and build a feature TDD-style
usage: /batdd <branch-name> <feature description>
examples:
  - /batdd login add a login page that redirects to dashboard after auth
  - /batdd contact-form the contact form submits and shows a success toast
allowed-tools:
  - Bash(git:*)
  - Bash(npx:*)
  - Bash(npm:*)
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Agent
  - TaskCreate
  - TaskUpdate
  - Skill
---

# Branch and TDD

Create a new branch, then build a feature TDD-style.

## Workflow

1. Parse the first argument as the branch name, everything after as the feature description.
2. Use the Skill tool to invoke `branch` with the branch name.
3. Use the Skill tool to invoke `tdd` with the feature description.
