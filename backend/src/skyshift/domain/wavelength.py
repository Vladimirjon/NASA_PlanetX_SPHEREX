"""Wavelength compatibility between visits (D12 §6.6).

Each detector row sees a different wavelength (linear variable filter), so two images of the
same sky point only show the "same colour" if their local wavelength at the target agrees
within |Δλ| ≤ λ/(4R). One image is chosen per visit, all against ONE common reference (never
chained), maximising the number of visits kept and then minimising the total |Δλ|.
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Literal

from skyshift.domain.observation import Observation
from skyshift.domain.visits import Visit

# Design resolving power per detector, ES payload table (D12 §6.6).
RESOLVING_POWER: Mapping[int, float] = {1: 39, 2: 41, 3: 41, 4: 35, 5: 112, 6: 128}

RejectReason = Literal[
    "quality_flag",
    "near_detector_edge",
    "wavelength_mismatch",
    "wrong_detector",
    "no_coverage",
    "fetch_failed",
]


@dataclass(frozen=True, slots=True)
class Candidate:
    observation: Observation
    wavelength_um: float  # local wavelength at the (propagated) target position


@dataclass(frozen=True, slots=True)
class Chosen:
    visit: Visit
    observation: Observation
    wavelength_um: float
    delta_nm: float


@dataclass(frozen=True, slots=True)
class Rejection:
    obs_did: str
    reason: RejectReason
    detail: str


@dataclass(frozen=True, slots=True)
class Selection:
    detector: int
    reference_um: float | None
    tolerance_nm: float | None
    chosen: tuple[Chosen, ...]
    rejected: tuple[Rejection, ...]


def tolerance_nm(wavelength_um: float, detector: int) -> float:
    return wavelength_um / (4 * RESOLVING_POWER[detector]) * 1000


def _nearest(candidates: Sequence[Candidate], reference_um: float) -> Candidate:
    return min(
        candidates, key=lambda c: (abs(c.wavelength_um - reference_um), c.observation.obs_did)
    )


def _score(
    per_visit: Sequence[Sequence[Candidate]], reference_um: float, detector: int
) -> tuple[int, float]:
    tol = tolerance_nm(reference_um, detector)
    kept, total = 0, 0.0
    for candidates in per_visit:
        delta = abs(_nearest(candidates, reference_um).wavelength_um - reference_um) * 1000
        if delta <= tol:
            kept += 1
            total += delta
    return kept, total


def select_series(
    visits: Sequence[Visit],
    candidates: Mapping[str, Sequence[Candidate]],
    *,
    detector: int,
    reference_um: float | None = None,
) -> Selection:
    usable = [(v, candidates[v.visit_id]) for v in visits if candidates.get(v.visit_id)]
    if not usable:
        return Selection(detector, reference_um, None, (), ())

    if reference_um is None:
        options = sorted({c.wavelength_um for _, cs in usable for c in cs})
        per_visit = [cs for _, cs in usable]
        reference_um = min(
            options,
            key=lambda ref: (
                -_score(per_visit, ref, detector)[0],
                _score(per_visit, ref, detector)[1],
            ),
        )

    tol = tolerance_nm(reference_um, detector)
    chosen: list[Chosen] = []
    rejected: list[Rejection] = []
    for visit, cs in usable:
        best = _nearest(cs, reference_um)
        delta = abs(best.wavelength_um - reference_um) * 1000
        if delta <= tol:
            chosen.append(Chosen(visit, best.observation, best.wavelength_um, round(delta, 2)))
        else:
            rejected.append(
                Rejection(
                    best.observation.obs_did,
                    "wavelength_mismatch",
                    f"closest image differs by {delta:.1f} nm > tolerance {tol:.1f} nm "
                    f"at {reference_um:.4f} um",
                )
            )
    return Selection(detector, reference_um, round(tol, 2), tuple(chosen), tuple(rejected))
