# Skills Index

## Available Skills

| Skill | Command | Alias | When to Use |
|-------|---------|-------|-------------|
| Wizard | `/wizard` | | Project setup wizard — configure stack, commits, permissions, auto-PR |
| Branch | `/branch` | | Create a new branch and switch to it |
| Branch & Feature | `/branch-and-feature` | `/baf` | Create a branch and start building a feature |
| Commit | `/commit` | | Quick git commits with conversation context |
| Commit & PR | `/commit-and-pr` | `/cpr` | Commit, push, and create a PR in one step |
| Commit Push on Main | `/commit-push-on-main` | `/cpom` | Commit, merge to main if needed, and push |
| TDD | `/tdd` | | Build a feature TDD-style with tests |
| Branch & TDD | `/batdd` | | Create a branch and build a feature TDD-style |
| One-Shot | `/one-shot` | | Build entire project from checklist, TDD-style, autonomously |
| Branch & One-Shot | `/baos` | | Create a branch and one-shot a project from a checklist |
| Commit Style | `/commit-style` | | Switch between gitmoji, gitmoji-multiline, and conventional commits |
| Fix Commits | `/fix-commits` | | Rewrite repo commit history to match current commit style |
| Auto-PR | `/auto-pr` | | Toggle automatic PR creation after features are completed |
| Worktree | `/w` | | Create a git worktree for a new branch |
| Kill Worktree | `/kw` | | Remove a git worktree and optionally delete the branch |
| Worktree & Feature | `/waf` | | Create a worktree and build a feature in it |
| Worktree & TDD | `/watdd` | | Create a worktree and build a feature TDD-style in it |
| Worktree & One-Shot | `/waos` | | Create a worktree and one-shot a project in it |
| Abort | `/abort` | | Abandon the current branch and return to main |
| Merged | `/merged` | | Clean up after merging a PR |
| Permissions | `/permissions` | | Toggle between loose and tight permission presets |
| Stack | `/stack` | | Configure CLAUDE.md and hooks for a tech stack |

## Skill Descriptions

### /wizard
**Usage**: `/wizard`
**Does**: Interactive setup wizard. Asks 4 questions (stack, commit style, permissions, auto-PR) with sensible defaults, applies all config, then prints a quick reference of available skills. Run this first on a new project.

### /commit
**Usage**: `/commit [type]`
**Examples**: `/commit`, `/commit checkpoint`, `/commit experiment`
**Does**: Checks status, stages and commits with gitmoji message. For complex git operations (conflicts, rebase), delegate to git-manager agent instead.

### /commit-and-pr
**Alias**: `/cpr`
**Usage**: `/cpr` or `/commit-and-pr`
**Does**: Runs pre-commit checks, stages, commits with gitmoji message, pushes, and creates a PR. Returns the PR URL for review.

### /commit-push-on-main
**Alias**: `/cpom`
**Usage**: `/cpom` or `/commit-push-on-main`
**Does**: Commits current changes. If on main, pushes directly. If on a feature branch, switches to main, merges the branch, and pushes.

### /commit-style
**Usage**: `/commit-style <style>`
**Styles**: `gitmoji` (one-liners, default), `gitmoji-multiline` (summary + bullet body), `conventional` (type(scope): description)
**Does**: Rewrites `.claude/commit-style.md` which all commit skills read. One file change switches the style everywhere.

### /fix-commits
**Usage**: `/fix-commits`
**Does**: Audits the entire git history against `.claude/commit-style.md`, shows a change plan, and rewrites non-conforming commit messages. Requires two explicit confirmations (before rewrite and before force push). Uses `--force-with-lease` for safety.

### /auto-pr
**Usage**: `/auto-pr [on|off]`
**Does**: Toggles automatic PR creation. When on, `/tdd`, `/one-shot`, and `/branch-and-feature` will auto-commit and create a PR after completing work. Default is off. No argument defaults to on. Config stored in `.claude/auto-pr.md`.

