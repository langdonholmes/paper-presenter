#!/bin/bash
# Remove a git worktree and its branch (only if merged).
# Usage: ./scripts/wt-cleanup.sh <branch-name>
set -euo pipefail

BRANCH=${1:?Usage: wt-cleanup.sh <branch-name>}
REPO_ROOT=$(git rev-parse --show-toplevel)
WT_DIR="$REPO_ROOT/../paper-presenter-worktrees/$BRANCH"

echo "Removing worktree at $WT_DIR..."
git worktree remove "$WT_DIR"

echo "Deleting branch $BRANCH (only if merged)..."
git branch -d "$BRANCH"

echo "Done."
