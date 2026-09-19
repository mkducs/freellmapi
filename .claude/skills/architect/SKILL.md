---
name: architect
description: Evaluate architecture options and create an evidence-backed technical decision before material implementation.
---

# Architecture

Read discovery and research artifacts first.

Evaluate at least two options where meaningful tradeoffs exist.

Consider:
- correctness
- security
- performance
- scalability
- cost
- operability
- maintainability
- vendor lock-in
- migration
- rollback

Produce an ADR under `.ai/decisions/`.

Include reversal conditions: measurable conditions that would justify revisiting the decision.

Do not wait for human approval before the plan phase begins. Write the ADR
so a human can audit or override it later without re-deriving your
reasoning: state the decision, the rejected alternatives, your confidence,
and the reversal conditions clearly enough to stand alone.
