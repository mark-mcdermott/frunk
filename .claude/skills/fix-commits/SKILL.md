---
name: fix-commits
description: Rewrite commit messages across repo history to match the current commit style in .claude/commit-style.md
usage: /fix-commits
allowed-tools:
  - Bash(git:*)
  - Read
  - Write
---

# Fix Commits Skill

Audit the entire git history and rewrite any commit messages that don't match the current commit style defined in `.claude/commit-style.md`.

**WARNING**: This rewrites git history and requires a force push. Only use on branches where rewriting history is acceptable.

## Workflow

### 1. Read the Target Style

Read `.claude/commit-style.md` to determine the current commit style (gitmoji, gitmoji-multiline, or conventional) and its formatting rules.

### 2. Audit All Commits

Get every commit in the repo:
```bash
git log --format="%H|||%s|||%b" --reverse
```

For each commit, determine whether its message conforms to the current style:
- **gitmoji**: Must start with a `:gitmoji:` code followed by a brief description. Single line only.
- **gitmoji-multiline**: Must start with a `:gitmoji:` code. May have a bullet-list body after a blank line.
- **conventional**: Must start with `type(scope):` or `type:` followed by a description. May have a bullet-list body.

### 3. Build a Change Plan

Create a list of commits that need fixing. For each one, show:
- The commit hash (short)
- The current message
- The proposed new message

**Keep the semantic content the same.** Only change the format/prefix to match the target style. For example:
- `feat: add merch store` → `:sparkles: Add merch store` (if switching to gitmoji)
- `:sparkles: Add merch store` → `feat: add merch store` (if switching to conventional)
- `:recycle: Overhaul config — remove scaffolding, add skills` → `:recycle: Overhaul config` + bullet body (if switching to gitmoji-multiline and the message has multiple parts)

Commits that already match the target style should be left unchanged.

### 4. Present the Plan and Get Confirmation

Show the user the full list of proposed changes in a table:

```
| Commit  | Current Message            | New Message                |
|---------|----------------------------|----------------------------|
| abc1234 | feat: add login page       | :sparkles: Add login page  |
| def5678 | (already correct)          | (no change)                |
```

**Ask the user to confirm before proceeding.** This is a destructive operation — do NOT proceed without explicit approval.

### 5. Rewrite History

Create a temporary mapping script and use `git filter-branch` to rewrite the messages:

```bash
git filter-branch -f --msg-filter '
MSG=$(cat)
case "$MSG" in
  "old message 1"*) echo "new message 1" ;;
  "old message 2"*) echo "new message 2" ;;
  *) echo "$MSG" ;;
esac
' -- --all
```

For multiline messages, use a temp file approach or a more sophisticated script. The `case` match should use the first line (subject) as the key, and the full replacement should include the body if applicable.

After `filter-branch`, clean up:
```bash
git update-ref -d refs/original/refs/heads/main
```

### 6. Verify

```bash
git log --oneline
```

Show the user the updated history so they can verify the changes look correct.

### 7. Force Push (with confirmation)

**Ask the user again** before force pushing:

```bash
git push --force-with-lease origin main
```

Use `--force-with-lease` (not `--force`) for safety — it will fail if someone else has pushed in the meantime.

## Rules

- **Always get explicit user confirmation** before rewriting history (step 4) and before force pushing (step 7). These are two separate confirmations.
- **Preserve commit content.** Only change formatting/prefix — never alter the meaning of a commit message.
- **Leave correct commits alone.** If a commit already matches the target style, don't touch it.
- **Use `--force-with-lease`**, never `--force`.
- **If this is a shared repo**, warn the user that all collaborators will need to re-sync after the force push.
