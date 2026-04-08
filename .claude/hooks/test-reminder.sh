#!/bin/bash
# .claude/hooks/test-reminder.sh
# Reminds to run tests after editing code files
# Stack-agnostic: triggers for common source file extensions
#
# This is a PostToolUse hook - runs AFTER Edit/Write operations
# Non-blocking (just adds context to the response)

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

# Only trigger for Edit and Write tools
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

# Skip if no file path
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

REMINDER=""

# Check if edited file is a source code file (not config, docs, etc.)
case "$FILE_PATH" in
  # Test/spec files themselves
  *_test.*|*_spec.*|*.test.*|*.spec.*|*__tests__/*)
    REMINDER="Test file modified. Consider running this test to verify changes."
    ;;

  # Source code files
  *.ts|*.tsx|*.js|*.jsx|*.vue|*.svelte|*.rb|*.py|*.go|*.rs|*.java|*.kt|*.swift)
    REMINDER="Source code modified ($FILE_PATH). Consider running related tests."
    ;;
esac

# Output reminder if we have one
if [ -n "$REMINDER" ]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "$REMINDER"
  }
}
EOF
fi

exit 0
