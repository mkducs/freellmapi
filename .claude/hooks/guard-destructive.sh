#!/usr/bin/env bash
# PreToolUse safety hook for Bash. Conservative, heuristic pattern-matching —
# not a sandbox. It cannot catch every obfuscation (env-var indirection,
# base64, eval). Treat it as defense-in-depth, not a substitute for human
# approval on production/destructive operations.
set -uo pipefail  # deliberately no -e: a mid-script failure must still reach
                   # the fail-closed branch below, not abort silently.

INPUT="$(cat)"

deny() {
  local reason="$1"
  python3 - "$reason" <<'PY' 2>/dev/null || printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked by project safety hook."}}\n'
import json, sys
print(json.dumps({
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": sys.argv[1],
  }
}))
PY
  exit 0
}

PY="$(command -v python3 || command -v python || true)"
if [[ -z "$PY" ]]; then
  deny "Safety hook could not find a Python interpreter to inspect this command, so it is denying by default. Install python3 or fix .claude/hooks/guard-destructive.sh."
fi

COMMAND="$(printf '%s' "$INPUT" | "$PY" -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)" || COMMAND=""

if [[ -z "$COMMAND" ]]; then
  # No command field to inspect (or unparsable input) — nothing this hook
  # can evaluate; let normal permission handling apply.
  exit 0
fi

LOWER="$(printf '%s' "$COMMAND" | tr '[:upper:]' '[:lower:]')"

# Simple substring patterns (case-insensitive via $LOWER).
PATTERNS=(
  'git push --force'
  'git push -f'
  'git reset --hard'
  'git clean -f'
  'git clean -x'
  'rm -rf'
  'rm -fr'
  'rm -r -f'
  'rm -f -r'
  'chmod -r 777'
  'chmod 777 -r'
  'chown -r'
  'drop database'
  'drop schema'
  'drop table'
  'truncate table'
  'kubectl delete'
  'terraform destroy'
  'terraform apply -auto-approve'
  'dd if='
  'mkfs'
  '> /dev/sd'
  '> /dev/nvme'
  'curl -s http'  # combined with a pipe-to-shell check below
  '| bash'
  '| sh'
  '|bash'
  '|sh'
)

for pattern in "${PATTERNS[@]}"; do
  if [[ "$LOWER" == *"$pattern"* ]]; then
    deny "Blocked by project safety hook: command matches high-risk pattern '${pattern}'. Obtain explicit human approval before running destructive or irreversible operations (CLAUDE.md Section 12)."
  fi
done

# Unqualified DELETE/UPDATE — the classic "forgot the WHERE clause" incident
# that wipes or corrupts an entire table. Flag only when there is no "where".
if [[ "$LOWER" == *"delete from"* && "$LOWER" != *"where"* ]]; then
  deny "Blocked by project safety hook: 'DELETE FROM' without a WHERE clause would remove every row. Add a WHERE clause or get explicit human approval for a full-table delete."
fi
if [[ "$LOWER" =~ update[[:space:]].+set[[:space:]] && "$LOWER" != *"where"* ]]; then
  deny "Blocked by project safety hook: 'UPDATE ... SET' without a WHERE clause would modify every row. Add a WHERE clause or get explicit human approval for a full-table update."
fi

exit 0
