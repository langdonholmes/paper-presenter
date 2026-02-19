#!/bin/bash
# PostToolUse hook: runs typecheck after editing .ts/.tsx files.
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
if echo "$FILE" | grep -qE '\.(ts|tsx)$'; then
  cd "$(git rev-parse --show-toplevel 2>/dev/null || echo /Users/holme2/code/paper-presenter)"
  pnpm run build 2>&1 | tail -20
fi
