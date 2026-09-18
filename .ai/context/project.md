# Project context — freellmapi

Stable facts about this repository, established by inspection on 2026-09-18.
Update this file when one of them stops being true; do not re-derive it per task.

## What it is

`mkducs/freellmapi` — a self-hosted router that stacks the free tiers of ~48
upstream LLM providers behind one OpenAI-compatible endpoint. Single-user:
a local server plus a dashboard. Point any OpenAI client library at it and
requests fan out across whichever providers have keys configured.

## Shape of the tree

| Path | What lives there |
| --- | --- |
| `server/src/providers/` | One adapter per upstream. 10 native subclasses, the rest ride `OpenAICompatProvider`. `index.ts` is both the registry and the best documentation of per-platform judgment calls. |
| `server/src/services/` | Routing (`router.ts`), rate limits and cooldowns (`ratelimit.ts`), quota observation (`provider-quota.ts`), catalog sync, media, embeddings, fusion, scoring. |
| `server/src/routes/` | HTTP surfaces: `/v1` proxy, Anthropic and Gemini shims, Ollama shim, MCP, dashboard `/api`. |
| `server/src/db/` | SQLite schema, migrations under `db/migrations/`, `model-pricing.ts`. |
| `client/` | React dashboard. `components/keys/shared.tsx` holds the `PLATFORMS` registry (display names + signup URLs). |
| `shared/types.ts` | The `Platform` union — source of truth for platform identity. |
| `docs/en/`, `docs/zh-cn/` | Bilingual docs. `docs/en/providers/` covers platforms, quotas and how to add one. |

## Invariants worth knowing before changing anything

- **Three registries must stay in sync**: the `Platform` union in
  `shared/types.ts`, the runtime registry in `server/src/providers/index.ts`,
  and the zod `PLATFORMS` allowlist in `server/src/routes/keys.ts`.
- **Model rows are not seeded from third-party lists.** They come from
  versioned migrations (docs-confirmed rosters) or the signed hosted catalog
  via `catalog-sync.ts`. A bad id must fail a health check, not ship as a
  default.
- **Modalities are separated on purpose.** Chat models, `media_models`
  (image/video/audio/transcription) and embeddings live in different tables so
  a chat request can never misroute into an image model.
- **Media adapters are single-shot.** Every case in `media.ts` does one fetch.
  The only polling implementation in the tree is `SailProvider`, in the chat
  path.
- **Multi-key is first class.** `api_keys` has no unique constraint on
  `platform`; `selectKeyForModel` (`services/router.ts`) filters by model scope,
  orders by per-key bandit score or round-robin, optionally re-sorts by
  remaining quota, then walks eight gates before committing a key.
- Account-level gates count per `(platform, key_id)` — correct only while one
  key means one upstream account.

## Verification commands

Run from the repo root. `npm test` at root delegates to the workspaces.

- `npx vitest run` in `server/` — the main suite.
- `npx vitest run <path>` — targeted.
- `npm run lint` — eslint.
- TypeScript: `tsc` per workspace (`server/tsconfig.json`, `client/tsconfig.json`).

Record what actually ran, with output, in `.ai/verification/`.

## Delivery and release wiring

- Default branch: `main`. Work happens on operator-named feature branches.
- PRs carry human review and a Claude Approvals check.
- `main` feeds the published catalog and the release pipeline that existing
  installs pull from — which is why merging is a Section 12 stop here
  (`CLAUDE.md` Sections 5, 11, 12).
- `CONTRIBUTING.md` holds the commit checklist. `.claude/hooks/contributing-check.mjs`
  can inject it at commit time but ships unwired by default; leave it that way
  unless asked.
