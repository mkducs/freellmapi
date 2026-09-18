---
name: debug
description: Run an evidence-driven debugging workflow for a failing test, runtime error, regression, or CI problem.
disable-model-invocation: true
---

# Debug Workflow

Input: `$ARGUMENTS`

1. Reproduce.
2. Capture exact failure.
3. Map the failure to a system layer.
4. Form competing hypotheses.
5. Test hypotheses.
6. Identify root cause.
7. Implement the smallest justified fix.
8. Add regression coverage.
9. Re-run verification.
10. Document root cause and verification.

Never patch symptoms without understanding the failure mechanism.
