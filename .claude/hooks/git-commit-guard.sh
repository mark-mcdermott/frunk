#!/bin/bash
# .claude/hooks/git-commit-guard.sh
# Blocks commits and PRs with AI attribution
#
# Exit codes:
#   0 = Allow (no issues)
#   2 = BLOCKING (prevents tool execution)

INPUT=$(cat)

# Fast exit: skip jq parsing if this isn't a commit or PR command
case "$INPUT" in
  *"git commit"*|*"gh pr create"*) ;;
  *) exit 0 ;;
esac

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Check git commit commands for Co-Authored-By
if echo "$COMMAND" | grep -q "git commit"; then
  if echo "$COMMAND" | grep -qiE "co-authored-by.*(claude|anthropic|cursor|copilot|gemini|openai|gpt|ai assistant)"; then
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "additionalContext": "BLOCKED: AI co-author attribution detected.\\n\\nRule: Never attribute LLM as co-author of git commits.\\nProject instructions override Claude Code defaults.\\n\\nFix: Remove the 'Co-Authored-By' line referencing AI tools."
  }
}
EOF
    exit 2
  fi
fi

# Check gh pr create commands for AI attribution in body
if echo "$COMMAND" | grep -q "gh pr create"; then
  if echo "$COMMAND" | grep -qiE "(generated with claude|generated with ai|claude code|anthropic|🤖|co-authored-by.*(claude|anthropic|cursor|copilot|gemini|openai|gpt|ai assistant))"; then
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "additionalContext": "BLOCKED: AI attribution detected in PR.\\n\\nRule: Never include AI attribution in pull requests.\\nNo 'Generated with Claude Code', no co-author lines, no AI references.\\n\\nFix: Remove all AI attribution from the PR title and body."
  }
}
EOF
    exit 2
  fi
fi

exit 0
