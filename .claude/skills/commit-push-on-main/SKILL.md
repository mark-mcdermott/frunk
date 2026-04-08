---
name: commit-push-on-main
description: Commit changes, merge to main if needed, and push
usage: /commit-push-on-main
examples:
  - /commit-push-on-main
  - /cpom
allowed-tools:
  - Bash(git:*)
  - Read
---

# Commit Push on Main

Commit current changes and get them onto main. If already on main, just commit and push. If on a feature branch, commit, switch to main, merge the branch, and push.

## Workflow

### 1. Pre-Commit Checks
Run the project's typecheck, lint, and test commands (check package.json or project config for available scripts).
Fix any issues before proceeding.

### 2. Check Status & Stage
```bash
git status
git diff --stat
git add [files]
```

### 3. Commit
Read `.claude/commit-style.md` for the current commit style. Write the commit message following that style exactly.

**Commit rules (CRITICAL)**:
- Follow the format and rules in `.claude/commit-style.md`.
- No AI attribution. No co-author lines, no signatures, no references to Claude/AI.
- Commit as the developer, never as Claude.

### 4. Get to Main and Push

Determine the current branch:
```bash
git branch --show-current
```

**If already on `main`:**
```bash
git push origin main
```

**If on a feature branch:**
```bash
git checkout main
git merge [branch-name]
git push origin main
```

After pushing, report success to the user.

## Commit Style

See `.claude/commit-style.md` for the active style, format, examples, and reference table.
