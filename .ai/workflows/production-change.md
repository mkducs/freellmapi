# Production Change Workflow

Production changes require explicit human approval.

Before execution:
- architecture/impact analysis
- rollback plan
- migration safety
- observability
- backup/recovery considerations
- deployment sequence
- verification criteria

After execution:
- verify health
- verify business behavior
- record evidence
- document anomalies

Never force-push, destroy production data, or run irreversible operations without explicit approval.
