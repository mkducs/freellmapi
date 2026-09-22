import type { Db } from '../types.js';

/** Guard so the migration can be re-run safely (roundtrip/catalog-sync tests re-run up()). */
function hasColumn(db: Db, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some(col => col.name === column);
}

/**
 * Same-account key grouping.
 *
 * Every account-level gate in services/ratelimit.ts — daily requests,
 * per-minute requests, daily tokens, in-flight concurrency — counts per
 * (platform, key_id). That is right only while one key means one upstream
 * account. Two keys minted from the SAME account each get a full budget
 * locally while the provider still meters one, so the router dispatches up to
 * twice the cap and earns real 429s: adding the second key makes throughput
 * worse, not better.
 *
 * `account_group` is the operator's statement that some keys share an upstream
 * account. NULL (the default, and every existing row) means ungrouped, which
 * keeps the previous per-key behaviour exactly.
 *
 * Deliberately manual: provider APIs do not reliably expose account identity,
 * and guessing it from key prefixes would be inventing a fact (Section 14).
 * It is also deliberately NOT used for candidate selection — grouped keys must
 * still rotate so one dead key cannot take the whole group down. This changes
 * accounting only.
 */
export function up(db: Db): void {
  if (!hasColumn(db, 'api_keys', 'account_group')) {
    db.prepare('ALTER TABLE api_keys ADD COLUMN account_group TEXT').run();
  }
}

export function down(db: Db): void {
  if (hasColumn(db, 'api_keys', 'account_group')) {
    try {
      db.prepare('ALTER TABLE api_keys DROP COLUMN account_group').run();
    } catch {
      // best-effort: some builds pin the table; leaving the column harms nobody
      // because the resolver treats an absent group as ungrouped.
    }
  }
}
