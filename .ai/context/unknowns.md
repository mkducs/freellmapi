# Unknowns

Open questions that could not be established from the repository. Each needs a
human answer or an experiment — none should be guessed.

| # | Unknown | Why it matters | How to settle it |
| --- | --- | --- | --- |
| U-001 | Does any CI workflow deploy on merge to `main`? | Decides whether merge is *also* an auto-deploy Section 12 item beyond the catalog/release reason already recorded. | Read `.github/workflows/`; record the finding in `project.md`. |
| U-002 | Regulatory scope (if any) for this project. | Section 14 compliance. | Human confirmation only. |
| U-003 | Whether the published catalog is generated from this repo or authored elsewhere. | Determines whether a catalog change is even in this repo's blast radius. | Trace `catalog-sync.ts` against the freellmapi.co publishing process; ask the maintainer. |
