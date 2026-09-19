---
name: implement
description: Implement an approved plan using minimal coherent changes and continuous verification.
disable-model-invocation: true
---

# Implementation

Read the active plan.

Before changing code:
- confirm acceptance criteria
- inspect affected code
- identify existing tests

Implement in dependency order.

After each coherent unit:
- run targeted verification
- inspect failures
- correct root causes

Do not expand scope without recording the reason.

At completion:
- run full relevant verification
- inspect git diff
- update the plan with status
