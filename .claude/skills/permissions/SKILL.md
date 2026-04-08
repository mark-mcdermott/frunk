---
name: permissions
description: Toggle between permissive and restrictive permission presets in settings.local.json
usage: /permissions <mode>
examples:
  - /permissions loose
  - /permissions tight
allowed-tools:
  - Read
  - Edit
  - Write
---

# Permissions Skill

Switch between permission presets by rewriting the `permissions` block in `.claude/settings.local.json`. Preserves any other keys in the file.

## Modes

### loose

Allows most operations without prompting. Use when you trust the session and want speed.

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Edit",
      "Write",
      "Glob",
      "Grep",
      "WebFetch",
      "WebSearch",
      "Bash",
      "Agent",
      "Skill"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)",
      "Bash(git push --force *)",
      "Bash(git reset --hard *)"
    ]
  }
}
```

### tight

Only allows read-only tools and the project's skills. Everything else prompts.

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Skill",
      "Bash(git status *)",
      "Bash(git log *)",
      "Bash(git diff *)",
      "Bash(git branch --show-current)",
      "Bash(git branch --list *)",
      "Bash(ls *)"
    ]
  }
}
```

## Workflow

### 1. Parse the Mode
- If no mode given or mode is not `loose`/`tight`, list the available modes and stop.

### 2. Read Current Settings
```
Read .claude/settings.local.json
```
- If the file doesn't exist, start with `{}`.

### 3. Apply the Preset
- Replace the `permissions` key with the preset for the requested mode.
- Preserve all other keys in the file (e.g. custom env vars).
- Write the updated JSON back to `.claude/settings.local.json`.

### 4. Confirm
- Tell the user which mode was applied.
- If switching to `loose`, remind them that destructive commands (`rm -rf`, `sudo`, `force push`, `reset --hard`) are still denied.
- If switching to `tight`, remind them that most actions will prompt for approval.
