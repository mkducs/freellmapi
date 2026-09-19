---
name: plan
description: Convert an approved architecture and requirements into an implementation plan with dependencies, acceptance criteria, verification, and rollback.
disable-model-invocation: true
---

# Planning

Read:
- `.ai/research/`
- `.ai/evidence/`
- `.ai/decisions/`
- repository conventions

Create a plan under `.ai/plans/active/`.

Include:
- objective
- scope
- non-goals
- acceptance criteria
- files/modules likely affected
- database changes
- API changes
- frontend/backend changes
- tests
- observability
- security
- dependencies
- task sequence
- rollback strategy
- whether this plan triggers CLAUDE.md Section 12 (production-impacting,
  destructive, or irreversible) — if so, note that `/production-change`
  and its human approval gates apply instead of proceeding straight to
  implementation

Do not implement in this skill. Once the plan is written, implementation
proceeds without waiting for approval unless Section 12 applies.
