# Claude Autonomous Workflow — User Operating Guide

## Purpose

This guide is the human operating procedure for the Claude Autonomous Workflow scaffold.

The framework is designed for both:

- a brand-new project
- an existing production codebase

Its core lifecycle is:

**DISCOVER → RESEARCH → SYNTHESIZE → ARCHITECT → PLAN → IMPLEMENT → VERIFY → REVIEW → SHIP**

The important distinction is that Claude is not instructed to "just code." It must first understand the problem and system, establish evidence, make or document architectural decisions, plan the work, implement it, and prove the result.

---

# 1. Before you start

You need:

- Claude Code installed and authenticated
- Git installed
- a Git repository for the project
- a working terminal
- access to the project's normal development/test tooling

For an existing project, make sure you have a clean or intentionally understood working tree.

Run:

```bash
git status
```

Do not start an autonomous workflow while unrelated uncommitted changes are mixed into the task unless you explicitly tell Claude about them.

---

# 2. Install the scaffold

## New project

Extract the scaffold into the repository root.

You should have:

```text
CLAUDE.md
.claude/
.ai/
workflows/
scripts/
```

Then run:

```bash
python scripts/validate-scaffold.py
```

Expected result:

```text
OK: ... required scaffold files present.
```

Start Claude:

```bash
claude
```

---

# 3. Existing project

Copy the scaffold's:

```text
.claude/
.ai/
workflows/
scripts/
```

into the existing repository.

### Important: existing CLAUDE.md

If the project already has `CLAUDE.md`, do NOT blindly replace it.

Instead ask Claude:

```text
Review the existing CLAUDE.md against the autonomous workflow scaffold.

Preserve all valid project-specific instructions.

Merge the autonomous workflow rules.

Do not remove project-specific build commands, architecture rules,
security requirements, or conventions.

Keep the final CLAUDE.md concise and internally consistent.
Do not modify application source code.
```

Claude Code officially loads project `CLAUDE.md` files at session startup, and Anthropic recommends keeping them concise because they consume context. The official documentation currently recommends targeting under about 200 lines per `CLAUDE.md`. citeturn0search0

---

# 4. First session — NEVER start by coding

The first thing you should do is discovery.

Use:

```text
/discover
```

or:

```text
Understand this repository before making any changes.

Run the discovery workflow.

Do not modify application source code.

Determine:
- project purpose
- users
- technology stack
- repository structure
- entry points
- architecture
- important data flows
- dependencies
- development commands
- testing strategy
- deployment model
- constraints
- unknowns

Create the appropriate durable artifacts under .ai/.
```

Claude should inspect the repository before proposing implementation.

---

# 5. Review the discovery report

Look at:

```text
.ai/research/active/
```

You should expect Claude to identify:

- relevant source files
- architecture
- data flows
- dependencies
- tests
- constraints
- unknowns

Do not proceed if the discovery is obviously incomplete.

Ask:

```text
The discovery is incomplete.

Investigate the missing areas:
<list>

Do not implement anything.
Update the discovery artifacts.
```

---

# 6. Research external uncertainty

Use research when the task depends on:

- an unfamiliar API
- a cloud service
- a framework capability
- pricing
- scaling limits
- security behavior
- vendor behavior
- standards
- performance claims
- architecture alternatives

Run:

```text
/research
```

Or:

```text
Research whether <QUESTION>.

Use primary sources first.

For every material claim:
- identify the source
- distinguish fact from inference
- identify contradictions
- identify unknowns
- provide confidence

Do not modify application source code.
Create durable research artifacts under .ai/.
```

The research output should be evidence-backed rather than merely a narrative answer.

---

# 7. Review the unknowns

Check:

```text
.ai/context/unknowns.md
```

and research artifacts.

A healthy investigation should explicitly expose uncertainty.

For example:

```text
U-001
Question: What is the maximum supported concurrency?
Impact: High
Status: Unknown
Resolution: Load test
```

Do NOT allow Claude to silently convert:

```text
"I don't know"
```

into:

```text
"It probably works."
```

The workflow requires UNKNOWN to remain UNKNOWN until evidence resolves it.

---

# 8. Architecture

If the feature involves a meaningful architectural choice, run:

