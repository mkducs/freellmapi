---
name: discover
description: Investigate a repository or feature request before implementation. Use when the system, requirements, architecture, or affected code are not yet understood.
---

# Discovery

Do not modify application source code.

Investigate:
1. repository structure
2. application entry points
3. build/package/test configuration
4. relevant modules
5. relevant data flow
6. existing APIs/integrations
7. existing tests
8. architectural conventions
9. constraints
10. dependencies
11. likely side effects
12. unknowns

Create or update a discovery report under `.ai/research/active/`.

Report:
- problem understanding
- current architecture
- relevant files
- data flow
- constraints
- unknowns
- questions requiring human decisions
- recommended next investigation

Never guess when repository evidence is available.
