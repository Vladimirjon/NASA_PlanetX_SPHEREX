# Ficha 0002 — Analizador temporal (backend, cualquier RA/Dec)

- Dueño humano: Dax
- Estado: borrador v2 (valores científicos incorporados; pendiente de aprobación de Dax)
- ADRs relacionados: 0040 (caché por capas), 0041 (hexagonal)
- Ejecutor: Claude Code con subagentes (TDD). Revisor obligatorio: agente físico (veto sobre ciencia y semáforo).
- Base científica: `docs/context/12-mapa-de-datos-spherex.md` (en adelante **D12**). Cada regla cita su sección.

## 1. Objetivo funcional
Dada una posición del cielo (RA/Dec o nombre), devolver una **serie temporal de recortes SPHEREx alineados**, una imagen por pasada comparable, lista para loop/blink, con procedencia completa, las imágenes descartadas con su motivo y el nivel del semáforo (OBSERVED/EVALUATED). Funciona para cualquier punto; los 5 objetos del reto se precalculan.

## 2. Entradas exactas
Contrato: `contracts/openapi.yaml` (`/resolve`, `/observations`, `/series`, `/series/{id}/frames/{i}`).
- `ra` ICRS grados [0, 360); `dec` [-90, 90]; `fov_arcmin` [1, 30], 5 por defecto (mínimo útil 31×31 px ≈ 3,2′, D12 §6.8); `detector` 1–6 opcional; `wavelength_um` [0,7, 5,1] opcional.
- **Movimiento propio** opcional (`pm_ra_masyr`, `pm_dec_masyr`, `parallax_mas`, `ref_epoch`): lo llena `/resolve` para objetos con nombre (Sesame/Gaia DR3). Sin él, posición fija y aviso "objetos rápidos pueden salir del recorte" (D12 §0.1, §6.1). → **cambio de contrato a agregar antes de implementar.**
- Validación en el borde (pydantic); fuera de rango → 422 problem+json con el campo.
- El cliente **nunca** envía URLs ni rutas; hosts permitidos: `irsa.ipac.caltech.edu`, `nasa-irsa-spherex.s3.us-east-1.amazonaws.com`, `cds.unistra.fr`.

## 3. Salidas exactas
`Series` (contrato): rejilla TAN común norte-arriba 6,15″/px, frames con fecha (`MJD-AVG`), detector, λ local en el objetivo, unidad MJy/sr, estadísticas, procedencia; `rejected[]` con motivo; `comparability` con cada control y su resultado. Píxeles Float32 LE, NaN = enmascarado o fuera de tolerancia de λ.

## 4. Pipeline (cada paso es una función pura del dominio, probada aparte)
1. **Posición a la fecha** (D12 §6.1, §7): si hay movimiento propio, `SkyCoord.apply_space_motion` al `MJD-AVG` de cada imagen (incluye paralaje).
2. **Consultar** SIA2 `spherex_dr1` + `spherex_qr3` (nunca QR2, D12 §1) vía resolvedor por capas, TTL 24 h, **con reintento exponencial con jitter ante 502/503/timeout** (medido hoy: 2 de 5 llamadas dieron 502).
3. **Calidad**: `FINAST == 0`, `L2DQAFLG == 'Pass'`; objetivo a ≥ 15 px del borde del detector. Si no → `rejected` con motivo (D12 §6.2–6.3).
4. **Pasadas**: ordenar por `t_min`; nueva pasada si el salto > **45 días**; avisar si una pasada dura > 100 días (D12 §5.2).
5. **Detector**: de `energy_bandpassname` (`SPHEREx-Dn`); siempre el mismo detector en la serie. `em_min/em_max` **no** sirven para elegir (D12 §5.1).
6. **λ local en el objetivo**: leer solo la cabecera (~58 KB por rango S3), WCS espacial con SIP y `WCS(hdr, fobj, key="W")` con `sip = None` (D12 §2.2, §0.4).
7. **Elegir una imagen por pasada** con |Δλ| ≤ **λ/(4R)** frente a una λ de referencia común (R = 39, 41, 41, 35, 112, 128 por detector); minimizar |Δλ|; sin encadenar. Fuera → `rejected: wavelength_mismatch` con Δλ en nm (D12 §6.6).
8. **Recortar** ≥ 31×31 px: lectura por rango S3 de IMAGE, FLAGS, VARIANCE, ZODI (evita la tabla EPSF, 97 % del recorte IBE de ~19 s); recorte IBE como respaldo (D12 §1.1). **Medir ambos antes de elegir.**
9. **Máscara**: `COMPARE_MASK = 0x3FD2CEC7`; no enmascarar SOURCE (bit 21) ni OUTLIER (bit 19), que va como capa y baja el semáforo (D12 §3).
10. **Fondo**: `IMAGE − ZODI` y luego mediana robusta local; **nunca reescalar flujo entre épocas** (D12 §6.10–6.11).
11. **Reproyectar** a la rejilla común: `reproject_interp` para la vista; FLAGS por expansión de máscara; mapa de λ de cada fotograma y NaN donde |Δλ| > tolerancia (radio útil ~14–16 px, por el giro de 180° de `SPS_EPA`) (D12 §6.7, §6.9).
12. **Estadísticas**: percentiles sobre la **unión** de fotogramas (mismo estiramiento asinh para toda la serie).
13. **Incertidumbre**: σ_D = √(VAR_A + VAR_B); z = D/σ_D (D12 §6.12).
14. **Semáforo**: EVALUATED solo si se cumplen los 8 controles de D12 §6.13 (a–h); para movimiento, además coincidencia con lo predicho dentro de max(0,5″, 3σ). Si no, OBSERVED con los controles fallidos. Nunca CONFIRMED.

