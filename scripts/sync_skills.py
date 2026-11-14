"""Copy the vendored skills (.agents/skills) to .claude/skills for Claude Code.

Why: Claude Code only discovers project skills in .claude/skills, while Codex,
Cursor, OpenCode and Gemini read .agents/skills. A symlink would avoid the copy,
but symlinks break on Windows without Developer Mode, so we copy instead.
.claude/skills is gitignored; .agents/skills is the single source of truth.

Usage:  python scripts/sync_skills.py          # sync
        python scripts/sync_skills.py --check  # exit 1 if out of sync
"""

from __future__ import annotations

import filecmp
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / ".agents" / "skills"
DST = ROOT / ".claude" / "skills"


def in_sync() -> bool:
    if not DST.is_dir():
        return False
    pending = [filecmp.dircmp(SRC, DST)]
    while pending:
        cmp = pending.pop()
        if cmp.left_only or cmp.right_only or cmp.diff_files or cmp.funny_files:
            return False
        pending.extend(cmp.subdirs.values())
    return True


def main() -> int:
    if not SRC.is_dir():
        print(f"error: {SRC} not found", file=sys.stderr)
        return 2
    if "--check" in sys.argv[1:]:
        ok = in_sync()
        print("skills in sync" if ok else "skills OUT OF SYNC: run `mise run sync-skills`")
        return 0 if ok else 1
    if DST.is_symlink() or DST.is_file():
        DST.unlink()
    elif DST.is_dir():
        shutil.rmtree(DST)
    shutil.copytree(SRC, DST)
    count = sum(1 for p in DST.iterdir() if (p / "SKILL.md").is_file())
    print(f"synced {count} skills -> {DST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
