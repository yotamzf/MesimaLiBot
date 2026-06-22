#!/usr/bin/env bash
# PreToolUse(Bash) hook: block `git commit` / `git push` if a secret is detected.
# Wired up in .claude/settings.json. Reads the tool-call JSON on stdin.
set -euo pipefail

input="$(cat)"
# Extract the bash command being run (jq if available, else grep fallback).
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"
else
  cmd="$(printf '%s' "$input" | grep -o '"command"[^,]*' | head -1)"
fi

case "$cmd" in
  *"git commit"*|*"git push"*)
    root="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
    if [[ -x "$root/scripts/check-secrets.sh" ]]; then
      # Scan the whole tree so nothing slips through on push.
      if ! out="$(cd "$root" && bash scripts/check-secrets.sh --all 2>&1)"; then
        echo "secret-guard blocked this git operation:" >&2
        echo "$out" >&2
        exit 2   # exit 2 => Claude Code blocks the tool call and shows stderr
      fi
    fi
    ;;
esac
exit 0
