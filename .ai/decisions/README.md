# Architecture Decision Records & Decision Log

Two artifacts live here, for two different sizes of decision:

- **ADRs** (`ADR-XXXX-<name>.md`) — material architectural decisions:
  framework/library choices, data model shape, service boundaries, anything
  expensive to reverse or that shapes a lot of downstream code.
- **`DECISION_LOG.md`** — the running log of smaller autonomous judgment
  calls made under the default L2 policy (`CLAUDE.md` Section 5): ambiguous
  requirement interpretations, scope boundaries, implementation-approach
  choices, unknowns resolved by best-available evidence.

Both exist because the AI does not stop and wait for human approval on
these under the default autonomy level — it decides, records the reasoning
and rejected alternatives, and continues. A human reviews asynchronously and
can override any entry at any time; the AI treats an override as binding.

Neither of these is a substitute for `CLAUDE.md` Section 12 — production-
impacting, destructive, or irreversible actions always require explicit
human approval before execution, never just a log entry.
