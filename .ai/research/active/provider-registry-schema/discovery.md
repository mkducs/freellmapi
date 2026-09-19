# Discovery — provider registry schema

Task: implement ADR-0001 (FEATURE)
Date: 2026-09-19

## Entry points and control flow

The write path from the published catalog into the live DB is
`services/catalog-sync.ts → applyCatalog() → applyCatalogInner()`, which runs
inside a single `db.transaction`. Every registry the catalog carries follows the
same four-step shape:

1. a `Catalog*` interface describing the wire row;
2. an optional top-level key on the `Catalog` envelope;
3. a structural check inside `isCatalog()`, which gates **both** the network
   path and the cached re-apply path (`reapplyCachedCatalog`);
4. an ingestion block inside the transaction, gated on an allowlist —
   `hasProvider()` for chat models, `MEDIA_PLATFORMS` / `TRANSCRIPTION_PLATFORMS`
   / `VIDEO_PLATFORMS` / `EMBEDDING_PLATFORMS` for the rest.

The existing comments state the reason for the shape plainly: a new top-level
key is ignored by binaries that predate it, whereas extra fields smuggled into
`models` would be *misread* by them. The provider registry inherits that
reasoning unchanged.

## Migration conventions

- Files live in `server/src/db/migrations/<YYYYMMDD>_<NNNNNN>_<name>.ts` and
  export `up(db)` / `down(db)`.
- The runner walks the **static** `DEFAULT_MIGRATIONS` list in
  `db/migrate/defaults.ts`, not the directory. A file nobody registers is
  silently skipped — `__tests__/db/migrate/registry-drift.test.ts` exists
  specifically to turn that quiet no-op into a failing test, and it also
  asserts the list stays in filename order.
- Registration needs three edits: the import, an exported `*_FILENAME`
  constant, and the list entry.
- `up()` must be re-runnable: the roundtrip and catalog-sync suites re-run it.
  The established idiom is a `hasColumn()` PRAGMA guard per `ALTER`, and
  `CREATE TABLE IF NOT EXISTS`.
- `down()` is best-effort: `ALTER TABLE … DROP COLUMN` is wrapped in try/catch
  because some builds pin the table (see the key-monthly-budget migration).

## Existing shape of the data

`models` already carries the per-model half of what a provider registry would
hold: `rpm_limit`, `rpd_limit`, `tpm_limit`, `tpd_limit`, `context_window`,
`supports_vision`, `supports_tools`, plus `source` and `key_id`. It is keyed
`UNIQUE(platform, model_id)`.

`monthly_token_budget` is a display **string** on `models`, not a number — it
cannot express a credit amount, a currency or a renewal period, which is why
ElectronHub's weekly $0.25 and Router9's monthly 50k credits have no
representation today.

Account-wide caps are hard-coded constants in `services/ratelimit.ts`
(`openrouter` 1000 rpd, `modelscope` 1800 rpd, `navy` 150k tpd, `nvidia` 40
rpm), read through `getProviderDailyRequestCap()` and siblings. The new columns
are shaped to receive them, but migrating those readers is deliberately out of
scope for this change.

Provider identity — base URL, adapter class, auth shape — lives in code
(`providers/index.ts`), not the DB. Nothing in this task changes that.

## Constraints found

- `hasProvider()` and the `Platform` type are already imported in
  `catalog-sync.ts`; no new imports needed for the gating.
- Prepared statements in `applyCatalogInner` are created eagerly at function
  scope, before the transaction. better-sqlite3 validates SQL against the
  schema at `prepare()` time, so the new statement requires the table to exist
  — true for any DB that has run migrations, and consistent with how the
  existing `media_models` / `embedding_models` statements already behave.
- `counts` is a single `{updated, inserted, removed, skippedUnknownPlatform,
  quirks}` object surfaced through `SyncResult`. An upsert cannot distinguish
  insert from update by itself, so attributing the counts honestly needs a
  SELECT first — which is what every other block already does.

## Unknowns

None blocking. U-003 (whether the hosted catalog is authored in this repo)
still governs *where* real `providers` rows would be written, but not whether
the ingestion path is correct — that is testable locally either way.

## Verification available

`npx vitest run` in `server/`, plus `tsc --noEmit`. Dependencies were absent at
task start; `npm ci` was started first precisely so Gate E has real output
rather than the UNKNOWN recorded for the previous task.
