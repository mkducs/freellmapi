---
name: refactor
description: Restructure existing code without changing observable behavior, backed by a baseline and before/after verification.
disable-model-invocation: true
---

# Refactor Workflow

Input: `$ARGUMENTS`

1. Establish a baseline: run the existing tests/checks and record the result
   before touching anything.
2. Map current behavior for the affected area (inputs, outputs, side effects,
   error paths).
3. Define the invariants that must hold after the change.
4. Create a small refactoring plan under `.ai/plans/active/` — scope, files
   affected, and what is explicitly out of scope.
5. Make one coherent change at a time.
6. Run the relevant verification after each unit; stop and investigate on any
   deviation from baseline.
7. Compare final behavior against the baseline — same inputs, same outputs.
8. Review the final diff for anything beyond the stated scope.

Never mix refactoring with unrelated feature work or bug fixes unless
explicitly requested. If a refactor uncovers a real bug, stop, report it
separately, and let the human decide whether to fix it in this change or a
follow-up.
