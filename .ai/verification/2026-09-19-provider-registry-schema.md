# Verification — provider registry schema (ADR-0001)

Task: FEATURE — implement ADR-0001
Date: 2026-09-19
Branch: `claude/free-llm-apis-list-3reinw`
Plan: `.ai/plans/active/provider-registry-schema.md`

## Acceptance criteria

| # | Criterion | Result |
| --- | --- | --- |
| AC-001 | `up()` creates `provider_registry` and is re-runnable | **PASS** |
| AC-002 | `up()` adds the three `models` columns, each guarded | **PASS** |
| AC-003 | `down()` drops the table and the columns, best-effort | **PASS** |
| AC-004 | `providers` ingests for registered platforms; unregistered counted as skipped | **PASS** |
| AC-005 | A catalog with no `providers` key leaves rows untouched | **PASS** |
| AC-006 | A malformed `providers` entry fails `isCatalog` | **PASS** |
| AC-007 | Full suite passes with no new failures | **PASS** |
| AC-008 | `tsc --noEmit` passes | **PASS** |

## Commands actually run

### Environment blocker resolved first

`npm ci` stalled. `package-lock.json` resolves 40 packages from
`registry.npmmirror.com`, which this environment's egress proxy denies
(`connect_rejected`), so the install retried indefinitely and never linked
`node_modules/.bin`.

```
$ grep -o '"resolved": "https://[^/]*' package-lock.json | sort | uniq -c | sort -rn
    912 "resolved": "https://registry.npmjs.org
     40 "resolved": "https://registry.npmmirror.com
```

Resolved without touching the lockfile:

```
$ npm ci --replace-registry-host=always --registry=https://registry.npmjs.org
   (exit 0)
$ git diff --stat package-lock.json package.json
   (empty — lockfile unmodified)
```

Recorded as a repository finding, not a fix: see Risks below.

### Targeted

```
$ npx vitest run src/__tests__/db/migrate/provider-registry.test.ts \
                src/__tests__/db/migrate/registry-drift.test.ts
 ✓ provider-registry.test.ts (7 tests)
 ✓ registry-drift.test.ts (2 tests)
 Test Files  2 passed (2)
      Tests  9 passed (9)

$ npx vitest run src/__tests__/db/migrate/roundtrip.test.ts \
                src/__tests__/services/catalog-sync.test.ts
 Test Files  2 passed (2)
      Tests  40 passed (40)

$ npx vitest run src/__tests__/db/migrate/
 Test Files  10 passed (10)
      Tests  41 passed (41)
```

### Full suite, typecheck, lint

```
$ npx vitest run            # server
 Test Files  276 passed (276)
      Tests  3214 passed | 5 skipped (3219)

$ npx tsc --noEmit          # server
 exit 0, no diagnostics

$ npm run lint              # server + cli, eslint
 exit 0, no findings

$ npm test                  # full workspace
 ... client: Test Files 29 passed (29), Tests 296 passed (296)
 i18n validation passed for 60 locales and 1156 keys
```

## A real defect found and fixed mid-implementation

The first full run failed one test:
`endpoint-identity.test.ts > is idempotent across a down/up round trip`.

It was not a flake and not the test's fault. The 2026-07-29 endpoint-identity
migration rebuilds `models` (SQLite cannot drop a table-level UNIQUE) from a
**hard-coded column list** frozen at its own date. Re-running it — which its own
test does — therefore drops every column a later migration added, along with the
data in those columns. Nothing had triggered it because no migration had added a
`models` column since July; this change is the first, and the test caught it
immediately.

Fixed in `rebuildModels()`: columns present on the live table but unknown to
this migration are now carried through the rebuild, with their type, NOT NULL
and DEFAULT read off the live schema rather than guessed. Two details mattered:

- `endpoint_scope` is excluded explicitly. The migration owns that column —
  `down()` exists to remove it — so it must never be treated as "later added"
  and preserved.
- Carried columns are rendered the way SQLite renders `ALTER TABLE ADD COLUMN`
  into the stored CREATE text (bare identifier, space-separated, same line), so
  a rebuilt table's schema is byte-identical to the one ALTER produced. That
  keeps the roundtrip test's exact-text comparison meaningful instead of
  loosening it to make this change pass.

Logged as DL-0008.

## Risks

- **Lockfile registry drift.** 40 of 952 resolved URLs point at
  `registry.npmmirror.com` rather than `registry.npmjs.org`. Any environment
  that cannot reach that mirror cannot run `npm ci` without the override above.
  It is also a supply-chain and reproducibility concern worth a maintainer
  decision. Not fixed here — regenerating the lockfile is well outside this
  task's scope and would dwarf its diff.
- The endpoint-identity fix changes a historical migration's behaviour. It is
  strictly more conservative (it preserves data the old code destroyed) and the
  full suite is green, but it is a change to code that has already run on user
  databases, so it deserves reviewer attention.

## Unknowns

- U-003 (where the hosted catalog is authored) still governs where real
  `providers` rows would be written. It does not affect the correctness of the
  ingestion path, which is tested locally against both a present and an absent
  `providers` key.
- No row in `provider_registry` has been populated with real provider data, by
  design. Every future backfilled row must land with `last_verified_at = NULL`
  until something actually verifies it.
