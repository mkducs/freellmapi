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

---

## DL-0005 — U-001 resolved: a merge to `main` is a release

Date: 2026-09-18 · Status: Accepted · Confidence: High

**Decision.** Record that `main` is wired to automatic publication, and treat
DL-0002's merge gate as confirmed on the scaffold's own criterion rather than
only on this project's review conventions.

**Evidence.** `.github/workflows/cli-release.yml` runs on `push: branches:
[main]` and publishes the CLI to npm with OIDC trusted publishing.
`.github/workflows/docker.yml` runs on the same trigger and pushes an image to
ghcr. Neither is gated behind an environment approval.

**Consequence.** `CLAUDE.md` Section 11's test — "if this repository's default
branch is wired to an automatic deployment, that merge is a production
deployment" — is met. No policy change needed; DL-0002 already put merge under
Section 12. `project.md` now records the wiring so no future task re-derives it.

---

## DL-0006 — Provider tier facts go in a new table, not on `models`

Date: 2026-09-18 · Status: Proposed (see ADR-0001) · Confidence: High on shape

**Decision.** Model the free-tier registry as a provider-level
`provider_registry` table plus three nullable model-level columns, delivered
through a new `providers` array in the signed catalog. Full reasoning, DDL,
types and rejected alternatives in `.ai/decisions/ADR-0001-provider-registry-schema.md`.

**Reasoning in brief.** The operator proposed a flat provider schema carrying
rpm/tpm/rpd alongside licence and card fields. Half of that already exists per
model in `models`, and duplicating it across ~635 provider endpoints would
create rows that disagree. The genuinely missing half is tier semantics —
`free_type`, `card_required`, `commercial_allowed`, `production_allowed`,
`last_verified_at`, `quota_source_url` — which is provider-scoped and belongs
in its own table.

**Why now.** Three independent incidents already needed this field set:
SambaNova (a free tier that lapsed, with no way to express "will expire"),
Cohere (trial keys documented as not for production, routed as ordinary
candidates today), and ElevenLabs (assessed as a clean technical fit, blocked
on a non-commercial licence the catalog cannot carry).

**Rejected.** Columns on `models`; a single `free: boolean` (the status quo
that produced all three incidents); provider facts in code (needs a release to
correct a quota claim); a generic key/value metadata table (no types, no
constraints).

**Open.** The enum boundaries for `free_type`, and whether
`commercial_allowed` is provider-level often enough to justify its position —
tracked as U-007 and as ADR-0001's reversal condition.

---

## DL-0007 — Reading "Approved" as ADR acceptance, not merge authorisation

Date: 2026-09-19 · Status: Accepted · Confidence: Medium-High

**Decision.** Treat the operator's one-word "Approved" as acceptance of
ADR-0001 and authorisation to implement it. Do **not** read it as approval to
merge PR #1.

**Reasoning.** The message it answered ended by flagging the ADR as
"Status: Proposed, pending human review" and offering to split the branch, so
the ADR is the nearest referent. The competing reading — approval to merge — is
a Section 12 action, where Section 16 requires a stop-and-ask rather than an
inference from an ambiguous word. Reading it narrowly is also the recoverable
error: if the operator did mean the split or the merge, nothing is lost but a
question, whereas a wrong merge publishes to npm and ghcr (DL-0005).

**Rejected.** (a) Merging PR #1 — Section 12, and no autonomy level permits
inferring it. (b) Stopping to ask before doing anything — the ADR reading is
strongly supported by context, and rule 15 says to decide and log rather than
block on a judgment call that evidence can settle.

**Scope of the implementation.** ADR-0001's `commercial_use` routing filter is
deliberately excluded: it changes routing behaviour and deserves its own plan,
tests and review (rule 8, smallest coherent change). Schema, types, catalog
transport and tests only — the schema lands inert.

---

## DL-0008 — The models rebuild must preserve columns added after it

Date: 2026-09-19 · Status: Accepted · Confidence: High

**Decision.** Change `rebuildModels()` in the 2026-07-29 endpoint-identity
migration so that columns present on the live `models` table but unknown to that
migration are carried through its rebuild, instead of being silently dropped.

**Discovery.** Implementing ADR-0001 added the first `models` column since July.
The full suite immediately failed `endpoint-identity.test.ts > is idempotent
across a down/up round trip`. Root cause: that migration rebuilds `models` from
a column list frozen at its own date (SQLite cannot drop a table-level UNIQUE,
so the table is recreated). Any later column — and its data — is destroyed on a
re-run. The comment above the list says it is written out in full "so the
rebuilt schema is auditable here and identical on every run", which is a good
reason to freeze what it CREATES and not a reason to destroy what it does not
know about.

**Why fix it rather than work around it.** The alternatives were worse.
Adding the new columns to the old migration's frozen list would misrepresent the
schema as of its date and diverge column order between fresh and upgraded
installs. Relaxing the test's exact-text comparison would hide a real data-loss
bug to make this change pass — the test is correct and was doing its job.
Putting the three fields somewhere other than `models` to dodge the area would
contort ADR-0001's design around a latent defect rather than fixing it.

