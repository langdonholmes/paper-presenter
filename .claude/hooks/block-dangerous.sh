#!/bin/bash
# PreToolUse hook: blocks catastrophically destructive commands.
# Defense-in-depth — works even under --dangerously-skip-permissions.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$COMMAND" ] && exit 0

if echo "$COMMAND" | grep -qE "(rm -rf /|dd if=|mkfs|:()\{ :|sudo rm)"; then
  echo "Blocked: catastrophically destructive command" >&2
  exit 2
fi
exit 0
