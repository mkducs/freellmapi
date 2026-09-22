# Verification — same-account key grouping

Task: FEATURE (correctness) — backlog spec 0001
Date: 2026-09-22
Branch: `claude/free-llm-apis-list-3reinw`
Plan: `.ai/plans/active/same-account-key-grouping.md`

## Acceptance criteria

| # | Criterion | Result |
| --- | --- | --- |
| AC-001 | Migration adds the column, re-runnable, existing rows ungrouped | **PASS** |
| AC-002 | Grouped keys share one daily-request budget; sibling refused at cap | **PASS** |
| AC-003 | Ungrouped keys behave exactly as before (regression) | **PASS** |
| AC-004 | Same for per-minute, daily-token and concurrency gates | **PASS** |
| AC-005 | Group settable through the API and returned in the key list | **PASS** |
| AC-006 | Full workspace suite green | **PASS** |

## Commands actually run

```
$ npx vitest run src/__tests__/services/account-group.test.ts
 Test Files  1 passed (1)
      Tests  14 passed (14)

$ npx tsc --noEmit        # server
 exit 0, no diagnostics

$ npx vitest run          # server
 Test Files  277 passed (277)
      Tests  3228 passed | 5 skipped (3233)

$ npm test                # full workspace
  scripts/dev-bootstrap:       pass 9
  scripts/generate-providers:  pass 11
  server:  277 files, 3228 passed, 5 skipped
  cli:       5 files,  107 passed
  client:   29 files,  296 passed
  i18n validation passed for 60 locales and 1156 keys

$ npm run lint
 exit 0, no findings
```

Server suite went from 3214 to 3228 passing (+14, the new file); no existing
test changed behaviour.

## What the gates now count

All four account-level gates resolve a key to its account before counting:

| Gate | Counter | Grouped behaviour |
| --- | --- | --- |
| Daily requests | `providerDailyRequestCount` | `key_id IN (siblings)` |
| Per-minute requests | `providerMinuteRequestCount` | `key_id IN (siblings)` |
| Daily tokens | `providerDailyTokenCount` | `rlu.key_id IN (siblings)` |
| Concurrency | `inFlightForKey` | leases whose key is in the group |

Each has a DB-unavailable fallback over the in-memory windows; those loop the
sibling set too, so a DB outage does not silently revert to per-key metering.

`accountKeyIds(id)` returns `[id]` for an ungrouped key, which is why the
ungrouped path is byte-for-byte what it was.

## Two design choices worth review

**Groups are scoped by platform, not just by name.** The same group label on two
providers is two different upstream accounts; merging their budgets would
under-serve both. Covered by a test.

**A group of one is treated as ungrouped.** Otherwise a half-finished grouping
(operator names one key, hasn't named its sibling yet) would take a different
code path for no behavioural reason.

## Two test bugs found and fixed while writing them

Both were mine, not the implementation's:

1. The concurrency gate test set `KEY_CONCURRENCY_LIMIT_GROQ`; the real env var
   is `MAX_CONCURRENT_REQUESTS_PER_KEY_<PLATFORM>`. The test passed vacuously
   until corrected — the gate returns true when no limit is configured.
2. Leases live in a module-level map that `initDb()` does not clear, and each
   fresh in-memory DB restarts key ids at 1, so a lease left by one test was
   counted against a different key with the same id in the next. Leases are now
   released in `afterEach`.

The second is worth knowing generally: any future test that acquires a lease
and relies on a fresh `:memory:` DB has the same trap waiting.

## Risks

- The resolver caches for 30s. `invalidateAccountGroups()` is called on the key
  PATCH path, so an operator edit takes effect immediately; a direct DB edit
  would take up to the TTL. Acceptable, and the same shape as the existing
  quota-headroom cache.
- Grouping is manual by design. An operator who forgets to group two same-account
  keys gets exactly today's (wrong) behaviour — this change makes the correct
  behaviour *possible*, it cannot detect the situation.

## Unknowns

- No dashboard control ships in this change: a group is set through
  `PATCH /api/keys/:id`. Adding the field to the key dialog is a small follow-up
  and is listed as such rather than silently bundled here.
