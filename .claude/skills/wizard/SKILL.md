---
name: wizard
description: Project setup wizard — configure stack, commit style, permissions, and auto-PR with interactive prompts
usage: /wizard
allowed-tools:
  - AskUserQuestion
  - Skill
  - Read
  - Write
---

# Wizard Skill

Interactive setup wizard for new projects. Walks through each configuration option with defaults, then prints a quick reference of available skills.

## Workflow

### 1. Welcome
Print a brief one-line welcome: "Setting up project config. Press enter or pick defaults to go fast."

### 2. Ask All Config Questions

Use AskUserQuestion to ask **all 4 questions at once** (the tool supports up to 4 questions per call):

**Question 1 — Stack**
- Options: `open` (Recommended), `zendcats`
- Header: "Stack"

**Question 2 — Commit style**
- Options: `gitmoji` (Recommended), `gitmoji-multiline`, `conventional`
- Header: "Commits"

**Question 3 — Permissions**
- Options: `loose` (Recommended), `tight`
- Header: "Permissions"

**Question 4 — Auto-PR**
- Options: `off` (Recommended), `on`
- Header: "Auto-PR"

### 3. Apply Selections

For each answer, invoke the corresponding skill with the selected value:
1. `stack` with the chosen stack mode
2. `commit-style` with the chosen style
3. `permissions` with the chosen mode
4. `auto-pr` with the chosen setting

Do not print verbose output for each — just apply them silently.

### 4. Print Confirmation

Print a brief summary of what was configured:
```
Config complete: stack={X}, commits={X}, permissions={X}, auto-pr={X}
```

### 5. Print Quick Reference

Print this exactly:

```
Common skills:
  /baf <branch> <description> — branch and build a feature
  /batdd <branch> <feature> — branch and build a feature TDD-style
  /baos <branch> <checklist> — branch and one-shot a project
  /commit — quick commit and push
  /cpr — commit, push, and create a PR
  /tdd <feature> — build a feature test-first
  /one-shot <checklist> — build entire project autonomously
  /merged — clean up after PR merge

Worktree variants (isolated parallel work):
  /waf, /watdd, /waos — like /baf, /tdd, /one-shot but in a worktree
  /w <branch> — create worktree, /kw <branch> — tear it down

Also available:
  /abort — abandon branch, /cpom — commit and push to main
  /commit-style — switch commit format, /fix-commits — rewrite history
  /auto-pr — toggle auto PR creation, /permissions — switch permission mode
```
