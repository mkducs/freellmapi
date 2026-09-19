import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { up, down } from '../../../db/migrations/20260919_000001_provider_registry.js';

// Only the columns the migration touches. `models` stands in for the real
// table so the test pins this migration's behaviour, not the baseline's.
function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      model_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      supports_vision INTEGER NOT NULL DEFAULT 0,
      supports_tools INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.prepare('INSERT INTO models (platform, model_id, display_name) VALUES (?, ?, ?)')
    .run('groq', 'openai/gpt-oss-120b', 'GPT-OSS 120B');
  return db;
}

function columns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
}

function tableExists(db: Database.Database, name: string): boolean {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}

const dbs: Database.Database[] = [];
function freshDb(): Database.Database {
  const db = makeDb();
  dbs.push(db);
  return db;
}
afterEach(() => {
  for (const db of dbs.splice(0)) db.close();
});

describe('provider_registry migration', () => {
  it('creates the table with the ADR-0001 columns', () => {
    const db = freshDb();
    up(db as never);

    expect(tableExists(db, 'provider_registry')).toBe(true);
    expect(columns(db, 'provider_registry')).toEqual(
      expect.arrayContaining([
        'platform', 'free_type', 'free_credits', 'free_credits_currency',
        'free_credits_period', 'free_expires_after_days', 'card_required',
        'signup_verification', 'keyless', 'commercial_allowed',
        'commercial_restriction', 'production_allowed', 'account_rpm_cap',
        'account_rpd_cap', 'account_tpd_cap', 'last_verified_at',
        'verified_method', 'quota_source_url', 'notes', 'updated_at',
      ]),
    );
  });

  it('adds the three model-level columns', () => {
    const db = freshDb();
    up(db as never);

    expect(columns(db, 'models')).toEqual(
      expect.arrayContaining(['commercial_allowed', 'model_license', 'supports_structured']),
    );
  });

  it('leaves an existing model row intact, with inherit-shaped defaults', () => {
    const db = freshDb();
    up(db as never);

    const row = db.prepare('SELECT * FROM models WHERE model_id = ?')
      .get('openai/gpt-oss-120b') as Record<string, unknown>;

    expect(row.display_name).toBe('GPT-OSS 120B');
    // NULL means "inherit the provider" — the common case must cost nothing.
    expect(row.commercial_allowed).toBeNull();
    expect(row.model_license).toBeNull();
    expect(row.supports_structured).toBe(0);
  });

  it('defaults a row to unknown rather than permissive', () => {
    const db = freshDb();
    up(db as never);
    db.prepare("INSERT INTO provider_registry (platform) VALUES ('groq')").run();

    const row = db.prepare('SELECT * FROM provider_registry WHERE platform = ?')
      .get('groq') as Record<string, unknown>;

    // An absent licence claim is not permission — a 'yes' default would assert
    // terms on the provider's behalf.
    expect(row.commercial_allowed).toBe('unknown');
    expect(row.production_allowed).toBe('unknown');
    expect(row.free_type).toBe('unverified');
    expect(row.card_required).toBe(0);
    // Nothing has verified this row, and the schema must say so.
    expect(row.last_verified_at).toBeNull();
  });

  it('is re-runnable — the roundtrip and catalog-sync suites re-run up()', () => {
    const db = freshDb();
    up(db as never);
    db.prepare("INSERT INTO provider_registry (platform, free_type) VALUES ('groq', 'permanent')").run();

    expect(() => up(db as never)).not.toThrow();

    // A second up() must not clobber what the first one established.
    const row = db.prepare('SELECT free_type FROM provider_registry WHERE platform = ?')
      .get('groq') as { free_type: string };
    expect(row.free_type).toBe('permanent');
  });

  it('down() drops the table and the added columns', () => {
    const db = freshDb();
    up(db as never);
    down(db as never);

    expect(tableExists(db, 'provider_registry')).toBe(false);
    const modelCols = columns(db, 'models');
    for (const col of ['commercial_allowed', 'model_license', 'supports_structured']) {
      expect(modelCols).not.toContain(col);
    }
    // The row itself survives a down migration.
    expect(db.prepare('SELECT COUNT(*) AS n FROM models').get()).toEqual({ n: 1 });
  });

  it('down() is safe to run when up() never ran', () => {
    const db = freshDb();
    expect(() => down(db as never)).not.toThrow();
  });
});
