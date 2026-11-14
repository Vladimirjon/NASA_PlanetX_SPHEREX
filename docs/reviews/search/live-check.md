# Comprobación en vivo de búsqueda

Fecha UTC: 2026-11-14T23:12:00.266539+00:00
Servidor: `uv run --directory backend uvicorn --factory skyshift.api.app:create_app --port 8010`.
Se muestran hasta tres respuestas completas por consulta.

## `andromeda`

HTTP 200

```json
[
  {
    "name": "Andromeda Galaxy",
    "kind": "target",
    "ra": 10.6847083,
    "dec": 41.26875,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "AGN",
    "description": "Messier catalogue object",
    "matched_alias": "Andromeda",
    "score": 1.0,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?M31",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2006AJ....131.1163S"
    }
  }
]
```

## `andromeada`

HTTP 200

```json
[
  {
    "name": "Andromeda Galaxy",
    "kind": "target",
    "ra": 10.6847083,
    "dec": 41.26875,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "AGN",
    "description": "Messier catalogue object",
    "matched_alias": "Andromeda",
    "score": 0.756,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?M31",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2006AJ....131.1163S"
    }
  }
]
```

## `alpha centauri`

HTTP 200

```json
[
  {
    "name": "Alpha Centauri",
    "kind": "target",
    "ra": 219.902083,
    "dec": -60.833972,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "**",
    "description": "Astronomical object",
    "matched_alias": "Alpha Centauri",
    "score": 1.0,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?Alpha%20Centauri",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2001AJ....122.3466M"
    }
  },
  {
    "name": "Omega Centauri",
    "kind": "target",
    "ra": 201.697,
    "dec": -47.479472,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "GlC",
    "description": "Astronomical object",
    "matched_alias": "Omega Centauri",
    "score": 0.6,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?Omega%20Centauri",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2010AJ....140.1830G"
    }
  }
]
```

## `alfa cen`

HTTP 200

```json
[
  {
    "name": "Alpha Centauri",
    "kind": "target",
    "ra": 219.902083,
    "dec": -60.833972,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "**",
    "description": "Astronomical object",
    "matched_alias": "* alf Cen",
    "score": 1.0,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?Alpha%20Centauri",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2001AJ....122.3466M"
    }
  },
  {
    "name": "Canopus",
    "kind": "target",
    "ra": 95.987957829,
    "dec": -52.695661384,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "*",
    "description": "Astronomical object",
    "matched_alias": "* alf Car",
    "score": 0.6533333333333333,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?Canopus",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2007A&A...474..653V"
    }
  },
  {
    "name": "Deneb",
    "kind": "target",
    "ra": 310.357979753,
    "dec": 45.280338807,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "sg*",
    "description": "Astronomical object",
    "matched_alias": "* alf Cyg",
    "score": 0.6533333333333333,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?Deneb",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2007A&A...474..653V"
    }
  }
]
```

## `betelguese`

HTTP 200

```json
[
  {
    "name": "Betelgeuse",
    "kind": "target",
    "ra": 88.792938991,
    "dec": 7.407063995,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "s*r",
    "description": "Astronomical object",
    "matched_alias": "Betelgeuse",
    "score": 0.756,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?Betelgeuse",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2007A&A...474..653V"
    }
  }
]
```

## `m42`

HTTP 200

```json
[
  {
    "name": "Orion Nebula",
    "kind": "target",
    "ra": 83.8201,
    "dec": -5.3876,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "HII",
    "description": "Messier catalogue object",
    "matched_alias": "M 42",
    "score": 1.0,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?M42",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2022A&A...661A..38P"
    }
  },
  {
    "name": "M12",
    "kind": "target",
    "ra": 251.809083,
    "dec": -1.948528,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "GlC",
    "description": "Messier catalogue object",
    "matched_alias": "M 12",
    "score": 0.63,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?M12",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2010AJ....140.1830G"
    }
  },
  {
    "name": "M2",
    "kind": "target",
    "ra": 323.362583,
    "dec": -0.82325,
    "coordinate_epoch": "J2000.0 (reference frame; observation epoch unspecified)",
    "object_type": "GlC",
    "description": "Messier catalogue object",
    "matched_alias": "M 2",
    "score": 0.63,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?M2",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2010AJ....140.1830G"
    }
  }
]
```

## `wise 0855`

HTTP 200

```json
[
  {
    "name": "WISE 0855-0714",
    "kind": "target",
    "ra": 133.7952573,
    "dec": -7.245091,
    "coordinate_epoch": "MJD 55320.38 (2010.34)",
    "motion": {
      "pm_ra_masyr": -8118.0,
      "pm_dec_masyr": 680.0,
      "parallax_mas": 449.0,
      "ref_epoch_jyear": 2010.34
    },
    "object_type": "BD*",
    "description": "Astronomical object",
    "matched_alias": "wise 0855",
    "score": 1.0,
    "provenance": {
      "source_url": "https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?WISE%20J085510.83-071442.5",
      "retrieved_at": "2026-11-14T23:04:37.413916Z",
      "cache_layer": "precomputed",
      "resolver": "S=Simbad, IDIA (via url)",
      "reference": "2021ApJS..253....7K",
      "astrometry_source": "Luhman & Esplin 2016, ApJ 152, 78 (arXiv:1605.06655)"
    }
  }
]
```

## `00:42:44 +41:16:09`

HTTP 200

```json
[
  {
    "name": "00:42:44 +41:16:09",
    "kind": "coordinates",
    "ra": 10.683333333333334,
    "dec": 41.26916666666666,
    "coordinate_epoch": "ICRS",
    "score": 1.0,
    "provenance": {
      "source_url": "https://www.ivoa.net/documents/STC/",
      "collection": "user-supplied coordinates",
      "retrieved_at": "2026-11-14T23:12:00.376255Z",
      "cache_layer": "precomputed"
    }
  }
]
```
