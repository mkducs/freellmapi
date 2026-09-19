# Backlog — spec intake

This is where a spec waits to be picked up for autonomous building, instead
of only arriving as a one-off chat message.

## Flow

1. Drop a spec as `.ai/backlog/pending/<short-name>.md` (use
   `.ai/templates/spec.md`). A human or another process can add these;
   Claude does not invent specs on its own.
2. When work starts on one, move it to `.ai/backlog/in-progress/` and run
   the normal lifecycle (`CLAUDE.md` Section 3) against it — discovery,
   research, architecture, plan, implement, verify, review, ship.
3. Once shipped (`/ship` passes and, per the current autonomy policy, the
   change is merged), move the spec to `.ai/backlog/completed/` and link the
   PR/commit it produced.

## This directory alone does not make building continuous

A directory of pending specs only helps if something actually resumes the
AI to work through it — this repo does not yet have that wired up. Two ways
to get real unattended operation:

- A scheduled Routine/trigger that periodically resumes this session with
  an instruction like "check `.ai/backlog/pending/` and work the next spec."
- A person periodically asking Claude to work the backlog.

Set one of these up explicitly if you want the loop to run without a human
initiating each cycle — it is not automatic just because this directory
exists.

## What belongs in `pending/`

A spec, not a vague idea. If a "spec" doesn't give the AI enough to make an
engineering judgment call (rule 16 in `CLAUDE.md` Section 1 — a business
fact no evidence could supply), the AI will stop and ask for the missing
piece rather than build against a guess. A pending spec that's too vague to
act on is a backlog-quality problem, not a workflow bug.
