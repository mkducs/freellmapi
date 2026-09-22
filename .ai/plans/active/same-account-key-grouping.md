# Plan — same-account key grouping

Task type: FEATURE (correctness)
Spec: backlog candidate 0001
Branch: `claude/free-llm-apis-list-3reinw`
Autonomy: L2 — merge stays with a human (Section 12)

## Problem

Every account-level gate counts per `(platform, key_id)`:

| Gate | Function |
| --- | --- |
| Daily requests | `canUseProvider` → `providerDailyRequestCount` |
| Per-minute requests | `canUseProviderMinute` → `providerMinuteRequestCount` |
| Daily tokens | `canUseProviderTokens` → `providerDailyTokenCount` |
| In-flight concurrency | `canUseKeyConcurrency` → `inFlightForKey` |

That is correct only while one key means one upstream account. Add two keys
minted from the *same* account and the router grants each a full budget while
the provider still meters one, so it dispatches up to 2× the cap and collects
real 429s — worse throughput than a single key, which is the opposite of what
adding a key is for.

The codebase already models the provider side of this distinction:
`inferQuotaPoolKey` returns a pool ending `::account` for providers that meter
per account, and remaining-quota weighting is skipped for those pools because
every key reports the same number. There is no equivalent on the key side.

## Scope

1. Migration adding `account_group TEXT` to `api_keys` (NULL = ungrouped).
2. Sibling resolution in `ratelimit.ts`: a key's account-level usage counts
   across every key sharing its group, itself alone when ungrouped.
3. All four gates above use it, including their DB-unavailable fallbacks.
4. `ApiKey.accountGroup` in shared types; settable via `PATCH /api/keys/:id`
   and returned in the key list.
5. Tests.

## Non-goals

- Auto-detecting that two keys belong to one account. Provider APIs do not
  reliably expose account identity; this is the manual mechanism only.
- Per-model rpm/rpd/tpm/tpd accounting, which is already correctly per key and
  per model — grouping those would be wrong.
- Changing which key gets *selected*. Grouped keys must still rotate for
  reliability; this changes accounting, not candidate order.

## Acceptance criteria

- [ ] AC-001 Migration adds the column, is re-runnable, and leaves existing rows ungrouped.
- [ ] AC-002 Two grouped keys share one daily-request budget; the second is refused once the group's cap is spent.
- [ ] AC-003 Two ungrouped keys on the same platform behave exactly as today (regression).
- [ ] AC-004 The same holds for the per-minute, daily-token and concurrency gates.
- [ ] AC-005 A group is settable through the API and survives a round trip.
- [ ] AC-006 Full workspace suite green.

## Implementation sequence

1. Migration + registration (+ roundtrip test list).
2. `accountKeyIds()` resolver with a short TTL cache and explicit invalidation
   on key writes — keys change rarely, but a stale group after an edit would
   silently mis-meter.
3. Thread it through the four gates and their fallbacks.
4. Types + route plumbing.
5. Tests.

## Tests

- Migration: column added, idempotent, `down()` reverses, existing rows NULL.
- Gates: grouped vs ungrouped for each of the four, driven through the public
  `canUse*` functions rather than the private counters.
- Cache: a group set after a gate has been consulted takes effect once
  invalidated.
- Route: PATCH sets and clears a group; the list returns it.

## Security

No credential material touches any of this — grouping is an operator-assigned
label, and the code paths carry `key_id` integers, never key bytes. The column
holds a free-text group name, so it must never be echoed into an error that
reaches an upstream provider (Section 14).

## Rollback

`down()` drops the column. The resolver treats a missing/NULL group as
ungrouped, so reverting the migration restores exactly today's per-key
behaviour with no data migration.
