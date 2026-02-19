#!/bin/bash
# Autonomous agent loop: runs Claude in a worktree, verifies with build + test gates.
# Usage: ./scripts/agent-loop.sh <branch-name> <task-spec-file> [options]
#
# Options:
#   --max-retries N                    Max gate-failure retries (default: 3)
#   --max-turns N                      Max Claude agentic turns (default: 50)
#   --dangerously-skip-permissions     Skip permission prompts (for devcontainer)
set -euo pipefail

# ── Parse arguments ──

BRANCH=""
TASK_SPEC=""
MAX_RETRIES=3
MAX_TURNS=50
SKIP_PERMS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-retries) MAX_RETRIES="$2"; shift 2 ;;
    --max-turns) MAX_TURNS="$2"; shift 2 ;;
    --dangerously-skip-permissions) SKIP_PERMS="--dangerously-skip-permissions"; shift ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      if [[ -z "$BRANCH" ]]; then
        BRANCH="$1"
      elif [[ -z "$TASK_SPEC" ]]; then
        TASK_SPEC="$1"
      else
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$BRANCH" || -z "$TASK_SPEC" ]]; then
  echo "Usage: ./scripts/agent-loop.sh <branch-name> <task-spec-file> [options]" >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
WT_DIR="$REPO_ROOT/../paper-presenter-worktrees/$BRANCH"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="$REPO_ROOT/logs"
LOG_FILE="$LOG_DIR/${BRANCH}-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

# Resolve task spec to absolute path before cd
if [[ "$TASK_SPEC" = /* ]]; then
  TASK_SPEC_ABS="$TASK_SPEC"
else
  TASK_SPEC_ABS="$REPO_ROOT/$TASK_SPEC"
fi

if [[ ! -f "$TASK_SPEC_ABS" ]]; then
  echo "Task spec not found: $TASK_SPEC_ABS" >&2
  exit 1
fi

# ── Logging ──

log() {
  local msg="[$(date '+%H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

# ── Create worktree ──

log "Creating worktree at $WT_DIR (branch: $BRANCH)..."
git worktree add "$WT_DIR" -b "$BRANCH" main 2>&1 | tee -a "$LOG_FILE"

# Symlink node_modules
ln -s "$REPO_ROOT/node_modules" "$WT_DIR/node_modules"
cd "$WT_DIR"
pnpm install 2>&1 | tee -a "$LOG_FILE"

# ── Build initial prompt ──

TASK_CONTENT=$(cat "$TASK_SPEC_ABS")
INITIAL_PROMPT="You are an autonomous coding agent. Complete the following task in this repository.

IMPORTANT: After making changes, verify your work by running:
  pnpm run build
  pnpm run test

Fix any errors before finishing.

--- TASK SPEC ---
$TASK_CONTENT
--- END TASK SPEC ---"

# ── Agent loop ──

ATTEMPT=0
SESSION_ID=""

run_claude() {
  local prompt="$1"
  local claude_args=(
    -p "$prompt"
    --output-format json
    --max-turns "$MAX_TURNS"
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep"
  )
  if [[ -n "$SKIP_PERMS" ]]; then
    claude_args+=("$SKIP_PERMS")
  fi
  if [[ -n "$SESSION_ID" ]]; then
    claude_args+=(--resume "$SESSION_ID")
  fi

  local output
  output=$(claude "${claude_args[@]}" 2>&1) || true

  # Extract session_id from JSON output
  local sid
  sid=$(echo "$output" | jq -r '.session_id // empty' 2>/dev/null || true)
  if [[ -n "$sid" ]]; then
    SESSION_ID="$sid"
  fi

  echo "$output" >> "$LOG_FILE"
}

run_gates() {
  log "Running gates: build + test..."
  local gate_output
  local gate_exit=0

  gate_output=$(cd "$WT_DIR" && pnpm run build 2>&1) || gate_exit=$?
  echo "$gate_output" >> "$LOG_FILE"

  if [[ $gate_exit -ne 0 ]]; then
    log "BUILD FAILED (exit $gate_exit)"
    GATE_FAILURE="Build failed with exit code $gate_exit:
$gate_output"
    return 1
  fi
  log "Build passed."

  gate_output=$(cd "$WT_DIR" && pnpm run test:coverage 2>&1) || gate_exit=$?
  echo "$gate_output" >> "$LOG_FILE"

  if [[ $gate_exit -ne 0 ]]; then
    log "TESTS OR COVERAGE FAILED (exit $gate_exit)"
    GATE_FAILURE="Tests or coverage thresholds failed with exit code $gate_exit:
$gate_output"
    return 1
  fi
  log "Tests and coverage passed."
  return 0
}

# Initial Claude run
log "Starting agent loop (max retries: $MAX_RETRIES, max turns: $MAX_TURNS)"
log "Task spec: $TASK_SPEC_ABS"
log "--- Attempt 1: initial run ---"
run_claude "$INITIAL_PROMPT"

while [[ $ATTEMPT -lt $MAX_RETRIES ]]; do
  GATE_FAILURE=""
  if run_gates; then
    log "=== ALL GATES PASSED ==="
    log "Branch: $BRANCH"
    log "Worktree: $WT_DIR"
    exit 0
  fi

  ATTEMPT=$((ATTEMPT + 1))
  if [[ $ATTEMPT -ge $MAX_RETRIES ]]; then
    log "=== MAX RETRIES EXHAUSTED ($MAX_RETRIES) ==="
    log "Worktree left intact for inspection: $WT_DIR"
    log "Clean up with: ./scripts/wt-cleanup.sh $BRANCH"
    exit 1
  fi

  log "--- Attempt $((ATTEMPT + 1)): retry after gate failure ---"
  RETRY_PROMPT="The build/test gates failed after your changes. Fix the issues and try again.

FAILURE OUTPUT:
$GATE_FAILURE

Run 'pnpm run build' and 'pnpm run test' to verify your fixes."
  run_claude "$RETRY_PROMPT"
done

# Should not reach here, but just in case
exit 1