```text
/architect
```

Claude should evaluate alternatives.

For example:

```text
Option A
Option B
Option C
```

For each, evaluate:

- correctness
- complexity
- performance
- scalability
- security
- cost
- operations
- maintainability
- vendor lock-in
- migration/reversal

The selected decision should become an ADR under:

```text
.ai/decisions/
```

---

# 9. Architecture review (async by default)

Under the default L2 policy, Claude does **not** stop here — it records the
ADR and moves straight to planning. Review the ADR whenever it's convenient
for you, not as a blocking step.

Ask, at any point:

```text
Explain the recommended architecture in practical terms.

What assumptions does it depend on?

What are the three largest risks?

What evidence supports the decision?

Under what conditions would we reverse this decision?
```

If you disagree with the ADR, override it:

```text
Override ADR-<id>.

Use <alternative> instead, because <reason>.

Update the ADR status, rework anything already built on the original
decision, and continue.
```

Only use L1 ("stop and wait for my approval before implementing") when you
explicitly want to slow down and review a specific task before it
proceeds — say so up front, e.g. "Use L1 for this one."

---

# 10. Create the implementation plan

Run:

```text
/plan
```

The plan should contain:

```text
Objective
Scope
Non-goals
Acceptance criteria
Dependencies
Database changes
API changes
Frontend changes
Backend changes
Tests
Security
Observability
Task sequence
Rollback
```

The most important section is:

```text
Acceptance Criteria
```

Example:

```text
AC-001 — User can authenticate using Google.
AC-002 — Existing sessions remain valid.
AC-003 — Failed authentication produces a safe error.
AC-004 — Authentication is covered by integration tests.
```

---

# 11. Plan review (async by default)

Under the default L2 policy, Claude proceeds straight to implementation once
the plan is written — it does not wait for your approval, unless the plan
triggers a `/production-change` (Section 19a), which still has two hard
human approval gates.

Review the plan whenever convenient, same as the ADR:

- Is the scope correct?
- Are the acceptance criteria testable?
- Are database changes safe?
- Are security implications covered?
- Is rollback possible?
- Are there unnecessary changes?

If something is wrong — even mid-implementation:

```text
Stop. The plan is wrong: <what's wrong>.

Revise it and continue.
```

Claude should stop that unit of work, update the plan, log the revision in
`.ai/decisions/DECISION_LOG.md`, and continue — it does not need to wait for
you to say "go ahead" again unless you say so.

