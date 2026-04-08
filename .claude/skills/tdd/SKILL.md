---
name: tdd
description: Build a feature TDD-style — write test first, confirm failure, implement, iterate until passing
usage: /tdd <feature description>
examples:
  - /tdd add a login page that redirects to dashboard after successful auth
  - /tdd the contact form submits and shows a success toast
  - /tdd create a parseDate utility that handles ISO and Unix timestamps
allowed-tools:
  - Bash(npx:*)
  - Bash(git:*)
  - Bash(npm:*)
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Agent
  - TaskCreate
  - TaskUpdate
---

# TDD Skill

Build a feature using test-driven development. Write the test first, watch it fail, build the feature, then iterate until the test passes.

## Workflow

### 1. Understand the Feature
- Read the user's feature description
- Explore the codebase to understand existing patterns, routes, components, and test structure
- Identify where the new feature fits

### 2. Choose Test Type

Decide whether this feature needs a **unit test** or an **e2e test** based on what's being built:

| Feature type | Test type | Framework |
|---|---|---|
| User-facing flow (page, form, navigation, UI interaction) | E2E | Playwright |
| API route, endpoint, middleware | E2E or unit (judge by complexity) | Playwright or Vitest/Jest |
| Utility function, helper, parser, formatter | Unit | Vitest/Jest |
| Data model, validation logic, business rules | Unit | Vitest/Jest |
| Component rendering, props, state | Unit | Vitest/Jest (+ Testing Library if available) |

If the project already has test conventions (e.g., only uses Vitest, or only uses Playwright), follow those.

### 3. Ensure Test Framework is Ready

**For e2e (Playwright):**
```bash
npx playwright --version
```
If not installed:
```bash
npm install -D @playwright/test && npx playwright install
```
Check for existing `playwright.config.ts` or `.js`.

**For unit (Vitest/Jest):**
```bash
npx vitest --version || npx jest --version
```
If neither is installed, prefer Vitest:
```bash
npm install -D vitest
```
Check for existing `vitest.config.ts`, `jest.config.*`, or test config in `package.json`.

Follow whichever framework the project already uses. Only install a new one if none exists.

### 4. Write the Test (RED)
- Create a test file that describes the expected behavior of the feature
- Follow existing test conventions if any exist in the project
- The test should be specific and meaningful — test behavior, not implementation details
- Keep the test focused on the feature being built

### 5. Run the Test — Confirm Failure

**E2e:**
```bash
npx playwright test <test-file> --reporter=list
```

**Unit:**
```bash
npx vitest run <test-file>
```
(or `npx jest <test-file>` if the project uses Jest)

- The test **must fail** at this stage. If it passes, the test is not testing anything new — revise it.
- Read the failure output to confirm it fails for the right reason (missing function/component/route, not a syntax error).

### 6. Build the Feature (GREEN)
- Implement the minimum code to make the test pass
- Follow existing project patterns and conventions
- Don't over-engineer — just make the test pass

### 7. Run the Test — Check for Pass

Run the same command from step 5.

- **If it passes**: Move to step 8.
- **If it fails**: Read the error, fix the implementation, and run again. Repeat until passing. Do not modify the test to make it pass — fix the code.

### 8. Auto-PR Check
Read `.claude/auto-pr.md`. If auto-PR is **on** and the current branch is not `main`:
- Commit the changes (following `.claude/commit-style.md`)
- Push the branch
- Create a PR with no AI attribution
- Report the PR URL to the user

If auto-PR is **off** or on `main`, skip this step.

### 9. Slop Check
Quickly review your own work for common AI coding issues. Fix any you find before moving on:
- Files created that aren't imported/used anywhere
- Wrapper functions or abstractions that are only used once (inline them)
- Utility files that duplicate what a library already provides
- Over-engineered patterns (factories, configs, abstractions) for simple things
- Gratuitous comments or docstrings on self-evident code

### 10. Update README
If a `README.md` exists at the project root, update it to reflect the new feature (add to feature list, update setup instructions, etc.). Skip if the feature doesn't warrant a README mention.

### 11. Done
- Report to the user that the feature is implemented and the test passes
- Mention what was built, what test type was used, and what the test covers

## Rules

- **Never weaken a test to make it pass.** Fix the implementation, not the test.
- **Exception**: If the test has a genuine bug (wrong selector, typo, unrealistic assertion), fix the test — but note it to the user.
- **Run the actual test command**, not just type-checks. E2e tests must execute in a browser; unit tests must actually run.
- **If the dev server needs to be running** for e2e tests, start it in the background or use `webServer` config in `playwright.config.ts`.
- **Keep tests isolated** — each test should not depend on state from other tests.
- **Match the project's existing test setup.** Don't introduce Vitest if the project uses Jest, or vice versa.
