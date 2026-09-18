# Claude Autonomous Engineering Workflow

A reusable, domain-agnostic Claude Code scaffold that enforces a full
engineering lifecycle instead of "just write the code":

**DISCOVER → RESEARCH → SYNTHESIZE → ARCHITECT → PLAN → IMPLEMENT → VERIFY → REVIEW → SHIP**

Claude must understand the system, establish evidence, decide and record
architecture, plan the work, implement the smallest coherent change, and
prove the result with real verification output — while production-impacting,
destructive, and irreversible actions always stop for explicit human
approval.

## What's in here

| Path | What it is |
|---|---|
| `CLAUDE.md` | The operating contract Claude reads automatically: phase gates, autonomy levels, evidence rules, git protocol, the Section 12 hard stops |
| `GUIDE.md` | The **human** operating guide — how to install, drive, and supervise the workflow |
| `.claude/agents/` | 6 specialist subagents: `researcher`, `architect`, `implementer`, `tester`, `reviewer`, `debugger` |
| `.claude/skills/` | 13 lifecycle skills invoked as slash commands: `/discover`, `/research`, `/architect`, `/plan`, `/implement`, `/verify`, `/review`, `/ship`, `/new-feature`, `/debug`, `/refactor`, `/research-project`, `/production-change` |
| `.claude/hooks/` | `guard-destructive.sh` (blocks high-risk Bash patterns at the tool-call boundary) and `session-start.sh` (creates the `.ai/` tree) |
| `.claude/settings.json` | Wires both hooks to `PreToolUse` / `SessionStart` |
| `.ai/` | The durable knowledge layer — empty skeleton plus READMEs explaining each directory's contract |
| `.ai/templates/` | 8 artifact templates: ADR, decision-log entry, discovery, evidence, plan, research, spec, verification |
| `workflows/` | 6 long-form workflow guides: new project, new feature, debugging, refactoring, research, production change |
| `scripts/` | `validate-scaffold.py` (presence check) and `init-workflow.py` (creates the directory tree) |

## Install

Extract into the repository root, then:

```bash
python scripts/validate-scaffold.py   # -> OK: N required scaffold files present.
claude
```

**If the project already has a `CLAUDE.md`, do not blindly overwrite it** —
see `GUIDE.md` §3 for the merge procedure.

## Before you rely on it: two things to adapt

1. **`CLAUDE.md` Section 14 — Domain rules & data protection.** Ships
   domain-agnostic with bracketed placeholders. Fill in this project's
   domain, its sensitive data classes, its correctness-critical
   calculations, and which downstream operations are irreversible.
2. **`.ai/context/`** is empty by design. Let Claude populate
   `project.md`, `constraints.md`, `terminology.md`, and `unknowns.md` from
   a `/discover` run against the real repository — don't hand-write guesses.

A verification entrypoint (e.g. `scripts/verify.sh`) is intentionally *not*
included: it is stack-specific. Add one that runs this project's real
lint/typecheck/test/build chain — `/verify` and `/ship` expect actual
command output, not assertions.

## Provenance

Extracted from a working repository that ran this workflow through 60+
shipped specs. Everything domain-specific was removed or genericized:

- **Excluded:** all application source, tests, migrations, dependency
  manifests, and every populated `.ai/` artifact (specs, ADRs, plans,
  discovery notes, verification reports, roadmap, research) — those are
  project history, not scaffold.
- **Genericized:** `CLAUDE.md` Section 14 (domain rules), rule 16's
  examples, Gate A.1's app-root examples, Section 11's deploy-wiring note,
  the `guard-destructive.sh` denial message, and single lines in
  `GUIDE.md`, `/ship`, and `/production-change`.

The scaffold's structure, gates, autonomy policy, and safety boundaries are
unchanged.
