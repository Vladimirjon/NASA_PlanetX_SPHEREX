# Ficha 0002 — Analizador temporal (backend, cualquier RA/Dec)

- Dueño humano: Dax
- Estado: borrador (pendiente de aprobación de Dax y de los valores del agente físico)
- ADRs relacionados: 0006 (arquitectura base y caché por capas)
- Ejecutor: Claude Code con subagentes (TDD). Revisor obligatorio: agente físico (veto sobre ciencia y semáforo).
- Base científica: `docs/context/12-mapa-de-datos-spherex.md` (en elaboración). Todo valor marcado **[FÍSICA]** se toma de ahí.

## 1. Objetivo funcional
Dada una posición del cielo (RA/Dec o nombre), devolver una **serie temporal de recortes SPHEREx alineados**, una imagen por pasada comparable, lista para mostrarse como loop/blink, con procedencia completa, las imágenes descartadas con su motivo y el nivel del semáforo (OBSERVED/EVALUATED). Funciona para cualquier punto; los 5 objetos del reto se precalculan.

## 2. Entradas exactas
Contrato: `contracts/openapi.yaml` (`/resolve`, `/observations`, `/series`, `/series/{id}/frames/{i}`).
- `ra` ICRS grados [0, 360); `dec` [-90, 90]; `fov_arcmin` [1, 30], 5 por defecto; `detector` 1–6 opcional; `wavelength_um` [0,7, 5,1] opcional.
- Validación en el borde (pydantic); entradas fuera de rango → 422 problem+json con el campo culpable.
- El cliente **nunca** envía URLs ni rutas: el servidor solo descarga de hosts permitidos (`irsa.ipac.caltech.edu`, `nasa-irsa-spherex.s3.us-east-1.amazonaws.com`, `cdsweb.u-strasbg.fr` para Sesame).

## 3. Salidas exactas
`Series` (ver contrato): rejilla TAN común, frames con fecha, detector, λ local, unidad, estadísticas y procedencia; `rejected[]` con motivo; `comparability` con la lista de controles y su resultado. Píxeles en Float32 little-endian, NaN = enmascarado.

## 4. Pipeline (cada paso es una función pura probada aparte)
1. **Consultar** SIA2 (`spherex_dr1` + `spherex_qr3`) vía resolvedor por capas (memoria → disco → IRSA).
2. **Agrupar en pasadas**: regla de umbral temporal **[FÍSICA]**.
3. **Elegir por pasada** la imagen del detector elegido cuya λ local en el objetivo esté más cerca de la λ pedida, dentro de tolerancia **[FÍSICA]**; si ninguna cumple → `rejected` con motivo.
4. **Recortar** solo la zona necesaria (servicio de recorte IRSA o lectura parcial S3 **[FÍSICA]**); nunca bajar la imagen completa si existe recorte.
5. **Enmascarar** píxeles con bits FLAGS **[FÍSICA]**; restar ZODI/fondo según **[FÍSICA]**.
6. **Reproyectar** a rejilla TAN común centrada en el objetivo (astropy WCS con SIP + reproject; método **[FÍSICA]**).
7. **Estadísticas** robustas (p01/p50/p99, fracción enmascarada) para contraste común.
8. **Semáforo**: EVALUATED solo si pasan todos los controles (mismo detector, λ en tolerancia, pasadas distintas, alineado, máscara aplicada, procedencia completa). Si no, OBSERVED con los controles fallidos listados.

## 5. Caché (ADR 0006)
- Claves deterministas: consulta SIA = hash(posición redondeada **[FÍSICA: tolerancia]**, colecciones, versión); recorte = hash(obs_id, región, versión); serie = hash(parámetros normalizados, versión del pipeline).
- L1 LRU memoria → L2 disco (SHA-256, escritura temporal + `os.replace`) → L3 IRSA. Single-flight por clave. TTL: consultas SIA 24 h (QR cambia), recortes inmutables.
- Límite de disco configurable con limpieza LRU solo de archivos propios. KV por defecto SQLite; Redis opcional.

## 6. Casos de prueba
- Válido (con datos reales grabados como fixtures pequeñas): WISE 0855 → ≥ 3 pasadas; Barnard → 3 pasadas (DR1 ago-25, mar-26; QR3 ago-26).
- Entrada inválida: `ra=360`, `dec=-91`, `fov_arcmin=0` → 422 con campo.
- Datos incompatibles: dos imágenes con λ fuera de tolerancia → una en `rejected` con motivo; nivel OBSERVED.
- Sin cobertura: posición sin imágenes → 200 con `frames=[]` y mensaje, nunca 500.
- IRSA caído: con caché → respuesta con `cache_layer=local`; sin caché → 503 problem+json; cortacircuitos abre tras N fallos.
- Concurrencia: 10 peticiones iguales simultáneas → 1 sola descarga a IRSA.
- Movimiento esperado (física): en Barnard la posición medida entre pasadas coincide con la predicha por Gaia DR3 dentro de la tolerancia **[FÍSICA]**.

## 7. Criterio de aceptación
- `pytest` + `ruff` + `ty`/`mypy` en verde con salida pegada; cobertura del dominio y del pipeline ≥ 90 %.
- El agente físico revisa los 5 objetos y firma en `docs/reviews/` que la serie y los textos son correctos.
- p95 < 300 ms con caché caliente; < 6 s en frío para FOV 5′ (medido y registrado).

## 8. Fuentes
- [IRSA: acceso a datos SPHEREx y SIA2](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-access/) · [Tutoriales SPHEREx IRSA](https://caltech-ipac.github.io/irsa-tutorials/spherex/) · [Suplemento explicativo](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf) · `docs/context/12-mapa-de-datos-spherex.md`.
