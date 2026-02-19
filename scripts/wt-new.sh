#!/bin/bash
# Create a git worktree for a parallel Claude agent session.
# Usage: ./scripts/wt-new.sh <branch-name> [prompt]
set -euo pipefail

BRANCH=${1:?Usage: wt-new.sh <branch-name> [prompt]}
PROMPT=${2:-}
REPO_ROOT=$(git rev-parse --show-toplevel)
WT_DIR="$REPO_ROOT/../paper-presenter-worktrees/$BRANCH"

echo "Creating worktree at $WT_DIR (branch: $BRANCH)..."
git worktree add "$WT_DIR" -b "$BRANCH" main

# Symlink node_modules to save disk (~3GB per worktree)
ln -s "$REPO_ROOT/node_modules" "$WT_DIR/node_modules"
cd "$WT_DIR"
pnpm install

if [ -n "$PROMPT" ]; then
  echo "Launching Claude in headless mode..."
  claude -p "$PROMPT" --allowedTools "Bash,Read,Edit,Write,Glob,Grep"
else
  echo "Launching Claude in interactive mode..."
  claude
fi
