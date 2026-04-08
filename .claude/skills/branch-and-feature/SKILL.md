---
name: branch-and-feature
description: Create a new branch and start building a feature on it
usage: /branch-and-feature <branch-name> <feature description>
examples:
  - /baf merch-store add a merch store page with product grid
  - /branch-and-feature dark-mode add dark mode toggle to the settings panel
  - /baf fix/broken-publish fix the blog publish flow hanging on large posts
allowed-tools:
  - Bash(git:*)
  - Bash(gh:*)
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Agent
---

# Branch and Feature Skill

Create a new feature branch from the current branch and immediately start working on the described feature.

## Usage

```
/baf <branch-name> <feature description...>
```

The first argument is the branch name (will be prefixed with `feat/` if no prefix is given). Everything after is the feature description — what to build.

## Workflow

### 1. Parse Arguments
- **First word**: Branch name (e.g., `merch-store`)
- **Rest**: Feature description (e.g., "add a merch store page with product grid")
- If the branch name doesn't already have a prefix (`feat/`, `fix/`, `learn/`, etc.), prepend `feat/`

### 2. Ensure Clean State
```bash
git status
```
- If there are uncommitted changes, warn the user and stop — don't create the branch with dirty state
- If on a detached HEAD, warn and stop

### 3. Create Branch
```bash
git checkout -b feat/<branch-name>
```

### 4. Confirm & Build
- Confirm the branch was created: `git branch --show-current`
- Tell the user what branch you're on and what you're about to build
- **Then immediately start working on the feature** using the description provided
- Treat the description as the user's instructions — plan and implement accordingly

### 5. After Implementation
- Run the project's typecheck and lint commands to verify (check package.json or project config for available scripts)
- **Slop check**: Quickly review your own work for common AI coding issues. Fix any you find before moving on:
  - Files created that aren't imported/used anywhere
  - Wrapper functions or abstractions that are only used once (inline them)
  - Utility files that duplicate what a library already provides
  - Over-engineered patterns (factories, configs, abstractions) for simple things
  - Gratuitous comments or docstrings on self-evident code
- **Update README**: If a `README.md` exists at the project root, update it to reflect the new feature (add to feature list, update setup instructions, etc.). Skip if the feature doesn't warrant a README mention.
- **Auto-PR check**: Read `.claude/auto-pr.md`. If auto-PR is **on**:
  - Commit the changes (following `.claude/commit-style.md`)
  - Push the branch
  - Create a PR with no AI attribution
  - Report the PR URL to the user
- If auto-PR is **off**, do NOT auto-commit — let the user decide when to commit (they can use `/commit` or `/cpr`)

## Branch Name Conventions

| Prefix | Auto-applied when |
|--------|-------------------|
| `feat/` | No prefix given (default) |
| `fix/` | User provides `fix/` prefix |
| `learn/` | User provides `learn/` prefix |
| `experiment/` | User provides `experiment/` prefix |

## Examples

```
/baf merch-store add a merch store page with product grid
→ creates feat/merch-store, starts building

/baf fix/broken-publish the blog publish flow hangs on large posts
→ creates fix/broken-publish, starts debugging and fixing

/baf dark-mode add a dark mode toggle using Tailwind dark variant
→ creates feat/dark-mode, starts implementing
```