**Two details worth knowing.** `endpoint_scope` is excluded from preservation
explicitly, because that migration owns it and `down()` exists to remove it.
Carried columns are rendered exactly as SQLite renders `ALTER TABLE ADD COLUMN`
into the stored CREATE text, so the rebuilt schema stays byte-identical to the
ALTER-produced one and the roundtrip test keeps its strict comparison.

**Scope.** This is the rule-9 path in CLAUDE.md Section 9 — implementation
revealed the plan was incomplete, so the discovery is logged and the work
continued. Not a Section 12 item: no production data is touched by the change
itself, though it does alter a migration that has already run on user databases,
which is called out for reviewers in the verification report.

**Reversal condition.** If a future migration needs the rebuild to intentionally
drop a column, it must add that column name to the `known` set the way
`endpoint_scope` is, rather than reverting this behaviour wholesale.

---

## DL-0009 — The providers page is generated from PLATFORMS, not written by hand

Date: 2026-09-21 · Status: Accepted · Confidence: High

**Decision.** Ship `docs/providers.html` as a build product of the PLATFORMS
registry in `client/src/components/keys/shared.tsx`, produced by
`scripts/generate-providers-page.mjs`, with a `--check` mode wired into a test
that fails when the committed page drifts from the registry.

**Reasoning.** A hand-written page listing 49 providers is correct exactly once.
This repository already has the evidence: `docs/en/providers/01-supported-platforms.md`
drifted to claiming 45 platforms while the union had grown to 49, and its
catalog table is missing five registered providers — nothing failed, because
nothing checked. The registry changes often enough that a static copy is a
liability. Generating it makes the page structurally incapable of disagreeing
with what the dashboard renders, and the repo already has the pattern to hang
it on (`scripts/dev-bootstrap.mjs` + a colocated `node --test` file wired into
`npm test`).

**Access badges are derived, not re-listed.** The `keyless` flag and the label
text already encode "no key needed", "payment method", "Discord verification"
and "cn real-name". Classifying from those strings avoids a second
hand-maintained list that could contradict the first.

**Rejected.** (a) Committing the hand-built page from earlier in this session —
correct today, stale on the next provider. (b) Generating at build time without
committing the output — loses the ability to read the page from the repo and
gives the drift check nothing to compare against. (c) Refactoring PLATFORMS into
a shared data module both the client and the script import — cleaner in
principle, but it touches client source for a docs artifact, which is a bigger
blast radius than this change warrants.

**Known weakness.** The generator regex-parses TypeScript. Mitigated by failing
loudly rather than quietly: a platform floor, duplicate-id and empty-label
checks, and a whole-file comparison in the test. Two real bugs surfaced this way
during implementation — a missed trailing comma in `CUSTOM_GROUP` that silently
dropped an entry, and ModelScope's "cn binding" wording escaping the CN
classification.

**Reversal condition.** If PLATFORMS ever moves into a plain data module (JSON
or a `.ts` with no JSX imports), replace the parser with a direct import — the
generator and its tests stay, only the parse changes.

---

## DL-0010 — Account-level gates meter an account, not a credential

Date: 2026-09-22 · Status: Accepted · Confidence: High

**Decision.** Add `api_keys.account_group` and have all four account-level gates
— daily requests, per-minute requests, daily tokens, in-flight concurrency —
count across every key sharing a group. NULL (every existing row) means
ungrouped and keeps the previous per-key behaviour exactly.

**Reasoning.** The gates exist to mirror what the provider meters, and providers
meter accounts. Counting per key is a correct proxy only while one key means one
account. The moment an operator adds a second key from the same account, each
gets a full local budget while the provider still meters one, so the router
dispatches up to 2× the cap and collects real 429s — adding a key makes
throughput *worse*. The codebase already models the provider half of this
distinction (`inferQuotaPoolKey` returns `::account` pools, and remaining-quota
weighting is skipped for them because every key reports the same number); this
adds the key half.

**Scoped by platform, not just group name.** The same label on two providers is
two different upstream accounts.

**A group of one is treated as ungrouped**, so a half-finished grouping does not
take a different code path for no behavioural reason.

**Not used for selection.** Grouped keys still rotate independently: one dead
key must not take its whole group out of rotation. This changes accounting only.

**Rejected.** (a) Auto-detecting shared accounts from key prefixes or provider
responses — provider APIs do not expose account identity reliably, and inferring
it would be inventing a fact (Section 14). (b) Making the router prefer one key
per group — that trades a metering bug for a reliability regression. (c) Leaving
it alone and documenting the footgun — the failure is silent and looks like the
provider being flaky.

**Follow-up, deliberately not bundled.** No dashboard control ships here; a
group is set through `PATCH /api/keys/:id`. Adding the field to the key dialog
is a small, separable change.
