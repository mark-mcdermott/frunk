---
name: commit
description: Quick git commits with conversation context
usage: /commit [type]
examples:
  - /commit
  - /commit checkpoint
  - /commit experiment
allowed-tools:
  - Bash(git:*)
  - Read
---

# Commit Skill

Quick commits that leverage conversation context. Just stage, commit, and push — no PR creation. Use `/cpr` when the work is done and needs a PR.

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
Read `.claude/commit-style.md` for the current commit style (gitmoji, gitmoji-multiline, or conventional). Write the commit message following that style exactly.

**Commit rules (CRITICAL)**:
- Follow the format and rules in `.claude/commit-style.md`.
- No AI attribution. No co-author lines, no signatures, no references to Claude/AI.
- Commit as the developer, never as Claude.

### 4. Push
```bash
git push origin [current-branch]
```

If the branch has no upstream yet, use `git push -u origin [branch]`.

## Commit Style

See `.claude/commit-style.md` for the active style, format, examples, and reference table. Use `/commit-style` to switch between gitmoji, gitmoji-multiline, and conventional.
