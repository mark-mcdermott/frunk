---
description: Generate pull request name and description from current branch
alwaysApply: false
---

# PR - Pull Request Generation

Generate a pull request name and description, write to `tmp/pr-description.md`, and open for editing.

## Usage
When the user types "/pr", generate a pull request title and description based on:

1. **Current branch name** and commits
2. **Changes introduced** compared to upstream (master)
3. **Pull request template** structure from `.github/PULL_REQUEST_TEMPLATE.md`, omitting Checklist items that are known to be complete
4. Custom instructions in the context, including: "$ARGUMENT"

## Guidance
- Be terse! Explain what's new, but don't go into too much detail. They'll be reading the code too. This is just an intro.
- Omit calling out standard practices like writing tests unless it's significant (e.g. filling gaps in tests on existing code).
- The target audience is peer engineers who know and understand the app well and need little explanation of existing concepts.

## Process
1. **Validate branch**: Abort if current branch is `master` or `main`
2. **Analyze the current branch** and its commits to understand the changes
3. **Review the PR template** to understand the expected structure
4. **Generate a concise, descriptive PR name** (first line) using format specified in
5. **Create a description** following the template format
6. **Write to `tmp/pr-description.md`** with the generated content
7. **Open the file in Cursor** for viewing and editing
8. **Wait for user to reply with instruction to proceed** via "LGTM", "OK" or similar after they review/edit
9. **Execute `gh pr create`** command with the final content

## Workflow

### Initial Generation
- Write PR title and description to `tmp/pr-description.md`
- Open file in Cursor for editing
- Inform user to review and edit as needed

### After User Edits

Note: If the `gh` command fails because it isn't installed, advise the user to install it with `brew install gh` on MacOS, or `sudo apt install gh` or `sudo snap install gh` on Linux.

When user asks to proceed via "LGTM", "OK" or similar:

1. Push the branch with `git push -u`.
2. Extract the PR title and body from `tmp/pr-description.md` and create the pull request:
   ```
   bash -c 'tail -n +2 tmp/pr-description.md | gh pr create -a @me -B <local branch base> -t "$(head -n 1 tmp/pr-description.md)" -F -'
   ```
3. Stop here if the `gh pr create` command failed.
4. Delete `tmp/pr-description.md`.
5. Open the PR in the browser using `pr view --web`.