### /tdd
**Usage**: `/tdd <feature description>`
**Examples**: `/tdd add a login page that redirects to dashboard`, `/tdd the contact form submits and shows a success toast`
**Does**: Writes a test for the feature (unit or e2e based on what fits), runs it to confirm failure, builds the feature, then iterates until the test passes.

### /batdd
**Usage**: `/batdd <branch-name> <feature description>`
**Examples**: `/batdd login add a login page that redirects to dashboard`
**Does**: Creates a branch, then runs `/tdd` with the feature description.

### /one-shot
**Usage**: `/one-shot <checklist or path to checklist file>`
**Examples**: `/one-shot build a todo app with auth, CRUD todos, and filtering`, `/one-shot CHECKLIST.md`
**Does**: Parses a checklist into tasks, then builds each feature TDD-style. Commits after each passing feature. Writes progress to `.claude/one-shot-progress.md` to survive context compression. Only returns when the full checklist is complete.

### /baos
**Usage**: `/baos <branch-name> <checklist or path to checklist file>`
**Examples**: `/baos todo-app build a todo app with auth, CRUD todos, and filtering`
**Does**: Creates a branch, then runs `/one-shot` with the checklist.

### /w
**Usage**: `/w <branch-name>`
**Does**: Creates a git worktree as a sibling directory and prints the path. Use to set up isolated workspaces for parallel Claude instances.

### /kw
**Usage**: `/kw <branch-name>`
**Does**: Removes a git worktree. Asks whether to also delete the branch.

### /waf
**Usage**: `/waf <branch-name> <feature description>`
**Does**: Creates a worktree, then builds a feature in it. Like `/baf` but in an isolated worktree. All file operations target the worktree path.

### /watdd
**Usage**: `/watdd <branch-name> <feature description>`
**Does**: Creates a worktree, then builds a feature TDD-style in it. Like `/tdd` but in an isolated worktree.

### /waos
**Usage**: `/waos <branch-name> <checklist or file>`
**Does**: Creates a worktree, then one-shots a project in it. Like `/one-shot` but in an isolated worktree. Progress file includes the worktree path to survive context compression.

### /branch
**Usage**: `/branch <branch-name>`
**Examples**: `/branch feat/dark-mode`, `/branch fix/broken-publish`
**Does**: Checks for clean state, creates the branch, switches to it. No commits, no implementation.

### /branch-and-feature
**Alias**: `/baf`
**Usage**: `/baf <branch-name> <feature description>`
**Examples**: `/baf merch-store add a merch store page`, `/baf fix/broken-publish fix the publish flow`
**Does**: Creates a branch (auto-prefixes `feat/` if no prefix given), then starts implementing the described feature.

### /abort
**Usage**: `/abort`
**Does**: Stashes any uncommitted work, switches to main, and force-deletes the branch. Safe bail-out when you want to discard a branch entirely.

### /merged
**Usage**: `/merged`
**Does**: Checks out main, pulls latest, deletes the merged branch locally and on the remote.

### /permissions
**Usage**: `/permissions <mode>`
**Modes**: `loose` (permissive, most things auto-allowed) or `tight` (read-only auto-allowed, everything else prompts)
**Does**: Rewrites the permissions block in `settings.local.json` to the selected preset. Preserves other settings. Destructive commands (`rm -rf`, `sudo`, force push) are always denied in loose mode.

### /stack
**Usage**: `/stack <mode>`
**Modes**: `zendcats` (Zod, Edge/Neon/Vercel, Next.js, Drizzle, Capacitor, Auth, Tauri, shadcn-ui) or `open` (any stack)
**Does**: Writes `CLAUDE.md` with stack-specific conventions, updates `pre-commit-guard.sh` with real eslint/prettier checks (zendcats) or generic reminders (open), and narrows `test-reminder.sh` extensions to match.

## Proactive Skill Usage

- Starting a new project -> `/wizard`
- Before committing -> `/commit`
- Work is done and needs a PR -> `/cpr`
- Quick commit and push to main -> `/cpom`
- Starting a new feature -> `/baf`
- Building a feature with test-first approach -> `/tdd`
- Building an entire project autonomously -> `/one-shot`
- Abandoning a branch -> `/abort`
- After a PR is merged -> `/merged`
