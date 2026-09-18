---
name: ship
description: Run the final pre-ship gate — confirm requirements, verification, and review are actually done before calling work complete.
disable-model-invocation: true
---

# Ship Gate

This is the last checkpoint before declaring a task done. It does not
implement or verify anything new — it confirms the required evidence
already exists. Under the default L2 policy, passing this gate is also the
signal to commit, push, open a PR, and merge without waiting for a human to
say go — unless the merge would trigger a real production deployment
(CLAUDE.md Section 11/12), in which case stop for approval instead of
merging.

Check, and report PASS/FAIL/UNKNOWN for each:

- [ ] Requirement/acceptance criteria are stated and each has a PASS/FAIL/UNKNOWN
- [ ] Discovery artifact exists under `.ai/research/active/` (or `completed/`)
      for this task, if the task warranted one
- [ ] Material unknowns were investigated, not silently assumed — check
      `.ai/context/unknowns.md` and any task-specific unknowns.md
- [ ] Architecture decisions of consequence are recorded as an ADR under
      `.ai/decisions/`, if any were made
- [ ] An implementation plan exists under `.ai/plans/` and the actual diff
      matches its scope (no silent scope expansion)
- [ ] Verification actually ran — check `.ai/verification/` for commands and
      real output, not assertions
- [ ] `git diff` has been read end-to-end and contains no unrelated changes
- [ ] Security/data-protection implications reviewed for anything touching
      customer data, PII, or correctness-critical calculations (see
      CLAUDE.md Section 14)
- [ ] Known risks and remaining unknowns are stated, not hidden
- [ ] Every non-ADR judgment call made during the task is recorded in
      `.ai/decisions/DECISION_LOG.md` with reasoning and alternatives
- [ ] For anything production-impacting: both `/production-change` human
      approval gates were obtained

If any item covered by CLAUDE.md Section 12 (production-impacting,
destructive, or irreversible) is FAIL or UNKNOWN, stop — do not declare the
task complete or ship, and ask the human explicitly.

For every other FAIL or UNKNOWN item, do not silently declare success:
either go back and produce the missing artifact/evidence now, or — if that
is genuinely not possible (e.g. verification tooling is unavailable) — log
it as a known gap in the Completion Report's Risks/Unknowns section and in
`.ai/decisions/DECISION_LOG.md`, and proceed. A logged gap is acceptable; a
silently skipped one is not.
