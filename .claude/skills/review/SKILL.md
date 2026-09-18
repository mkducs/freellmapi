---
name: review
description: Perform a final engineering review of the current change, including correctness, security, architecture, scope, and verification evidence.
disable-model-invocation: true
---

# Review

Inspect:
- git diff
- active plan
- acceptance criteria
- tests
- architecture decision
- verification report

Look for:
- functional defects
- missing edge cases
- security issues
- data integrity risks
- concurrency problems
- error handling gaps
- unnecessary scope
- insufficient tests

Classify findings as BLOCKER/HIGH/MEDIUM/LOW/NOTE.

Do not declare approval if material issues remain.
