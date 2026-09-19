# ADR-0001 — Free-tier provider registry schema

Status: Accepted
Date: 2026-09-18 (accepted 2026-09-19 by the operator)
Deciders: autonomous (L2), accepted by the operator
Confidence: High on the shape, Medium on the enum boundaries
Implemented by: `.ai/plans/active/provider-registry-schema.md` — schema and
catalog transport only; the `commercial_use` routing filter remains unbuilt.

## Context

The router today knows a great deal about *models* and almost nothing about
*tiers*. `models` carries `rpm_limit`, `rpd_limit`, `tpm_limit`, `tpd_limit`,
`context_window`, `supports_vision`, `supports_tools`, `source` and per-model
enablement. Provider identity — base URL, adapter, auth shape — lives in code
(`server/src/providers/index.ts`), and quota observation lives in
`provider_quota_state`, keyed per `key_id`.

What has no representation anywhere is the **nature of the free tier**:

- whether "free" means a permanent allowance, a recurring credit, or a
  one-time grant that will lapse;
- whether a card is required to obtain or keep it;
- whether the free tier permits **commercial or production use**;
- when any of this was last verified, and against what source.

That last gap is not theoretical. Three independent cases have already hit it:

1. **SambaNova** was registered as free, then dropped in V23 when its
   always-free tier became a lapsing trial credit. Nothing in the schema could
   express "this will expire"; the only remedy was deleting the platform.
2. **Cohere's** documentation distinguishes trial keys from production keys and
   states that production/commercial applications require a production key.
   The router currently treats a Cohere trial key as an ordinary routing
   candidate, so a commercial deployment silently routes production traffic
   through a key whose terms forbid it.
3. **ElevenLabs** was assessed as a clean technical fit for the audio modality
   and blocked on exactly this: its free tier bars commercial use and mandates
   attribution, and the catalog has no field to carry that.

Meanwhile the free-tier landscape moves faster than the code. A September 2026
survey reports Cerebras moving to a card-backed trial, GitHub Models shutting
down, and Together withdrawing its previous trial credit. This repository still
registers `cerebras` and `github` as no-card free-key providers. Either the
survey or the registry is stale — and **the schema cannot currently express
which, because nothing records when a claim was last checked.**

## Decision

Add a **provider-level** registry table, plus a small number of nullable
model-level overrides. Do not fold tier facts into `models`.

### 1. `provider_registry` — one row per platform

```sql
CREATE TABLE IF NOT EXISTS provider_registry (
  platform              TEXT PRIMARY KEY,

  -- What kind of free, not just whether.
  free_type             TEXT NOT NULL,      -- see enum below
  free_credits          REAL,               -- NULL unless free_type is credit_*
  free_credits_currency TEXT,               -- 'usd' | 'credits' | 'neurons' | 'kudos'
  free_credits_period   TEXT,               -- 'daily'|'weekly'|'monthly'|'one_time'
  free_expires_after_days INTEGER,          -- one-time grants that lapse; NULL = no expiry

  -- Access conditions.
  card_required         INTEGER NOT NULL DEFAULT 0,
  signup_verification   TEXT,               -- NULL | 'discord' | 'telegram' | 'cn_realname' | 'phone'
  keyless               INTEGER NOT NULL DEFAULT 0,

  -- Licensing. The field that would have caught Cohere and ElevenLabs.
  commercial_allowed    TEXT NOT NULL DEFAULT 'unknown',  -- 'yes'|'no'|'model_dependent'|'unknown'
  commercial_restriction TEXT,              -- free text: 'attribution_required', 'model_license', …
  production_allowed    TEXT NOT NULL DEFAULT 'unknown',  -- same enum; Cohere is yes/no divergent

  -- Account-level quota that no per-model row can express.
  account_rpm_cap       INTEGER,            -- e.g. nvidia 40
  account_rpd_cap       INTEGER,            -- e.g. openrouter 1000, modelscope 1800
  account_tpd_cap       INTEGER,            -- e.g. navy 150000

  -- Provenance. Without this the table rots exactly like the prose docs did.
  last_verified_at      TEXT,               -- ISO8601; NULL = never verified
  verified_method       TEXT,               -- 'live_probe'|'official_docs'|'third_party'|'unverified'
  quota_source_url      TEXT,
  notes                 TEXT,

  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
```

`free_type` enum, chosen to map every currently registered platform:

| Value | Meaning | Examples here |
| --- | --- | --- |
| `permanent` | Recurring allowance, no expiry, no card | groq, google, cloudflare |
| `credit_recurring` | Credit that refills on a period | electronhub (weekly), router9, reka, huggingface |
| `credit_one_time` | Grant that burns down and does not refill | septor's $1 signup grant; the SambaNova failure mode |
| `promotional` | Time-boxed vendor promotion | bai, agnes, opencode |
| `keyless` | Works anonymously | kilo, ovh, aihorde |
| `card_backed` | Recurring, but only while a card is attached | sail |
| `retired` | Was free, no longer is | sambanova |
| `unverified` | Advertised but not demonstrated | anyapi |

`anyapi` and `sambanova` are the load-bearing cases: both are *representable*
now, where previously the only options were "register it and imply it works" or
"delete it".

### 2. Model-level overrides on `models`

