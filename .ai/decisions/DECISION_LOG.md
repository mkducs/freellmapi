# Decision Log

Autonomous judgment calls, newest last. A human may override any entry by
editing its Status and leaving a note; an override is binding and anything
downstream of it gets reworked.

---

## DL-0001 — Scaffold layout: `CLAUDE.md` at root, everything else under `.ai/`

Date: 2026-09-18 · Status: Accepted · Confidence: High

**Decision.** Install the scaffold's `CLAUDE.md` at the repository root, and
place its `GUIDE.md`, `README.md`, `workflows/` and `scripts/` under `.ai/`
(as `.ai/GUIDE.md`, `.ai/SCAFFOLD.md`, `.ai/workflows/`, `.ai/scripts/`).

**Reasoning.** `CLAUDE.md` only works at the root — that is where Claude Code
loads it. The scaffold's other root files would collide with the project's
own: it ships a `README.md`, and this repository already has a 56KB one that
is its public front page. Copying the package root verbatim would have
overwritten it.

**Rejected.** (a) Whole package at root — clobbers `README.md`. (b) Whole
package under `.ai/` — `CLAUDE.md` would never load.

---

## DL-0002 — Merging is a Section 12 action in this repository

Date: 2026-09-18 · Status: Accepted (operator-confirmed) · Confidence: High

**Decision.** Adapt Sections 5 and 11. The workflow stays fully autonomous
through discover → research → architect → plan → implement → verify → review →
commit → push → **open PR**, and stops there. Merging, self-approving, and
dismissing reviews are prohibited; merging is added to the Section 12 list.

**Reasoning.** The upstream scaffold defaults to merging a spec's PR as soon as
Gate E passes, on the reasoning that a tested spec needs no human merge gate.
That default assumes a repository where merge is cheap and private. This one is
public, carries a CONTRIBUTING.md and human review, runs a Claude Approvals
check on PRs, and its `main` feeds the published catalog and release pipeline
that every existing install pulls from — so a merge reaches users, which is
precisely the blast radius Section 12 exists to gate. The scaffold itself
invites this check ("check for that wiring before treating a merge as routine").

**Rejected.** (a) Install verbatim — would have documented a posture the agent
will not execute, which is worse than no policy. (b) Stop at push and never
open PRs — loses the review surface that makes autonomous work auditable.

**Reversal condition.** If this repository ever gains a private staging fork
where merge does not reach users, revisit for that fork only.

---

## DL-0003 — `guard-destructive.sh` installed unmodified, false positives recorded

Date: 2026-09-18 · Status: Accepted (operator-confirmed) · Confidence: High

**Decision.** Ship the safety hook exactly as packaged. Do not patch its
patterns.

**Reasoning.** Operator chose "install as-is" when shown the evidence below.
A safety hook that is edited on installation is a safety hook nobody trusts;
the false positives cost an approval prompt, which is the cheap failure
direction.

**Evidence** — the hook was run against sample inputs before installation:

| Command | Verdict | Note |
| --- | --- | --- |
| `curl -s http://localhost:3001/api/fallback` | DENY | This exact command is allowlisted in the repo's own `.claude/settings.local.json`. The hook's `curl -s http` pattern fires standalone, though its comment says it was meant to pair with a pipe-to-shell check. |
| `git log --oneline \| shasum` | DENY | `\| sh` matches as a substring, so `shasum` / `sha256sum` / `shuf` all trip it. |
| `rm -rf node_modules/.vite` | DENY | Build-cache cleanup needs approval. |
| `npm test`, `npx vitest run …` | ALLOW | Normal verification is unaffected. |
| `git push --force origin main` | DENY | Correct. |
| `sqlite3 db "DELETE FROM models"` | DENY | Correct — unqualified DELETE. |

**Consequence.** Expect approval prompts for localhost `curl`, checksum pipes
and `rm -rf` on build directories. Not a bug to fix silently — raise it if it
becomes noisy.

---

## DL-0004 — Backlog seeded only with operator-confirmed findings

Date: 2026-09-18 · Status: Accepted · Confidence: High

**Decision.** Do not auto-populate `.ai/backlog/pending/`. Candidate specs
drawn from this session's analysis are staged separately for a human to move
in deliberately.

**Reasoning.** `.ai/backlog/README.md` states the rule plainly: "Claude does
not invent specs on its own." The candidates came out of a real analysis
session and are evidence-backed, but promoting them to pending is the human's
call, not the agent's.