Use L1 for a specific task ("Use L1 for this one, I want to approve the plan
first") whenever you want the old blocking behavior back for that task.

---

# 12. Implementation

Once approved:

```text
/implement
```

Claude should:

1. inspect the relevant code
2. implement the smallest coherent change
3. update tests
4. run targeted verification
5. investigate failures
6. continue incrementally

Do not ask Claude:

```text
"Just make whatever changes are necessary."
```

Prefer:

```text
Implement the approved plan exactly.

Do not expand scope.

If the plan conflicts with the actual codebase,
stop and report the conflict rather than inventing a solution.
```

---

# 13. If Claude discovers the plan is wrong

This is a normal and desirable outcome.

Claude should NOT force the implementation through.

The correct loop is:

```text
Plan
 ↓
Implementation discovery
 ↓
Plan invalidated
 ↓
STOP
 ↓
Explain why
 ↓
Update architecture/plan
 ↓
Human approval if required
 ↓
Continue
```

This prevents "agent drift."

---

# 14. Verification

Run:

```text
/verify
```

Claude must actually run relevant checks.

Depending on the project, that can include:

```text
unit tests
integration tests
E2E tests
type checking
lint
formatting
build
migration checks
security checks
runtime checks
```

Never accept:

```text
"The code should work."
```

as verification.

Require:

```text
PASS
FAIL
UNKNOWN
```

with actual evidence.

---

# 15. Review

After verification:

```text
/review
```

The reviewer should inspect the actual Git diff.

It should look for:

- functional bugs
- missed requirements
- security problems
- data integrity issues
- concurrency issues
- edge cases
- insufficient tests
- unnecessary changes
- architecture violations

Findings are classified:

```text
BLOCKER
HIGH
MEDIUM
LOW
NOTE
```

---

# 16. Ship gate (self-certified by default, async review)

Run:

```text
/ship
```

Claude checks its own completion checklist and, if everything not covered
by Section 12 is either PASS or a logged gap, proceeds all the way through
commit, push, PR, and merge — it does not wait for you to review `git diff`
first, and it does not wait for you to say "merge it" either. Anything
production-impacting, destructive, or irreversible (including a merge that
would trigger a real deploy, once this repo has one wired up) still stops
for explicit approval, per `/production-change`.

Review whenever convenient, before or after the merge — same async pattern
as the architecture and plan gates:

```text
git diff
```

and:

```text
.ai/verification/
.ai/decisions/DECISION_LOG.md
```

Confirm:

- requirements are satisfied
- tests passed
- no unrelated changes were introduced
- known risks are acceptable
- deployment/rollback is understood
- any logged decisions you disagree with

If you find a problem after the fact, say so and Claude reworks it — same
override pattern as Sections 9 and 11.

---

# 17. Bug workflow

For bugs, use:

```text
/debug <problem>
```

The required sequence is:

```text
REPRODUCE
    ↓
OBSERVE
    ↓
HYPOTHESIZE
    ↓
TEST HYPOTHESIS
    ↓
ROOT CAUSE
    ↓
MINIMAL FIX
    ↓
REGRESSION TEST
    ↓
VERIFY
    ↓
REVIEW
```

Do not accept symptom patches without root-cause analysis for non-trivial bugs.

---

# 18. Research-only workflow

If you only want research:

```text
/research-project <question>
```

Example:

```text
/research-project

Should we use LiveKit + provider X for realtime transcription?

Compare:
- latency
- accuracy
- diarization
- streaming
- cost
- concurrency
- GPU requirements
- autoscaling
- privacy
- vendor lock-in
- alternatives
```

Expected artifacts:

```text
.ai/research/active/<topic>/
├── README.md
├── findings.md
├── sources.md
├── alternatives.md
├── risks.md
├── unknowns.md
└── recommendation.md
```

---

# 19. New feature workflow

For most development tasks, use:

```text
/new-feature <feature>
```

Example:

```text
/new-feature Add organization-level RBAC
```

The framework should then follow:

```text
DISCOVER
   ↓
RESEARCH
   ↓
SYNTHESIZE
   ↓
ARCHITECT
   ↓
PLAN
   ↓
IMPLEMENT
   ↓
VERIFY
   ↓
REVIEW
```

The workflow may determine that a phase is unnecessary for a genuinely trivial change, but it must not silently skip a phase when there is meaningful uncertainty or risk.

---

# 19a. Refactor, production change, and ship

Three more first-class commands beyond feature/bug/research:

```text
/refactor <what>
```
Restructures existing code with a baseline, invariants, and before/after
verification — no behavior change intended.

```text
/production-change <what>
```
For anything touching production systems, production data, deployments, or
infrastructure. Requires two separate human approvals: one on the plan
before implementation, one on verification evidence before it counts as
shipped. Use this even for changes that seem low-risk if they touch a live
system.

```text
/ship
```
The final pre-ship checklist. It does not implement or verify anything new —
it confirms the required evidence (plan, verification, review) already
exists, then triggers commit, push, PR, and merge on its own (Section 16) —
unless the task is production-impacting, in which case `/production-change`
applies instead and still stops for your approval.

---

# 19b. Continuous building from a backlog

For building against a queue of specs instead of one-off chat requests,
drop specs into `.ai/backlog/pending/` using `.ai/templates/spec.md`. See
`.ai/backlog/README.md` for the flow.

This alone does not make building unattended — something still has to
resume Claude to work through the queue. Set up a scheduled Routine/trigger
if you want that, or periodically ask Claude to "work the next item in the
backlog." A spec that doesn't give Claude enough to make an engineering
judgment call (as opposed to a business fact only you could know — see
`CLAUDE.md` Section 1, rule 16) will come back to you with a specific
question rather than get built on a guess.

---

# 20. Autonomy levels

Use these deliberately.

## L0 — Advisory

Use when:

- learning
- exploring
- researching

Claude does not modify application code.

## L1 — Supervised

Use for a specific task when you want the old blocking behavior back —
review architecture/plan yourself before Claude implements. Say so
explicitly ("use L1 for this task"); it is no longer the default.

## L2 — Autonomous with Decision Log — DEFAULT

Claude executes the complete workflow — discover, research, architect,
plan, implement, verify, review, ship — without stopping at the
architecture or plan gate. Every judgment call that isn't covered by
`CLAUDE.md` Section 12 gets decided and logged (`.ai/decisions/`) instead
of asked about. You review asynchronously and can override anything, any
time (Sections 9, 11, 16).

This is the default for everything **except** what Section 12 already
carves out regardless of autonomy level: production deployment, production
database migrations, destructive database operations, credential/security
changes, infrastructure deletion, force-push, destructive filesystem
operations, and irreversible external API calls (including, per
`CLAUDE.md` Section 14, whichever downstream operations this project has
identified as irreversible). Those
always stop for explicit approval via `/production-change` — no autonomy
level changes that.

## L3 — Delegated

Use for:

- large independent workstreams
- parallel implementation
- automated PR preparation

Same Decision Log and Section 12 rules apply. Use only when the repository,
tests, and rollback process are mature.

---

# 21. When to use Opus

Prefer Opus for:

- discovery of complicated systems
- research
- research synthesis
- architecture
- tradeoff analysis
- difficult debugging
- security review
- final review

Prefer Sonnet for:

- straightforward implementation
- tests
- refactors
- documentation
- mechanical transformations

The goal is not to minimize Opus usage.

The goal is to use higher reasoning where it has the highest leverage.

---

# 22. When to use subagents

Use subagents when work is:

- independently decomposable
- specialized
- parallelizable
- expensive to keep in the main context

Example:

```text
                    MAIN AGENT
                        |
       +----------------+----------------+
       |                |                |
       v                v                v
   Research          Backend          Frontend
    Agent             Agent            Agent
       |                |                |
       +----------------+----------------+
                        |
                        v
                     TESTER
                        |
                        v
                    REVIEWER
```

Do not create agents simply because you can.

Each agent should have one clear responsibility.

Claude Code supports project subagents with their own model, tools, skills, permissions, hooks, memory, and optional worktree isolation. citeturn0search1

---

# 23. Git safety

Ordinary commits, pushes, PRs, and merges are autonomous by default (Section
16) — this section is about the operations that stay hard-blocked
regardless, not about routine shipping.

Before risky experiments:

```bash
git status
```

Create a checkpoint/commit when appropriate.

Never allow the autonomous workflow to casually perform:

```text
git push --force
git reset --hard
DROP DATABASE
TRUNCATE TABLE
terraform destroy
kubectl delete
rm -rf
```

The scaffold includes a safety hook for several destructive command patterns.

Review:

```text
.claude/hooks/guard-destructive.sh
```

before using the framework on a sensitive repository.

---

# 24. Persistent memory vs project artifacts

Use the systems for different purposes.

### CLAUDE.md

Project instructions:

- architecture rules
- commands
- conventions
- workflow rules
- security rules

### `.ai/`

Project-owned engineering knowledge:

- research
- ADRs
- plans
- verification
- evidence
- context

### Claude auto memory

Claude Code also has a separate machine-local auto-memory mechanism. It can retain useful learnings across sessions, but it is not a substitute for project-owned engineering documentation. citeturn0search0

Do not put critical architectural decisions only into auto memory.

---

# 25. Keep CLAUDE.md small

Do not turn `CLAUDE.md` into the entire engineering handbook.

Keep it focused on:

```text
rules
workflow
constraints
commands
architecture principles
safety
verification
```

Put detailed procedures into:

```text
.claude/skills/
workflows/
.ai/
```

Claude Code's official documentation specifically recommends concise, structured `CLAUDE.md` files because they are loaded into the context window at startup. citeturn0search0

---

# 26. What "done" means

A task is DONE only when:

```text
[ ] Requirement understood
[ ] Discovery completed
[ ] External unknowns researched
[ ] Architecture decided when necessary (ADR recorded, not necessarily approved)
[ ] Plan created (not necessarily approved, unless L1 or Section 12 applies)
[ ] Section 12 human approval obtained, if this task touches anything on that list
[ ] Implementation completed
[ ] Tests run
[ ] Type/lint/build checks run when applicable
[ ] Acceptance criteria verified
[ ] Git diff reviewed
[ ] Security implications reviewed
[ ] Known risks documented
[ ] Unknowns documented
[ ] Every non-ADR judgment call logged in `.ai/decisions/DECISION_LOG.md`
[ ] Final review completed
```

Do not mark the task complete simply because files changed successfully. A
logged decision satisfies "architecture decided" or "plan created" even
without your sign-off — the human gate that must never be skipped is
Section 12, not a general approve-everything step.

---

# 27. The standard interaction pattern

As the user, your normal interaction should become extremely simple.

### New feature

```text
/new-feature <feature>
```

### Research

```text
/research <question>
```

### Bug

```text
/debug <problem>
```

### Refactor

```text
/refactor <what>
```

### Production change

```text
/production-change <what>
```

### Ship gate

```text
/ship
```

### Existing repository onboarding

```text
/discover
```

### Architecture

```text
/architect
```

### Verification

```text
/verify
```

### Review

```text
/review
```

You should not have to repeatedly explain the autonomous workflow because `CLAUDE.md` defines it.

---

# 28. Recommended first real test

After installing the scaffold, do NOT start with your most important project.

Use a small but real feature.

For example:

```text
/new-feature Add a health-check endpoint and expose application version information
```

Observe whether Claude:

1. discovers the project
2. identifies the framework
3. finds the existing server entry point
4. checks existing health endpoints
5. plans the change
6. implements it
7. adds tests
8. verifies it
9. reviews the diff

If it skips important phases, improve `CLAUDE.md` or the relevant skill before trusting the framework with larger work.

---

# 29. Recommended second test

Use a feature with an external dependency:

```text
/new-feature Add OAuth login using <provider>
```

This tests:

```text
Discovery
+
Research
+
Security
+
Architecture
+
Planning
+
Implementation
+
Verification
```

This is a much better test of the framework than a simple CRUD feature.

---

# 30. Recommended third test

Give Claude an unfamiliar existing repository:

```text
/discover
```

Then ask:

```text
Based only on the repository evidence, explain the system architecture.

Do not modify code.

Identify the five most important unknowns
that should be resolved before making a major change.
```

If Claude can produce a useful architecture map without changing source code, the discovery layer is working.

---

# 31. The operating philosophy

The framework should make Claude behave less like:

```text
"Give me code and I will generate code."
```

and more like:

```text
"Give me an objective.

I will first determine what I need to know.

I will investigate the repository.

I will research material unknowns.

I will evaluate options.

I will document the decision.

I will create a plan.

I will implement within that plan.

I will test the result.

I will inspect the actual changes.

I will report evidence.

If I discover that my assumptions are wrong,
I will stop and tell you rather than silently improvising."
```

That is the behavior this scaffold is intended to enforce.

---

# 32. Quick-start card

For everyday use:

```text
1. Start Claude Code.

2. For an unfamiliar repository:
   /discover

3. For research:
   /research <question>

4. For architecture:
   /architect

5. For a feature:
   /new-feature <feature>

6. Claude decides architecture/plan and logs the reasoning — no approval
   needed unless the task touches CLAUDE.md Section 12 (production-
   impacting, destructive, or irreversible), or you explicitly asked for
   L1 on this task.

7. Let Claude implement.

8. Run:
   /verify

9. Run:
   /review

10. Run:
    /ship
    Claude commits, pushes, opens the PR, and merges on its own once this
    passes — you don't need to say "merge it."

11. Inspect:
    git diff
    (and .ai/decisions/DECISION_LOG.md) whenever convenient — before or
    after the merge. Override anything you disagree with; Claude reworks
    it and treats your correction as binding.

12. For anything production-impacting, destructive, or irreversible, use
    /production-change instead — that one still stops for your approval
    at two separate points, every time.
```

## Golden rule

**Do not ask Claude to "just build it" when the problem has meaningful uncertainty.**

Use the workflow.

**Understand first. Decide second. Implement third. Prove it last.**
