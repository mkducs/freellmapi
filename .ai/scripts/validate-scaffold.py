from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[1]

required = [
    "CLAUDE.md",
    "README.md",
    ".claude/settings.json",
    ".claude/hooks/guard-destructive.sh",
    ".claude/hooks/session-start.sh",
    ".claude/agents/researcher.md",
    ".claude/agents/architect.md",
    ".claude/agents/implementer.md",
    ".claude/agents/tester.md",
    ".claude/agents/reviewer.md",
    ".claude/agents/debugger.md",
    ".claude/skills/discover/SKILL.md",
    ".claude/skills/research/SKILL.md",
    ".claude/skills/architect/SKILL.md",
    ".claude/skills/plan/SKILL.md",
    ".claude/skills/implement/SKILL.md",
    ".claude/skills/verify/SKILL.md",
    ".claude/skills/review/SKILL.md",
    ".claude/skills/new-feature/SKILL.md",
    ".claude/skills/debug/SKILL.md",
    ".claude/skills/research-project/SKILL.md",
    ".claude/skills/refactor/SKILL.md",
    ".claude/skills/production-change/SKILL.md",
    ".claude/skills/ship/SKILL.md",
]

missing = [p for p in required if not (ROOT / p).exists()]
if missing:
    print("Missing:")
    print("\n".join(missing))
    sys.exit(1)

try:
    json.loads((ROOT / ".claude/settings.json").read_text())
except Exception as exc:
    print(f"Invalid .claude/settings.json: {exc}")
    sys.exit(1)

print(f"OK: {len(required)} required scaffold files present.")
