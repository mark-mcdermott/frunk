#!/bin/bash
# .claude/hooks/pre-commit-guard.sh
# Reminds to run lint/test before commits
# Stack-agnostic: adapt the lint/test commands to your project
#
# Exit codes:
#   0 = Allow (no issues)
#   2 = BLOCKING (prevents tool execution)

INPUT=$(cat)

# Fast exit: skip jq parsing if this isn't a commit command
case "$INPUT" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only trigger for git commit commands
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
