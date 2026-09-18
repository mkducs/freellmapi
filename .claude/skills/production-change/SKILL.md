---
name: production-change
description: Plan and execute a change that touches production systems, production data, deployments, or infrastructure — requires explicit human approval at two gates.
disable-model-invocation: true
---

# Production Change Workflow

Input: `$ARGUMENTS`

This skill is for anything that touches production: deployments, production
database migrations, infrastructure changes, credential rotation, or
operations against live customer data. It requires two separate human
approvals — do not collapse them into one.

1. **Discover** — inspect the current production-relevant state (config,
   migration history, deployment target) using read-only means.
2. **Impact analysis** — identify: what changes, what it depends on, what
   depends on it, blast radius if it goes wrong, and whether it is
   reversible.
3. **Plan** — under `.ai/plans/active/`, include:
   - exact sequence of operations
   - rollback plan (concrete, not "revert the commit")
   - backup/recovery considerations for any data touched
   - observability: what to watch during/after
   - verification criteria for "this worked"
4. **Human approval gate 1** — present the plan and impact analysis. Do not
   proceed without explicit approval.
5. **Implement** — execute the approved sequence exactly. If reality diverges
   from the plan, stop and report rather than improvising.
6. **Verify** — confirm system health and business behavior with actual
   evidence (commands run, output observed), not reasoning alone.
7. **Human approval gate 2** — present verification evidence before
   considering the change complete/shipped.

Never force-push, destroy production data, run an unreviewed migration, or
perform an irreversible external operation (an outbound payment, a
regulatory or third-party submission, a production deploy) without
explicit human approval at both gates. This
applies even when a task otherwise appears low-risk.
