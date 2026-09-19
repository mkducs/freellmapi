# Constraints

Fixed decisions the workflow should treat as given, not re-litigate.

## Product

- **No card, recurring, actually works.** A provider earns a catalog row only
  if its free tier is recurring (not a one-time grant), needs no payment
  method, and demonstrably serves a request. Precedents: SambaNova was dropped
  when its tier became a lapsing trial credit; Chutes was rejected for
  requiring a balance; AnyAPI is registered but carries no quota claim because
  live testing served nothing.
- **Never invent a limit.** No published limit means `null` and the
  unknown-limit cooldown path.
- OpenAI wire compatibility is the premise. A surface that no OpenAI client
  would know how to call needs an explicit argument before it is built.

## Technical

- TypeScript throughout; SQLite via migrations in `server/src/db/migrations/`.
- Credentials are encrypted at rest; `ENCRYPTION_KEY` or a 0600 key file.
- Bilingual docs: an `docs/en/` change usually needs its `docs/zh-cn/` mirror.

## Compliance

`UNKNOWN` — no human has stated a regulatory scope for this project. Do not
assert compliance with any framework. The project stores third-party API
credentials, which raises the bar on key handling regardless.