```sql
ALTER TABLE models ADD COLUMN commercial_allowed TEXT;  -- NULL = inherit provider
ALTER TABLE models ADD COLUMN model_license TEXT;       -- 'apache-2.0', 'llama-3.1', …
ALTER TABLE models ADD COLUMN supports_structured INTEGER NOT NULL DEFAULT 0;
```

Three columns, each earning its place:

- `commercial_allowed` nullable so the common case costs nothing and only
  genuine divergence is stored. OpenRouter is the motivating case: the
  *provider* permits commercial use, but each `:free` route inherits its
  upstream model's licence, so the answer is per row.
- `model_license` because "can I use this commercially" is frequently a
  question about weights, not about the gateway.
- `supports_structured` closes an existing asymmetry: the router already takes
  a `requireStructured` filter, but no column feeds it — capability currently
  comes from `services/quirks.ts`. Bringing it alongside `supports_vision` and
  `supports_tools` makes the three capability flags uniform.

### 3. Catalog transport

Add a `providers` array to the signed catalog, gated on `hasProvider()` exactly
as `models`, `embeddings`, `transcriptionModels` and `videoModels` already are:

```ts
interface CatalogProvider {
  platform: string;
  freeType: 'permanent' | 'credit_recurring' | 'credit_one_time'
          | 'promotional' | 'keyless' | 'card_backed' | 'retired' | 'unverified';
  freeCredits?: { amount: number; currency: string; period: string } | null;
  freeExpiresAfterDays?: number | null;
  cardRequired: boolean;
  signupVerification?: 'discord' | 'telegram' | 'cn_realname' | 'phone' | null;
  keyless?: boolean;
  commercialAllowed: 'yes' | 'no' | 'model_dependent' | 'unknown';
  commercialRestriction?: string | null;
  productionAllowed: 'yes' | 'no' | 'model_dependent' | 'unknown';
  accountCaps?: { rpm?: number | null; rpd?: number | null; tpd?: number | null };
  lastVerifiedAt?: string | null;
  verifiedMethod?: 'live_probe' | 'official_docs' | 'third_party' | 'unverified';
  quotaSourceUrl?: string | null;
  notes?: string | null;
}
```

Central authoring is the point: tier terms change weekly, and shipping them in
migrations means every install carries a snapshot that is wrong within a month.
This is the same reasoning that already keeps model rows in the hosted catalog.

### 4. What routing does with it

Metadata nobody reads rots. Two consumers justify the table:

**A `commercial_use` mode.** A setting that, when on, drops from the candidate
pool any model whose effective `commercial_allowed` is `no` — and, under a
strict variant, also `unknown`. Resolution order: model override, then
provider, then `unknown`. This is the feature that makes the Cohere case safe
instead of merely documented.

**Staleness surfacing.** The dashboard shows `last_verified_at` per provider
and flags anything older than N days. A `credit_one_time` provider past its
`free_expires_after_days` is shown as expected-expired rather than waiting to
be discovered through 402s.

### 5. Backfill

Seed from what is already defensible in-tree — the `Platform` union comments,
`providers/index.ts` registration notes, `docs/en/providers/01-supported-platforms.md`,
and the account-cap constants in `services/ratelimit.ts` (`openrouter` 1000/day,
`modelscope` 1800/day, `navy` 150K tokens/day, `nvidia` 40 rpm).

Every backfilled row gets `verified_method = 'official_docs'` or
`'third_party'` and **`last_verified_at = NULL`**. Backfill is not verification.
A row claiming a verification that never happened is worse than an empty one —
that is the AnyAPI lesson in schema form.

## Alternatives rejected

**Columns on `models` instead of a provider table.** Tier facts are
provider-scoped; the catalog carries ~635 provider endpoints across ~474 model
families, so this duplicates each fact hundreds of times and invites rows to
disagree. Rejected.

**A single `free: boolean`, as today.** Cannot distinguish permanent from
lapsing, cannot express licence terms, and offers nothing to a staleness check.
It is the status quo that produced all three motivating incidents.

**Provider facts in code, next to the adapter.** Tempting, since `index.ts`
already carries the prose. But then updating a quota claim needs a release,
and every install runs a snapshot frozen at build time. The catalog exists
precisely because these facts move faster than releases. Rejected for the tier
data; base URL and adapter choice stay in code, where they belong.

**A generic key/value `provider_metadata` table.** Maximum flexibility, no
constraints, no types, unqueryable without JSON extraction. Rejected — the
enums are the value here.

## Consequences

- One new table, three nullable columns, one new catalog array. No change to
  routing behaviour until the `commercial_use` mode is built; the schema lands
  inert and backwards-compatible.
- `provider_registry` needs a row per platform or the dashboard shows blanks —
  acceptable, since absence and `unknown` are meaningfully different and both
  render honestly.
- The staleness surface will initially show ~48 providers as never verified.
  That is accurate, and is the point.

## Reversal conditions

Revisit if the hosted catalog gains a general per-provider metadata channel
that makes a dedicated table redundant, or if `commercial_allowed` proves to be
model-level far more often than provider-level — in which case the provider row
becomes a default nobody uses and the field should move wholesale to `models`.

## Open questions (do not guess)

Tracked in `.ai/context/unknowns.md` as U-004 through U-006. The important one:
several tier claims in this repository now conflict with a third-party
September 2026 survey, and no live probe has been run to resolve it. The
`last_verified_at` field exists precisely so this class of conflict is visible
in data instead of being argued from prose.
