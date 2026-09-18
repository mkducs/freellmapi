# Hooks

## guard-destructive.sh

A `PreToolUse` hook for the `Bash` tool. It denies a set of high-risk
patterns: force-push/hard-reset/`git clean -f`, recursive delete/chmod,
`DROP`/`TRUNCATE`, unqualified `DELETE`/`UPDATE` (no `WHERE` clause),
`kubectl delete`, `terraform destroy`/`apply -auto-approve`, `dd`, `mkfs`,
and pipe-to-shell installs (`curl ... | bash`).

Matching is case-insensitive substring/regex matching on the raw command
text. This is a heuristic, not a sandbox:
- it can be bypassed by obfuscation (env-var indirection, base64, `eval`,
  splitting a command across variables);
- it only sees the `Bash` tool's `command` field — it does not cover
  destructive actions taken through other tools (e.g. a database or infra
  MCP tool);
- it can also false-positive on text that merely *contains* a matched
  string (a comment, a test fixture, a log message).

If no Python interpreter (`python3` or `python`) is found, the hook **denies
by default** rather than allowing the command through — a safety hook must
fail closed, not silently no-op.

Treat this as defense-in-depth alongside human review, not a substitute for
it. Review and extend the pattern list for your environment, especially
before granting Bash access to any infrastructure or database tooling.

## session-start.sh

Creates the persistent `.ai/` directories if they do not exist.

The hooks are project-scoped through `.claude/settings.json`.