## 5. Caché (ADR 0040)
- Claves: SIA = hash(RA/Dec redondeados a 1″, colecciones, versión), TTL 24 h; cabecera/recorte = hash(`obs_publisher_did`, caja, versión), inmutables; serie = hash(parámetros normalizados, versión del pipeline).
- L1 memoria → precalculado (5 objetos) → L2 disco SHA-256 atómico → L3 IRSA; single-flight; circuit breaker; copia vencida servida con su fecha original si IRSA falla.
- Falta implementar: cuota de disco con limpieza LRU de archivos propios; reintento con jitter en adaptadores.

## 6. Casos de prueba (datos reales grabados como fixtures pequeñas)
- **Pasadas** (D12 §5.2): Barnard 3 (ago-25, mar-26, ago-26/QR3); Eps Indi B 4; WISE 0855 3 (solo DR1); RW Aur 3; R Dra 3 (la última mezcla DR1+QR3).
- **Movimiento esperado** (D12 §7): ~1 año → Barnard 1,67 px, WISE 0855 1,31 px, Eps Indi B 0,75 px.
- **WISE 0855 sin propagar** → el objetivo cae fuera del recorte: el test debe demostrar que con propagación cae dentro (regresión del error de la demo, D12 §0.1).
- **λ incompatible**: Barnard D3/D6 mar→ago-26 → `rejected: wavelength_mismatch`.
- **Bordes**: `ra=360`, `dec=-91`, `fov_arcmin=0` → 422; sin cobertura → 200 `frames=[]`; IRSA caído con caché → `cache_layer=local`, sin caché → 503; 10 peticiones iguales → 1 descarga.
- **`sip = None`**: λ de una cabecera D3 coincide con la referencia medida (1,6236 µm), no con 1,6294.

## 7. Criterio de aceptación
- `pytest` + `ruff` + `pyright` estricto en verde con salida pegada; test de arquitectura en verde.
- El agente físico revisa los 5 objetos y firma en `docs/reviews/` que serie, λ, máscara y textos son correctos.
- Latencia medida y registrada: caché caliente p95 < 300 ms; frío < 10 s para FOV 5′ (meta revisable tras medir S3 vs IBE).

## 8. [VERIFICAR] heredados de D12 §10 (no bloquean la implementación; son parámetros)
Visibilidad de WISE 0855 por imagen en D5/D6 · centroide de Barnard con núcleo saturado · umbrales λ/(4R), z ≥ 5, 2,5 px, 15 px, 45 d sin validar por ciencia · Barnard D3/D6 sin par (¿permitir λ/(2R) solo como OBSERVED?) · `WCS-WAVE` vs CWAVE · amplitud IR de RW Aur y R Dra.

## 9. Fuentes
D12 y sus fuentes: [Suplemento Explicativo v2.1](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf) · [IRSA acceso](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-access) · [IBE cutouts](https://irsa.ipac.caltech.edu/ibe/cutouts.html) · [Tutoriales IRSA](https://caltech-ipac.github.io/irsa-tutorials/spherex).
