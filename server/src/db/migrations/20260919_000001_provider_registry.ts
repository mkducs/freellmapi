import type { Db } from '../types.js';

/** Guard so the migration can be re-run safely (roundtrip/catalog-sync tests re-run up()). */
function hasColumn(db: Db, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some(col => col.name === column);
}

/**
 * Free-tier provider registry (ADR-0001).
 *
 * `models` already carries the per-model half of a provider registry —
 * rpm/rpd/tpm/tpd, context window, vision and tool support. What has had no
 * representation anywhere is the NATURE of a provider's free tier: whether it
 * is permanent or a grant that lapses, whether a card is required, whether the
 * terms permit commercial or production use, and when any of that was last
 * checked against a real source.
 *
 * Three incidents needed exactly these fields. SambaNova was registered as
 * free, then dropped in V23 when its tier became a lapsing trial credit — the
 * schema could not say "this will expire", so deletion was the only remedy.
 * Cohere documents that trial keys are not for production use, yet a Cohere
 * trial key routes today as an ordinary candidate. ElectronHub, Experiential
 * and Router9 all grant shared credits on different periods, which
 * `monthly_token_budget` (a display string on `models`) cannot express.
 *
 * Provider-scoped rather than per-model on purpose: the published catalog spans
 * hundreds of provider endpoints, and duplicating one licence fact across all
 * of a platform's rows invites rows that disagree with each other. Where the
 * answer genuinely varies per model — an OpenRouter `:free` route inherits its
 * upstream model's licence — `models.commercial_allowed` overrides, and NULL
 * means "inherit the provider".
 *
 * Nothing reads these columns yet. The schema lands inert; the routing filter
 * that consumes it is a separate change with its own plan and tests.
 */
export function up(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_registry (
      platform                TEXT PRIMARY KEY,

      -- What kind of free, not merely whether. See ProviderFreeType in
      -- shared/types.ts for the enum and what each value means.
      free_type               TEXT NOT NULL DEFAULT 'unverified',
      free_credits            REAL,
      free_credits_currency   TEXT,
      free_credits_period     TEXT,
      -- One-time grants that lapse (Septor's signup credit expires at 90 days
      -- and is documented as non-recurring). NULL = no expiry.
      free_expires_after_days INTEGER,

      -- Access conditions.
      card_required           INTEGER NOT NULL DEFAULT 0,
      signup_verification     TEXT,
      keyless                 INTEGER NOT NULL DEFAULT 0,

      -- Licensing. Defaults are deliberately 'unknown', never 'yes': a
      -- permissive default would assert a licence claim this project cannot
      -- support on the provider's behalf.
      commercial_allowed      TEXT NOT NULL DEFAULT 'unknown',
      commercial_restriction  TEXT,
      production_allowed      TEXT NOT NULL DEFAULT 'unknown',

      -- Account-wide caps that no per-model row can express. These mirror the
      -- constants in services/ratelimit.ts; this migration only creates the
      -- columns, it does not move the readers.
      account_rpm_cap         INTEGER,
      account_rpd_cap         INTEGER,
      account_tpd_cap         INTEGER,

      -- Provenance. Without it the table rots the way the prose provider docs
      -- did. NULL last_verified_at means never verified, which is the honest
      -- state for every row until something actually probes it.
      last_verified_at        TEXT,
      verified_method         TEXT,
      quota_source_url        TEXT,
      notes                   TEXT,

      updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // NULL = inherit provider_registry.commercial_allowed. Nullable so the common
  // case costs nothing and only genuine per-model divergence is stored.
  if (!hasColumn(db, 'models', 'commercial_allowed')) {
    db.prepare('ALTER TABLE models ADD COLUMN commercial_allowed TEXT').run();
  }
  // The weights' licence, which is frequently the real answer to "can I use
  // this commercially" on a gateway that resells open models.
  if (!hasColumn(db, 'models', 'model_license')) {
    db.prepare('ALTER TABLE models ADD COLUMN model_license TEXT').run();
  }
  // Closes an existing asymmetry: the router already accepts a requireStructured
  // filter, but capability came from services/quirks.ts rather than a column,
  // unlike supports_vision and supports_tools.
  if (!hasColumn(db, 'models', 'supports_structured')) {
    db.prepare('ALTER TABLE models ADD COLUMN supports_structured INTEGER NOT NULL DEFAULT 0').run();
  }
}

export function down(db: Db): void {
  db.exec('DROP TABLE IF EXISTS provider_registry');
  for (const column of ['commercial_allowed', 'model_license', 'supports_structured']) {
    if (hasColumn(db, 'models', column)) {
      try {
        db.prepare(`ALTER TABLE models DROP COLUMN ${column}`).run();
      } catch {
        // best-effort: some builds pin the table; leaving the column harms nobody
      }
    }
  }
}
