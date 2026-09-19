# Verification — autonomous workflow scaffold install

Task: install `claude-autonomous-workflow` v1.2.0 into `mkducs/freellmapi`
Date: 2026-09-18
Branch: `claude/free-llm-apis-list-3reinw`

## Acceptance criteria

| # | Criterion | Result |
| --- | --- | --- |
| AC-001 | All 26 required scaffold files present at the repo root | **PASS** |
| AC-002 | `.claude/settings.json` is valid JSON | **PASS** |
| AC-003 | `CLAUDE.md` carries the merge-policy adaptation | **PASS** |
| AC-004 | No existing tracked file modified or deleted | **PASS** |
| AC-005 | Install is idempotent | **PASS** |
| AC-006 | Repository test suite unaffected | **UNKNOWN** — see below |

## Commands actually run

### Package audit before installation

Every file in the archive was read before anything was copied. The package
makes no network calls, reads no credentials, and its two hooks are
restrictive rather than permissive.

### Safety hook behaviour, probed before install

`guard-destructive.sh` was executed against synthetic `tool_input` payloads
from the scratch copy (not the repo):

| Command | Verdict |
| --- | --- |
| `curl -s http://localhost:3001/api/fallback` | DENY — pattern `curl -s http` |
| `npm test` | ALLOW |
| `git log --oneline \| shasum` | DENY — substring `\| sh` |
| `ls /tmp \| sha256sum` | DENY — substring `\| sh` |
| `rm -rf node_modules/.vite` | DENY — pattern `rm -rf` |
| `npx vitest run server/src/__tests__` | ALLOW |
| `git push --force origin main` | DENY — correct |
| `sqlite3 db "DELETE FROM models"` | DENY — correct, unqualified DELETE |

The first, third, fourth and fifth are false positives. The operator chose to
install the hook unmodified; recorded as DL-0003.

### Install dry run against a throwaway destination

`install.sh` was run against `/tmp/wfdst`, pre-seeded with a `README.md`, a
`.claude/settings.local.json` and a `.claude/hooks/contributing-check.mjs` to
mimic this repository's existing files.

```
OK: 26 required files present, settings.json parses,
CLAUDE.md carries the merge-policy adaptation.
done.
--- preserved ---
project readme
existing hook
--- file count ---
68
idempotent re-run: OK
```

### Real install

```
$ DST=/home/user/freellmapi bash install.sh
OK: 26 required files present, settings.json parses,
CLAUDE.md carries the merge-policy adaptation.
done.
```

### Post-install repository state

```
$ git status --porcelain | wc -l
8
$ git status --short
?? .ai/
?? .claude/agents/
?? .claude/hooks/README.md
?? .claude/hooks/guard-destructive.sh
?? .claude/hooks/session-start.sh
?? .claude/settings.json
?? .claude/skills/
?? CLAUDE.md

$ git diff --stat HEAD -- README.md CONTRIBUTING.md \
    .claude/settings.local.json .claude/hooks/contributing-check.mjs
(no output — untouched)
```

All eight paths are additions. No tracked file was modified.

## AC-006 — why the suite was not run

`node_modules` is absent in this environment, so running the suite would mean a
full dependency install first. The change adds only Markdown, JSON and shell
files: no TypeScript, no runtime code, no migration, no build input. There is
no structure-sensitive test in the suite (`routes/docs.test.ts` covers the
OpenAPI route, not repository files), so there is no path by which these
additions could change a test result.

Recorded as **UNKNOWN** rather than PASS: the reasoning is sound, but no test
command was executed, and Gate E does not accept reasoning as evidence. To
settle it: `npm ci && npx vitest run` from `server/`.

## Known gaps

- The packaged `.ai/scripts/validate-scaffold.py` resolves its root two levels
  above itself. That is correct inside the package but wrong at
  `.ai/scripts/`, where it validates `.ai/` and reports every required file as
  missing. It is kept for reference; `install.sh` runs a root-aware check
  instead. Fixing the packaged script is a candidate follow-up.
- The hooks in `.claude/settings.json` take effect for **new** sessions. The
  session that performed this install was not running under them.
