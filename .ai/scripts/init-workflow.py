from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]

dirs = [
    ".ai/context",
    ".ai/research/active",
    ".ai/research/completed",
    ".ai/evidence",
    ".ai/architecture",
    ".ai/decisions",
    ".ai/plans/active",
    ".ai/plans/completed",
    ".ai/verification",
    ".ai/logs",
    ".ai/templates",
    ".claude/agents",
    ".claude/skills",
    ".claude/hooks",
]

for d in dirs:
    (ROOT / d).mkdir(parents=True, exist_ok=True)

claude = ROOT / "CLAUDE.md"
if not claude.exists():
    template = ROOT / "CLAUDE.md"
    if template.exists():
        print("CLAUDE.md already supplied by scaffold.")
else:
    print("Existing CLAUDE.md preserved. Merge scaffold rules manually if needed.")

print("\nClaude Autonomous Workflow initialized.")
print("Next: claude")
print("Then: Run the discovery workflow on this repository. Do not modify application source code.")
