---
name: commit-and-pr
description: Commit all changes, push, and create a PR in one step
usage: /commit-and-pr
examples:
  - /commit-and-pr
  - /cap
allowed-tools:
  - Bash(git:*)
  - Bash(gh:*)
  - Read
---

# Commit and PR Skill

Commit, push, and create a pull request in one workflow. For when work on a branch is done.

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
Write a gitmoji + one-sentence commit message based on the conversation context.
```bash
git commit -m ":sparkles: Add merch store page with product grid and cart"
```

**Commit rules (CRITICAL)**:
- One gitmoji + one sentence. No bullet lists, no multiline bodies.
- No AI attribution. No co-author lines, no signatures, no references to Claude/AI.
- Commit as the developer, never as Claude.

### 4. Analyze Full Branch
Review **all commits** on the branch (not just this one) for the PR summary.
```bash
git log --oneline main..HEAD
git diff main...HEAD --stat
```

### 5. Push & Create PR
```bash
git push -u origin [branch]
gh pr create --title "Brief description" --body "$(cat <<'EOF'
## Summary
- What was done and why (1-3 bullets)

## Changes
- Key change 1
- Key change 2

## Testing
- How it was tested (typecheck, lint, e2e, manual)

## Review Notes
- [ ] Code correctness and edge cases
- [ ] No hardcoded secrets or credentials
- [ ] Tests pass
- [ ] Linting passes
EOF
)"
```

**PR rules**:
- Title under 70 characters, no AI attribution
- No commit type prefix in PR title — just a clear description

### 6. After Creating
- **Always** return the PR URL to the user
- **Always** ask the user to review before merging
- **Never** merge PRs automatically
- **No AI attribution** in commits or PR

## Gitmoji Reference

| Type | Gitmoji | When |
|------|---------|------|
| New feature | `:sparkles:` | Adding new functionality |
| Bug fix | `:bug:` | Fixing broken behavior |
| Refactor | `:recycle:` | Restructuring without behavior change |
| Style/UI | `:lipstick:` | Visual/styling changes |
| Performance | `:zap:` | Performance improvements |
| Tests | `:white_check_mark:` | Adding or updating tests |
| Config | `:wrench:` | Configuration changes |
| Cleanup | `:fire:` | Removing code or files |
