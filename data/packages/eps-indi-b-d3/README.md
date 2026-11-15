# Epsilon Indi B D3 — paquete de validación / validation package

## Español
Contiene dos recortes FITS reales, dos ventanas CWAVE/CBAND, manifiesto y link-report.json.
Los FITS no se commitean: cada destinatario regenera y verifica su copia.
Desde la raíz del repositorio, regenerar (requiere red):
`uv run --locked --script scripts/build-validation-package.py`
Verificar sin red y sin modificar el manifiesto:
`uv run --locked --script scripts/build-validation-package.py --verify`
Otra ubicación: añadir `--out DIR` al generar o `--package DIR` al verificar.
Originales y calibración: `data/raw/spherex-originals/`; reutilizar con `--raw DIR`.
El par sigue siendo CANDIDATO: este paquete no demuestra comparabilidad científica.
Falta el contenido del caso (Sebastián); completeness=unverified y offline=incomplete.
`case_ref` y `region_id` son identificadores locales provisionales.
Fuente y procedencia por imagen: package-manifest.json; evidencia de vínculos: link-report.json.

## English
Contains two real FITS cutouts, two CWAVE/CBAND windows, manifest and link-report.json.
FITS files are not committed: each recipient regenerates and verifies their own copy.
From the repository root, regenerate (network required):
`uv run --locked --script scripts/build-validation-package.py`
Verify offline without modifying the manifest:
`uv run --locked --script scripts/build-validation-package.py --verify`
Custom location: add `--out DIR` to build or `--package DIR` to verify.
Originals and calibration: `data/raw/spherex-originals/`; reuse with `--raw DIR`.
The pair remains a CANDIDATE: this package does not establish scientific comparability.
Case content (Sebastián) is missing; completeness=unverified and offline=incomplete.
`case_ref` and `region_id` are provisional local identifiers.
Per-image sources: package-manifest.json; link evidence: link-report.json.
