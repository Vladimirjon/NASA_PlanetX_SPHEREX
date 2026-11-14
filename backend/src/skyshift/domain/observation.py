"""One SPHEREx L2 spectral image as listed by SIA2 (metadata only)."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Observation:
    obs_did: str  # obs_publisher_did: unique per image (OBSID + detector); cache key
    obs_id: str  # OBSID, shared by the simultaneous D1/D4, D2/D5, D3/D6 images
    collection: str  # spherex_dr1 | spherex_qr3
    detector: int  # 1..6, from energy_bandpassname "SPHEREx-Dn"
    t_min_mjd: float  # MJD-BEG
    t_max_mjd: float  # MJD-END
    access_url: str  # IBE URL (supports ?center=&size= cutouts)
    s3_key: str | None  # key in the public nasa-irsa-spherex bucket, for byte-range reads

    @property
    def t_mid_mjd(self) -> float:
        return (self.t_min_mjd + self.t_max_mjd) / 2
