---
name: commit-style
description: Switch commit message style — gitmoji (default one-liners), gitmoji-multiline, or conventional
usage: /commit-style <style>
examples:
  - /commit-style gitmoji
  - /commit-style gitmoji-multiline
  - /commit-style conventional
allowed-tools:
  - Read
  - Write
---

# Commit Style Skill

Switch the project's commit message style. All skills that create commits read `.claude/commit-style.md` to determine the current style.

## Usage

`/commit-style <style>` where style is one of: `gitmoji`, `gitmoji-multiline`, or `conventional`.

## Action

Read `.claude/commit-style.md`, then overwrite it with the selected style below.

---

### If style is `gitmoji`

Write this to `.claude/commit-style.md`:

```markdown
# Commit Style: gitmoji

All commit messages must follow **gitmoji** style with single-line messages.

## Format

\`\`\`
:gitmoji: Brief description
\`\`\`

## Examples

\`\`\`
:sparkles: Add merch store page with product grid
:bug: Fix login redirect loop on expired sessions
:recycle: Extract shared validation into utility
\`\`\`

## Reference

| Type | Code | When |
|------|------|------|
| New feature | `:sparkles:` | Adding new functionality |
| Bug fix | `:bug:` | Fixing broken behavior |
| Refactor | `:recycle:` | Restructuring without behavior change |
| Style/UI | `:lipstick:` | Visual/styling changes |
| Performance | `:zap:` | Performance improvements |
| Tests | `:white_check_mark:` | Adding or updating tests |
| Config/chore | `:wrench:` | Configuration changes |
| Cleanup | `:fire:` | Removing code or files |
| Docs | `:memo:` | Documentation updates |
| Initial commit | `:tada:` | Project scaffolding |
| Learning | `:seedling:` | New concept or skill demonstrated |
| Checkpoint | `:triangular_flag_on_post:` | Major milestone completion |
| Experiment | `:alembic:` | Exploratory work |

## Rules

- One line only. No bullet lists, no multiline bodies.
- No AI attribution. No co-author lines, no signatures, no references to Claude/AI.
```

---

### If style is `gitmoji-multiline`

Write this to `.claude/commit-style.md`:

```markdown
# Commit Style: gitmoji-multiline

All commit messages must follow **gitmoji** style. A summary line is required; a bullet-list body is encouraged when there are multiple changes.

## Format

\`\`\`
:gitmoji: Brief summary

- Detail about change 1
- Detail about change 2
\`\`\`

Single-line is fine for small commits. Use bullets when the commit touches multiple things.

## Examples

Single change:
\`\`\`
:bug: Fix login redirect loop on expired sessions
\`\`\`

Multiple changes:
\`\`\`
:sparkles: Add merch store page

- Create product grid with responsive layout
- Add cart sidebar with quantity controls
- Wire up Stripe checkout integration
\`\`\`

## Reference

| Type | Code | When |
|------|------|------|
| New feature | `:sparkles:` | Adding new functionality |
| Bug fix | `:bug:` | Fixing broken behavior |
| Refactor | `:recycle:` | Restructuring without behavior change |
| Style/UI | `:lipstick:` | Visual/styling changes |
| Performance | `:zap:` | Performance improvements |
| Tests | `:white_check_mark:` | Adding or updating tests |
| Config/chore | `:wrench:` | Configuration changes |
| Cleanup | `:fire:` | Removing code or files |
| Docs | `:memo:` | Documentation updates |
| Initial commit | `:tada:` | Project scaffolding |
| Learning | `:seedling:` | New concept or skill demonstrated |
| Checkpoint | `:triangular_flag_on_post:` | Major milestone completion |
| Experiment | `:alembic:` | Exploratory work |

## Rules

- Summary line: one gitmoji + one sentence.
- Body (optional): blank line after summary, then bullet list of changes.
- No AI attribution. No co-author lines, no signatures, no references to Claude/AI.
```

---

### If style is `conventional`

Write this to `.claude/commit-style.md`:

```markdown
# Commit Style: conventional

All commit messages must follow **Conventional Commits** style.

## Format

\`\`\`
type(scope): brief description

- Detail about change 1
- Detail about change 2
\`\`\`

Scope is optional. Body is optional — use bullets when the commit touches multiple things.

## Examples

Single change:
\`\`\`
fix: resolve login redirect loop on expired sessions
\`\`\`

With scope:
\`\`\`
feat(store): add merch store page with product grid
\`\`\`

With body:
\`\`\`
feat(store): add merch store page

- Create product grid with responsive layout
- Add cart sidebar with quantity controls
- Wire up Stripe checkout integration
\`\`\`

## Types

| Type | When |
|------|------|
| feat | Adding new functionality |
| fix | Fixing broken behavior |
| refactor | Restructuring without behavior change |
| style | Visual/styling/formatting changes |
| perf | Performance improvements |
| test | Adding or updating tests |
| chore | Configuration, tooling, dependencies |
| docs | Documentation updates |
| ci | CI/CD pipeline changes |
| build | Build system changes |

## Rules

- Subject line: `type(scope): description` — lowercase, no period at end.
- Body (optional): blank line after subject, then bullet list.
- No AI attribution. No co-author lines, no signatures, no references to Claude/AI.
```

---

## After Writing

Confirm the change to the user: "Commit style switched to **{style}**."
