"""Interpretation traffic light (AGENTS.md §1, D12 §6.13).

OBSERVED: an apparent difference. EVALUATED: every quality check passed. CONFIRMED does not
exist in code on purpose — only a human with external evidence can assign it.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

Level = Literal["OBSERVED", "EVALUATED"]


@dataclass(frozen=True, slots=True)
class Check:
    name: str
    passed: bool
    detail: str


def interpretation_level(checks: Sequence[Check]) -> Level:
    return "EVALUATED" if checks and all(c.passed for c in checks) else "OBSERVED"
