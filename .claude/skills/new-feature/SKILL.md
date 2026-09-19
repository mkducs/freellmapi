---
name: new-feature
description: Run the complete supervised lifecycle for a new feature: discovery, research, architecture, planning, implementation, verification, and review.
disable-model-invocation: true
---

# New Feature Workflow

Input: `$ARGUMENTS`

1. Discovery
2. Research unknowns and external dependencies
3. Synthesize findings
4. Architecture decision — record as an ADR; do not wait for approval
5. Implementation plan — record under `.ai/plans/active/`; do not wait for
   approval unless the plan triggers CLAUDE.md Section 12 (production-
   impacting, destructive, or irreversible), in which case switch to
   `/production-change` instead of continuing here
6. Implementation
7. Verification
8. Final review
9. Update durable documentation, including `.ai/decisions/DECISION_LOG.md`
   for any judgment call made along the way that wasn't ADR-worthy

Do not skip gates because the feature appears simple. Skipping a gate and
logging a decision instead of pausing are different things — every gate
still produces its artifact, it just doesn't block on human approval unless
Section 12 applies.
