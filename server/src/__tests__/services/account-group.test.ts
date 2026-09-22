import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, getDb } from '../../db/index.js';
import {
  accountKeyIds,
  acquireLease,
  releaseLease,
  canUseKeyConcurrency,
  canUseProvider,
  canUseProviderMinute,
  inFlightForKey,
  invalidateAccountGroups,
  providerDailyRequestCount,
  providerMinuteRequestCount,
} from '../../services/ratelimit.js';

/**
 * Same-account key grouping.
 *
 * Account-level gates meter what the PROVIDER meters, which is an account, not
 * a credential. Counting per key is right until an operator adds a second key
 * minted from the same account: each would then get a full local budget while
 * the provider still meters one, so the router dispatches up to twice the cap
 * and earns real 429s — the second key makes throughput worse, not better.
 */
function addKey(platform: string, label: string, accountGroup: string | null): number {
  const row = getDb().prepare(`
    INSERT INTO api_keys (platform, label, encrypted_key, iv, auth_tag, account_group)
    VALUES (?, ?, 'enc', 'iv', 'tag', ?) RETURNING id
  `).get(platform, label, accountGroup) as { id: number };
  invalidateAccountGroups();
  return row.id;
}

function seedRequests(platform: string, modelId: string, keyId: number, count: number, atMs: number) {
  const ins = getDb().prepare(`
    INSERT INTO rate_limit_usage (platform, model_id, key_id, kind, tokens, created_at_ms)
    VALUES (?, ?, ?, 'request', 0, ?)
  `);
  for (let i = 0; i < count; i++) ins.run(platform, modelId, keyId, atMs);
}

