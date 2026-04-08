---
name: one-shot
description: Build an entire project from a checklist, TDD-style, autonomously — only return when everything is done
usage: /one-shot <checklist or path to checklist file>
examples:
  - /one-shot build a todo app with auth, CRUD todos, and filtering
  - /one-shot CHECKLIST.md
allowed-tools:
  - Bash(npx:*)
  - Bash(git:*)
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

# One-Shot Skill

Autonomously build an entire project from a checklist. Each feature is built TDD-style — unit tests for logic/utilities, e2e tests for user-facing flows. Work is committed and documented as you go. Only return to the user when the full checklist is complete — or if truly blocked.

## Workflow

### 1. Parse the Checklist

If the argument is a file path, read it. Otherwise, parse the feature list from the argument text.

Break the project into discrete, ordered features. Each feature should be independently testable. If the user provided a checklist, respect their ordering. If not, order by dependency (foundational pieces first).

### 2. Create Tasks

Use `TaskCreate` for each feature in the checklist. This is critical — tasks survive context compression and keep you on track.

### 3. Initialize Progress File

**If `.claude/one-shot-progress.md` already exists**, back it up before starting fresh:
```bash
mkdir -p .claude/one-shot-progress-bak
mv .claude/one-shot-progress.md ".claude/one-shot-progress-bak/one-shot-progress-bak-$(date +%m-%d-%y-%H-%M-%S).md"
```

Write the initial progress file:

```markdown
# One-Shot Progress

## Checklist
- [ ] Feature 1
- [ ] Feature 2
- ...

## Completed Features

(none yet)

## Current State
Starting build.
```

Save to `.claude/one-shot-progress.md`.

### 4. Ensure Test Frameworks are Ready

Check what's available and install what's needed:

**For e2e tests (Playwright):**
```bash
npx playwright --version
```
If not installed and e2e tests will be needed:
```bash
npm install -D @playwright/test && npx playwright install
```

**For unit tests (Vitest/Jest):**
```bash
npx vitest --version || npx jest --version
```
If neither is installed and unit tests will be needed, prefer Vitest:
```bash
npm install -D vitest
```

Follow whichever frameworks the project already uses. Only install new ones if none exist.

### 5. For Each Feature — TDD Cycle

Before starting each feature, **re-read `.claude/one-shot-progress.md`** to re-orient (this is essential after context compression).

Then update the task status to `in_progress` and follow this cycle:

#### a. Choose Test Type
Pick unit or e2e based on what the feature is:
- User-facing flow (page, form, navigation) → **e2e** (Playwright)
- Utility, helper, validation, business logic → **unit** (Vitest/Jest)
- API route/middleware → judge by complexity

#### b. Write the Test (RED)
- Write a test for the feature using the appropriate framework
- Follow existing test conventions in the project

#### c. Confirm Failure
```bash
# e2e:
npx playwright test <test-file> --reporter=list
# unit:
npx vitest run <test-file>
```
- Must fail. If it passes, the test isn't testing anything new.

#### d. Build the Feature (GREEN)
- Implement the minimum to make the test pass
- Follow existing project patterns

#### e. Confirm Pass
Run the same test command from step c.
- If it fails, fix and rerun. Do not weaken the test.
- If it passes, continue.

#### f. Run Full Test Suite
```bash
# Run all available test suites
npx playwright test --reporter=list 2>/dev/null; npx vitest run 2>/dev/null
```
- Ensure nothing else broke. Fix regressions before moving on.

#### f. Commit
Read `.claude/commit-style.md` for the current commit style. Commit using that style.
```bash
git add [relevant files]
git commit -m "<message following .claude/commit-style.md>"
```
Commit after each passing feature. This protects work and keeps diffs small.

**Commit rules (CRITICAL)**:
- Follow the format and rules in `.claude/commit-style.md`.
- No AI attribution. No co-author lines, no signatures, no references to Claude/AI.

#### g. Slop Check
Quickly review your own work for this feature. Fix any issues before committing:
- Files created that aren't imported/used anywhere
- Wrapper functions or abstractions that are only used once (inline them)
- Utility files that duplicate what a library already provides
- Over-engineered patterns (factories, configs, abstractions) for simple things
- Gratuitous comments or docstrings on self-evident code

#### h. Update Progress

Mark the task as `completed`.

Update `.claude/one-shot-progress.md`:
- Check off the feature in the checklist
- Add an entry under "Completed Features" with a brief note on what was built and any key decisions
- Update "Current State" to reflect what's next

### 6. Final Steps

After all features are complete:

1. Run the full test suite one final time
2. **Update README**: If a `README.md` exists at the project root, update it to reflect everything that was built (features, setup instructions, tech stack, etc.)
3. Update progress file with final status
4. Delete `.claude/one-shot-progress.md` (it's served its purpose)
5. **Auto-PR check**: Read `.claude/auto-pr.md`. If auto-PR is **on** and the current branch is not `main`:
   - Push the branch
   - Create a PR covering all completed work, with no AI attribution
   - Report the PR URL to the user
5. Report to the user:
   - What was built (brief summary)
   - All tests passing
   - Number of commits made
   - Any decisions or trade-offs worth noting

## Rules

- **Do not return to the user mid-build** unless genuinely blocked (ambiguous requirement, missing credentials, external dependency you can't resolve). If something is unclear but you can make a reasonable default choice, do that and note it in the progress file.
- **Re-read the progress file before each feature.** This is your lifeline after context compression.
- **Commit after every passing feature.** Never accumulate more than one feature's worth of uncommitted work.
- **Never weaken a test to make it pass.** Fix the implementation. Exception: genuine test bugs (wrong selector, typo).
- **Run the full suite after each feature**, not just the new test. Catch regressions early.
- **Keep the progress file concise.** It needs to fit in context — no verbose logs. Key decisions and current state only.
- **If the dev server needs to be running**, start it in the background or configure `webServer` in `playwright.config.ts`.

## Commit Style

See `.claude/commit-style.md` for the active style, format, examples, and reference table.
