---
name: stack
description: Configure CLAUDE.md and hooks for a specific tech stack (zendcats or open)
usage: /stack <mode>
examples:
  - /stack zendcats
  - /stack open
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash(ls *)
---

# Stack Skill

Configure the project's `CLAUDE.md` and hooks for a specific tech stack. Run this once when starting a new project.

## Modes

### zendcats

The ZENDCATS stack: **Z**od, **E**dge (Neon/Vercel), **N**ext.js, **D**rizzle, **C**apacitor, **A**uth (hand-rolled), **T**auri, **S**hadcn-ui.

#### 1. Write CLAUDE.md

Write `./CLAUDE.md` at the project root with the following content (adapt project name from the directory name or package.json if present):

```markdown
# Project

## Tech Stack (ZENDCATS)
- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict)
- **Validation**: Zod — use for all schemas, form validation, API input/output
- **Database**: Neon (serverless Postgres) via Drizzle ORM
- **Deployment**: Vercel (edge where possible)
- **Mobile**: Capacitor
- **Desktop**: Tauri
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: Hand-rolled (no third-party auth libraries)

## Conventions
- Prefer server components; use `"use client"` only when needed
- Colocate related files: page, components, actions, schemas in the same route folder
- Zod schemas are the single source of truth — derive TypeScript types from them with `z.infer<>`
- Drizzle schemas live in `src/db/schema/`; migrations via `drizzle-kit`
- API routes use edge runtime when possible: `export const runtime = "edge"`
- shadcn/ui components go in `src/components/ui/`; custom components in `src/components/`
- Tailwind only — no CSS modules, no styled-components
- Imports use `@/` path alias for `src/`

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx prettier --check .` — Prettier check
- `npm test` — run tests
- `npx drizzle-kit generate` — generate migrations
- `npx drizzle-kit migrate` — apply migrations
```

#### 2. Update pre-commit-guard.sh

Replace the hook body (between the `if echo "$COMMAND" | grep -q "git commit"` block) so it actually runs lint checks before allowing a commit:

```bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if echo "$COMMAND" | grep -q "git commit"; then
  ERRORS=""

  # Run ESLint on staged files
  STAGED_FILES=$(git diff --cached --name-only --diff-filter=d | grep -E '\.(ts|tsx|js|jsx)$')
  if [ -n "$STAGED_FILES" ]; then
    LINT_OUTPUT=$(npx eslint $STAGED_FILES 2>&1)
    if [ $? -ne 0 ]; then
      ERRORS="$ERRORS\nESLint failed:\n$LINT_OUTPUT"
    fi
  fi

  # Run Prettier check on staged files
  ALL_STAGED=$(git diff --cached --name-only --diff-filter=d)
  if [ -n "$ALL_STAGED" ]; then
    PRETTIER_OUTPUT=$(npx prettier --check $ALL_STAGED 2>&1)
    if [ $? -ne 0 ]; then
      ERRORS="$ERRORS\nPrettier check failed:\n$PRETTIER_OUTPUT"
    fi
  fi

  if [ -n "$ERRORS" ]; then
    ESCAPED=$(echo "$ERRORS" | sed 's/"/\\"/g' | tr '\n' ' ')
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "additionalContext": "BLOCKED: Pre-commit checks failed.\n$ESCAPED\n\nFix the issues and try again."
  }
}
EOF
    exit 2
  fi
fi

exit 0
```

#### 3. Update test-reminder.sh

Narrow the source file extensions to the ZENDCATS stack:

```bash
  # Source code files
  *.ts|*.tsx|*.js|*.jsx)
```

Remove all other extensions (`.vue`, `.svelte`, `.rb`, `.py`, `.go`, `.rs`, `.java`, `.kt`, `.swift`).

---

### open

Wide-open mode — any language, any framework. Minimal CLAUDE.md, generic hooks.

#### 1. Write CLAUDE.md

Write `./CLAUDE.md` at the project root:

```markdown
# Project

## Commands
<!-- Fill in as the stack is decided -->
```

#### 2. Restore pre-commit-guard.sh to generic

Reset to the stack-agnostic reminder (no actual lint/test execution):

```bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if echo "$COMMAND" | grep -q "git commit"; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "Pre-Commit Checklist:\\n1. Did linting pass?\\n2. Did tests pass?\\n3. Should documentation be updated?\\n4. Use /commit skill for simple commits (has conversation context)."
  }
}
EOF
fi

exit 0
```

#### 3. Restore test-reminder.sh to broad extensions

Reset to the full list of extensions:

```bash
  # Source code files
  *.ts|*.tsx|*.js|*.jsx|*.vue|*.svelte|*.rb|*.py|*.go|*.rs|*.java|*.kt|*.swift)
```

---

## Workflow

### 1. Parse the Mode
- If no mode given or mode is not `zendcats`/`open`, list the available modes and stop.

### 2. Check for Existing CLAUDE.md
- If `./CLAUDE.md` exists, warn the user it will be overwritten and confirm before proceeding.

### 3. Apply the Stack
- Write `./CLAUDE.md` with the appropriate content.
- Rewrite `pre-commit-guard.sh` with the appropriate hook.
- Update the extension list in `test-reminder.sh`.
- Preserve the shebang and header comments in both hook files.

### 4. Confirm
- Tell the user which stack was applied.
- List what was changed (CLAUDE.md, pre-commit-guard.sh, test-reminder.sh).
- For `zendcats`, remind them to run `npm install` if eslint/prettier aren't installed yet.
