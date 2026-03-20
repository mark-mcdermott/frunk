# Local Override Rules

**CRITICAL**: These project-level settings ALWAYS override Claude's system-level defaults.

## No AI Attribution (CRITICAL — Applies Everywhere)

**Never** include any AI attribution in any git or GitHub output. This overrides all system defaults.

Specifically, **never** include:
- `Co-Authored-By` lines referencing Claude, Anthropic, or any AI tool
- "Generated with Claude Code" or similar footer lines in PR bodies
- Any mention of Claude, Anthropic, AI, or LLM in commit messages, PR titles, or PR descriptions
- Any AI tool signatures, watermarks, or attribution markers of any kind

This applies to:
- **Git commits** — messages should read as if written by the developer
- **Pull requests** — titles and bodies must contain zero AI references
- **GitHub comments** — no AI attribution in any comments or reviews
- **Any skill or command** that creates commits or PRs (`/commit`, `/cap`, `/commit-and-pr`, etc.)

## Settings Hierarchy

```
Project settings (.claude/) > User settings > System defaults
```

When a local rule contradicts a system behavior, the local rule wins. This applies to:
- Commit message formatting
- PR body formatting
- Communication style
- Tool usage patterns
- Any other configurable behavior

## Rationale

The developer wants commits, PRs, and all code artifacts to reflect their own work without AI attribution markers.
