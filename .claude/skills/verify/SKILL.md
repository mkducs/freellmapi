---
name: verify
description: Verify an implementation against acceptance criteria, tests, build checks, security expectations, and runtime behavior.
disable-model-invocation: true
---

# Verification

Treat implementation claims as untrusted until verified.

Run the strongest available checks:
- unit tests
- integration tests
- type checks
- lint
- build
- relevant runtime checks

Map results to acceptance criteria.

Create `.ai/verification/<date-or-task>.md`.

Use:
PASS only for verified results.
FAIL for demonstrated failures.
UNKNOWN when verification is not possible.
