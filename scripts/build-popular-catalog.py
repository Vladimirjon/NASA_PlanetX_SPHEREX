# /// script
# requires-python = ">=3.13"
# dependencies = ["defusedxml==0.7.1", "httpx==0.28.1", "skyshift==0.1.0"]
#
# [tool.uv.sources]
# skyshift = { path = "../backend" }
# ///
"""Build a provenance-bearing local catalog from CDS Sesame responses."""

import asyncio
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote

import httpx
from defusedxml import ElementTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend" / "src"))
from skyshift.domain.targets import CHALLENGE_TARGETS  # noqa: E402

URL = "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?"
SPECIAL = {
    "M1": ("Crab Nebula",),
    "M31": ("Andromeda Galaxy", "Andromeda", "NGC 224"),
    "M42": ("Orion Nebula", "NGC 1976"),
    "M45": ("Pleiades",),
    "M51": ("Whirlpool Galaxy", "Whirlpool", "NGC 5194"),
}
EXTRA = {
    "Sirius": (),
    "Vega": (),
    "Betelgeuse": (),
    "Rigel": (),
    "Polaris": (),
    "Proxima Centauri": (),
    "Alpha Centauri": ("Rigil Kentaurus", "\u03b1 Cen", "alf Cen"),
    "Arcturus": (),
    "Antares": (),
    "Aldebaran": (),
    "Deneb": (),
    "Altair": (),
    "Capella": (),
    "Canopus": (),
    "Spica": (),
    "Fomalhaut": (),
    "Barnard's Star": (),
    "Wolf 359": (),
    "Luyten's Star": (),
    "Tau Ceti": (),
    "Epsilon Eridani": (),
    "61 Cygni": (),
    "Eta Carinae": (),
    "Sgr A*": ("Galactic Center", "Sagittarius A*"),
    "Large Magellanic Cloud": ("LMC",),
    "Small Magellanic Cloud": ("SMC",),
    "Horsehead Nebula": (),
    "Carina Nebula": (),
    "Omega Centauri": (),
    "47 Tucanae": ("47 Tuc",),
    "Sculptor Galaxy": (),
    "Centaurus A": (),
    "Luhman 16": ("WISE 1049-5319",),
    "Gliese 229 B": (),
    "2MASS J0415-0935": (),
    "Epsilon Indi B": (),
    "WISE 0855-0714": (),
    "RW Aurigae": (),
    "R Draconis": (),
}


def parse_record(
    name: str, aliases: tuple[str, ...], data: bytes, now: str
) -> dict[str, object] | None:
    root = ElementTree.fromstring(data)
    resolver = root.find("./Target/Resolver")
    if (
        resolver is None
        or resolver.findtext("jradeg") is None
        or resolver.findtext("jdedeg") is None
    ):
        return None
    ref = resolver.findtext("refPos")
    source = {
        "resolver": resolver.get("name", ""),
        "refPos": ref,
        "url": URL + quote(name, safe=""),
    }
    record: dict[str, object] = {
        "name": aliases[0] if name in SPECIAL else name,
        "aliases": list(dict.fromkeys((name, *aliases, resolver.findtext("oname") or name))),
        "ra": float(resolver.findtext("jradeg") or ""),
        "dec": float(resolver.findtext("jdedeg") or ""),
        "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
        "object_type": resolver.findtext("otype"),
        "description": "Messier catalogue object"
        if name.startswith("M") and name[1:].isdigit()
        else "Astronomical object",
        "source": source,
        "retrieved_at": now,
    }
    pmra, pmdec, parallax = (
        resolver.findtext("pm/pmRA"),
        resolver.findtext("pm/pmDE"),
        resolver.findtext("plx/v"),
    )
    if pmra is not None and pmdec is not None:
        record["proper_motion_masyr"] = {"ra": float(pmra), "dec": float(pmdec)}
    if parallax is not None:
        record["parallax_mas"] = float(parallax)
    for known in CHALLENGE_TARGETS:
        if name.casefold() == known.canonical_name.casefold():
            record.update(
                name=known.canonical_name,
                ra=known.position.ra_deg,
                dec=known.position.dec_deg,
                coordinate_epoch=known.epoch_label,
                motion={
                    "pm_ra_masyr": known.motion.pm_ra_masyr,
                    "pm_dec_masyr": known.motion.pm_dec_masyr,
                    "parallax_mas": known.motion.parallax_mas,
                    "ref_epoch_jyear": known.motion.ref_epoch_jyear,
                },
            )
            record["aliases"] = list(dict.fromkeys([*record["aliases"], *known.aliases]))
            source["verified_astrometry"] = known.source
    return record


async def main() -> None:
    entries = [(f"M{i}", SPECIAL.get(f"M{i}", ())) for i in range(1, 111)] + list(EXTRA.items())
    now = datetime.now(UTC).isoformat()
    sem = asyncio.Semaphore(8)
    async with httpx.AsyncClient(
        follow_redirects=True, timeout=30, headers={"User-Agent": "SkyShift catalog builder/0.1"}
    ) as client:

        async def fetch(
            name: str, aliases: tuple[str, ...]
        ) -> tuple[str, dict[str, object] | None, str]:
            async with sem:
                try:
                    query = "WISE J085510.83-071442.5" if name == "WISE 0855-0714" else name
                    try:
                        response = await client.get(URL + quote(query, safe=""))
                    except httpx.ReadTimeout:
                        response = await client.get(URL + quote(query, safe=""))
                    response.raise_for_status()
                    result = parse_record(name, aliases, response.content, now)
                    if result is not None and query != name:
                        source = result["source"]
                        source["url"] = URL + quote(query, safe="")
                    return name, result, "not found" if result is None else ""
                except (httpx.HTTPError, ValueError, ElementTree.ParseError) as exc:
                    return name, None, f"{type(exc).__name__}: {exc}"

        results = await asyncio.gather(*(fetch(name, aliases) for name, aliases in entries))
    records = [r for _, r, _ in results if r is not None]
    failed = [(n, e) for n, r, e in results if r is None]
    dest = ROOT / "backend/src/skyshift/data/popular_targets.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = ROOT / "docs/reviews/search/catalog-build.md"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(
        f"# Generación del catálogo\n\n- Fecha UTC: {now}\n"
        f"- Consultas: {len(entries)}\n- Resueltas: {len(records)}\n"
        f"- Omitidas: {len(failed)}\n\n" + "".join(f"- {n}: {e}\n" for n, e in failed),
        encoding="utf-8",
    )
    print(f"{len(records)}/{len(entries)} resolved; {len(failed)} skipped")


if __name__ == "__main__":
    asyncio.run(main())
