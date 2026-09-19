# Plan — provider registry schema (ADR-0001)

Task type: FEATURE
ADR: `.ai/decisions/ADR-0001-provider-registry-schema.md` (Accepted 2026-09-19)
Branch: `claude/free-llm-apis-list-3reinw`
Autonomy: L2 — merge stays with a human (Section 12)

## Scope

Land the schema and its transport, inert.

1. Migration creating `provider_registry` and adding three columns to `models`.
2. Registration in the migration runner's default list.
3. Shared types for the new row and its enums.
4. Catalog transport: a `providers` array on the signed catalog, validated and
   ingested, gated on `hasProvider()` like every other array.
5. Tests for the migration and the ingestion path.

## Non-goals

Explicitly out, to keep this the smallest coherent change (rule 8):

- The `commercial_use` routing filter. The ADR describes it as the payoff, but
  it changes routing behaviour and deserves its own plan, tests and review.
- Dashboard surfacing of `last_verified_at` staleness.
- Any backfill of real provider data. Backfill is a separate, evidence-bearing
  task; seeding rows from prose in the same change that creates the table would
  make the table look verified when it is not (Section 14).
- Moving the hard-coded account caps out of `ratelimit.ts`. The columns exist
  to receive them; migrating the readers is a follow-up refactor.

## Acceptance criteria

- [ ] AC-001 `up()` creates `provider_registry` with the ADR's columns and is
      re-runnable without error (the roundtrip tests re-run `up()`).
- [ ] AC-002 `up()` adds `commercial_allowed`, `model_license` and
      `supports_structured` to `models`, each guarded by a column check.
- [ ] AC-003 `down()` drops the table and the three columns, best-effort, and
      does not throw on a build that pins the table.
- [ ] AC-004 A catalog carrying `providers` writes rows for registered
      platforms and counts unregistered ones as `skippedUnknownPlatform`.
- [ ] AC-005 A catalog with no `providers` key leaves existing rows untouched
      (backward compatibility — older catalogs must not wipe the table).
- [ ] AC-006 A malformed `providers` entry fails `isCatalog` rather than being
      partially ingested.
- [ ] AC-007 `npx vitest run` passes in `server/`, with no new failures against
      the pre-change baseline.
- [ ] AC-008 `tsc --noEmit` passes for `server/` and `shared/`.

## Dependencies

- `npm ci` must complete — Gate E needs real test output, and the previous
  session recorded UNKNOWN precisely because dependencies were absent.
- No new runtime dependency. SQLite, the existing migration runner, and the
  existing catalog validator cover everything here.

## Implementation sequence

1. Baseline: run the suite before touching anything, so AC-007 compares against
   a known state rather than an assumption.
2. Migration file + `defaults.ts` registration.
3. `shared/types.ts` — `ProviderFreeType`, `CommercialStance`,
   `ProviderRegistryRow`.
4. `catalog-sync.ts` — `CatalogProvider`, `isCatalog` validation, ingestion
   inside the existing transaction.
5. Tests.
6. Full suite + typecheck + lint.

## Tests

- `server/src/__tests__/db/provider-registry.test.ts` — table shape after `up()`,
  idempotent re-run, `down()` reversal, the three `models` columns, and that an
  existing `models` row survives the migration with NULL/0 defaults.
- Extend `server/src/__tests__/services/catalog-sync.test.ts` — a catalog with
  `providers` ingests; an unregistered platform is skipped and counted; a
  catalog without the key leaves rows alone; a malformed entry is rejected.

## Observability

No new logging. Ingestion reuses the existing `counts` object, so a sync that
writes provider rows reports them through the same `SyncResult.counts` surface
already shown in the dashboard. No key material passes through any of this
(Section 14).

## Security

- The table holds no credentials and no user data — provider tier facts only.
- `commercial_allowed` / `production_allowed` default to `'unknown'`, never to
  `'yes'`. A permissive default would be a licence claim the project cannot
  support, and the strict variant of the future filter treats unknown as
  excluded.
- `last_verified_at` defaults to NULL. Nothing in this change may write a
  verification timestamp, because nothing in this change verifies anything.

## Rollback

`down()` drops the table and the three columns. The schema is inert — no reader
depends on it — so reverting the migration cannot strand a code path. Failing
that, reverting the commit is sufficient; no data migration is involved.
