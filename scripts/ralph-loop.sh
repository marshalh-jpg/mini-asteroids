#!/usr/bin/env bash
# Ralph-wiggum-style build loop.
#
# Repeatedly invokes headless `claude -p` against a fixed prompt. Each
# invocation is stateless: it reads the plan file, does the first unchecked
# task, checks it off, and appends one line to the progress log, then exits.
# The loop keeps going until the plan file has no unchecked tasks left (or a
# max iteration count is hit as a safety backstop). The caller (not the
# looped agent) is responsible for git commits.
#
# Usage: ralph-loop.sh <plan-file> <progress-log> [max-iterations]

set -uo pipefail

PLAN_FILE="$1"
PROGRESS_FILE="$2"
MAX_ITER="${3:-10}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_TEMPLATE="$SCRIPT_DIR/ralph-prompt-build.md"

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "[ralph-loop] plan file not found: $PLAN_FILE" >&2
  exit 2
fi
touch "$PROGRESS_FILE"

for i in $(seq 1 "$MAX_ITER"); do
  if ! grep -q '^- \[ \]' "$PLAN_FILE"; then
    echo "[ralph-loop] all tasks in $PLAN_FILE are checked off after $((i - 1)) iteration(s)."
    exit 0
  fi

  echo "[ralph-loop] iteration $i/$MAX_ITER against $PLAN_FILE"

  PROMPT="$(cat "$PROMPT_TEMPLATE")

Plan file: $PLAN_FILE
Progress log: $PROGRESS_FILE"

  claude -p "$PROMPT" \
    --permission-mode bypassPermissions \
    --disallowedTools "Bash(git *)"

  echo "[ralph-loop] iteration $i finished."
done

if grep -q '^- \[ \]' "$PLAN_FILE"; then
  echo "[ralph-loop] reached max iterations ($MAX_ITER) with unchecked tasks remaining in $PLAN_FILE." >&2
  exit 1
fi

echo "[ralph-loop] all tasks in $PLAN_FILE are checked off."
