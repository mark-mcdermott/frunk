---
name: auto-pr
description: Toggle automatic PR creation after features are completed — on or off
usage: /auto-pr [on|off]
examples:
  - /auto-pr
  - /auto-pr on
  - /auto-pr off
allowed-tools:
  - Read
  - Write
---

# Auto-PR Skill

Toggle whether skills automatically create PRs after completing features.

## Behavior

- `/auto-pr` with no argument → sets to **on**
- `/auto-pr on` → sets to **on**
- `/auto-pr off` → sets to **off**
- Default (before this skill is ever run) is **off**

## Action

### If setting to `on`

Write this to `.claude/auto-pr.md`:

```markdown
# Auto-PR: on

When **on**, skills that complete features will automatically commit, push, and create a PR at appropriate points.

## What this affects

- `/tdd` — after the feature passes, commit and create a PR
- `/one-shot` — create a PR at reasonable milestones (not after every single feature, but at logical grouping points or when the full checklist is done)
- `/branch-and-feature` — after the feature is built and verified, commit and create a PR

## PR rules

- Branch must not be `main` — if on main, push directly instead of creating a PR
- PR title: under 70 characters, clear description
- PR body: summary of changes, testing done
- **No AI attribution whatsoever** — no co-author lines, no Claude/AI mentions, no generated-by footers
- After creating the PR, report the URL to the user
- Never auto-merge — always let the user review
```

### If setting to `off`

Write this to `.claude/auto-pr.md`:

```markdown
# Auto-PR: off

When **off** (default), skills commit but do not create PRs automatically. The developer decides when to PR.

When **on**, skills that complete features will automatically commit, push, and create a PR at appropriate points.
```

### After Writing

Confirm the change to the user: "Auto-PR switched to **{on|off}**."