describe('same-account key grouping', () => {
  // Leases live in a module-level map that initDb() does not clear, and each
  // fresh in-memory DB restarts key ids at 1 — so a lease left behind by one
  // test would be counted against a different key with the same id in the next.
  const heldLeases: string[] = [];
  function lease(platform: string, modelId: string, keyId: number) {
    heldLeases.push(acquireLease(platform, modelId, keyId, 100));
  }

  beforeEach(() => {
    initDb(':memory:');
    invalidateAccountGroups();
  });

  afterEach(() => {
    for (const id of heldLeases.splice(0)) releaseLease(id);
    delete process.env.PROVIDER_DAILY_REQUEST_CAP_GROQ;
    delete process.env.PROVIDER_MINUTE_REQUEST_CAP_GROQ;
    delete process.env.MAX_CONCURRENT_REQUESTS_PER_KEY_GROQ;
    invalidateAccountGroups();
  });

  it('resolves an ungrouped key to itself alone', () => {
    const a = addKey('groq', 'Solo', null);

    expect(accountKeyIds(a)).toEqual([a]);
  });

  it('resolves grouped keys to every sibling', () => {
    const a = addKey('groq', 'A', 'team-account');
    const b = addKey('groq', 'B', 'team-account');

    expect(accountKeyIds(a).sort()).toEqual([a, b].sort());
    expect(accountKeyIds(b).sort()).toEqual([a, b].sort());
  });

  it('does not merge the same group name across different platforms', () => {
    const groq = addKey('groq', 'A', 'shared-name');
    const cerebras = addKey('cerebras', 'B', 'shared-name');

    // Same label on two providers is two different upstream accounts; merging
    // their budgets would under-serve both.
    expect(accountKeyIds(groq)).toEqual([groq]);
    expect(accountKeyIds(cerebras)).toEqual([cerebras]);
  });

  it('treats a group of one as ungrouped', () => {
    const only = addKey('groq', 'Only', 'lonely-group');

    expect(accountKeyIds(only)).toEqual([only]);
  });

  it('ignores a blank group name', () => {
    const blank = addKey('groq', 'Blank', '   ');
    const other = addKey('groq', 'Other', '   ');

    expect(accountKeyIds(blank)).toEqual([blank]);
    expect(accountKeyIds(other)).toEqual([other]);
  });

  it('counts daily requests across the account, not per key', () => {
    const now = Date.now();
    const a = addKey('groq', 'A', 'one-account');
    const b = addKey('groq', 'B', 'one-account');
    seedRequests('groq', 'm1', a, 30, now);
    seedRequests('groq', 'm1', b, 20, now);

    // Either key reports the account's whole spend.
    expect(providerDailyRequestCount('groq', a, now)).toBe(50);
    expect(providerDailyRequestCount('groq', b, now)).toBe(50);
  });

  it('leaves ungrouped keys counting independently — the pre-existing behaviour', () => {
    const now = Date.now();
    const a = addKey('groq', 'A', null);
    const b = addKey('groq', 'B', null);
    seedRequests('groq', 'm1', a, 30, now);
    seedRequests('groq', 'm1', b, 20, now);

    expect(providerDailyRequestCount('groq', a, now)).toBe(30);
    expect(providerDailyRequestCount('groq', b, now)).toBe(20);
  });

  it('refuses a sibling once the account has spent the daily cap', () => {
    process.env.PROVIDER_DAILY_REQUEST_CAP_GROQ = '40';
    const now = Date.now();
    const a = addKey('groq', 'A', 'one-account');
    const b = addKey('groq', 'B', 'one-account');
    seedRequests('groq', 'm1', a, 40, now);

    // The provider has already served 40 for this account. Without grouping,
    // key B would look untouched and the router would spend another 40.
    expect(canUseProvider('groq', a, now)).toBe(false);
    expect(canUseProvider('groq', b, now)).toBe(false);
  });

  it('still allows a sibling below the cap', () => {
    process.env.PROVIDER_DAILY_REQUEST_CAP_GROQ = '40';
    const now = Date.now();
    const a = addKey('groq', 'A', 'one-account');
    const b = addKey('groq', 'B', 'one-account');
    seedRequests('groq', 'm1', a, 39, now);

    expect(canUseProvider('groq', b, now)).toBe(true);
  });

  it('shares the per-minute budget across the account', () => {
    process.env.PROVIDER_MINUTE_REQUEST_CAP_GROQ = '10';
    const now = Date.now();
    const a = addKey('groq', 'A', 'one-account');
    const b = addKey('groq', 'B', 'one-account');
    seedRequests('groq', 'm1', a, 6, now);
    seedRequests('groq', 'm1', b, 4, now);

    expect(providerMinuteRequestCount('groq', a, now)).toBe(10);
    expect(canUseProviderMinute('groq', b, now)).toBe(false);
  });

  it('shares in-flight concurrency across the account', () => {
    const a = addKey('groq', 'A', 'one-account');
    const b = addKey('groq', 'B', 'one-account');
    lease('groq', 'm1', a);
    lease('groq', 'm1', b);

    // Two keys on one account firing in parallel are two parallel requests to
    // that account, so both report the pair.
    expect(inFlightForKey('groq', a)).toBe(2);
    expect(inFlightForKey('groq', b)).toBe(2);
  });

  it('keeps concurrency separate for ungrouped keys', () => {
    const a = addKey('groq', 'A', null);
    const b = addKey('groq', 'B', null);
    lease('groq', 'm1', a);
    lease('groq', 'm1', b);

    expect(inFlightForKey('groq', a)).toBe(1);
    expect(inFlightForKey('groq', b)).toBe(1);
  });

  it('applies the concurrency gate against the account total', () => {
    process.env.MAX_CONCURRENT_REQUESTS_PER_KEY_GROQ = '2';
    const a = addKey('groq', 'A', 'one-account');
    const b = addKey('groq', 'B', 'one-account');
    lease('groq', 'm1', a);
    lease('groq', 'm1', a);

    expect(canUseKeyConcurrency('groq', b)).toBe(false);
  });

  it('picks up a grouping change once the cache is invalidated', () => {
    const now = Date.now();
    const a = addKey('groq', 'A', null);
    const b = addKey('groq', 'B', null);
    seedRequests('groq', 'm1', a, 5, now);
    seedRequests('groq', 'm1', b, 7, now);
    expect(providerDailyRequestCount('groq', a, now)).toBe(5);

    getDb().prepare("UPDATE api_keys SET account_group = 'joined' WHERE id IN (?, ?)").run(a, b);
    invalidateAccountGroups();

    expect(providerDailyRequestCount('groq', a, now)).toBe(12);
  });
});
