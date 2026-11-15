# ε Indi B — controles de la medición de movimiento (para Sebastián)

- Responsable de la medición: Mateo · 14-nov-2026, noche · **Candidato de movimiento, techo OBSERVADO.**
- Reproducir: `mise run measure-epsindb` (detector D3, DR1 + QR3, datos reales de IRSA/S3).
- Resultado completo: [`frontend/public/demo/epsilon-indi-b/analysis-result.json`](../../../frontend/public/demo/epsilon-indi-b/analysis-result.json) (valida contra `contracts/analysis-result.schema.json`).
- Evidencia para tu checklist (formato de `science/checklists.py`, tu par): [`epsilon-indi-b-checklist-evidence.json`](epsilon-indi-b-checklist-evidence.json). Tu `build_checklist(case, "motion")` la acepta y devuelve **`pending`**.

Ningún número de aquí asigna "evaluado". Los controles cuya aceptabilidad es decisión científica quedan en `unknown` con sus valores.

| Lo que pediste | Qué se hizo | Resultado |
| --- | --- | --- |
| Posición medida en cada fecha | Centroide gaussiano en el marco nativo de cada imagen + WCS completa (con SIP) | 76 exposiciones usadas de 99, en 4 pasadas (517 días) |
| Error de cada medición | Covarianza 2×2 por exposición = centroide (escalada si χ²_red > 1) + término WCS por eje | En el JSON, `cov_pos_arcsec2` |
| Desalineación con estrellas del campo | 15 estrellas Gaia DR3 (G 11–17,5, RUWE ≤ 1,4, aisladas a 2 px, a > 30″ del objetivo), medidas con el mismo método en el mismo recuadro | Dispersión del desplazamiento medio por exposición: **0,16″ (RA·cos Dec) y 0,21″ (Dec)**; sesgo −0,06″ / +0,03″; correlación −0,56. Queda por debajo del 0,3″ provisional, así que se mantiene 0,3″ (no se reduce). 790 mediciones de referencia |
| Píxeles con problemas | `COMPARE_MASK` (0x3FD2CEC7) a 2,5 px; `OUTLIER` se marca | 19 exposiciones excluidas por FLAGS y 4 por borde. Sin exposiciones con `OUTLIER` entre las usadas |
| Fuentes vecinas | Fuentes Gaia a < 3 px (18,45″) del objetivo en las fechas usadas | **Ninguna.** Ojo: una estrella G=19,3 estaba a ~15″ en J2016, pero ε Indi B se alejó de ella |
| Mezcla Ba/Bb | Pendiente de los residuos de posición contra la λ local (WCS-WAVE) | RA·cos Dec −0,09 ± 0,16 ″/µm; Dec −0,00 ± 0,16 ″/µm en 1,64–2,40 µm: **compatible con cero** con esta precisión |
| 0,3″ provisional | Contrastado con el campo (fila 3) | Se sostiene en este campo y detector; no es una cifra universal |

## Hallazgo del método

Sin un criterio de identificación, **2 de las 15 estrellas se ajustaban sobre otra fuente infrarroja** (residuos medianos de 29″ y 22″) e inflaban el error a 2″. Se agregó un radio de identificación de 1 px (6,15″): una referencia solo cuenta si se mide a menos de 1 px de su posición Gaia propagada. Se rechazaron 102 ajustes. Es un parámetro del método, queda registrado en el JSON y se puede revisar.

## Tu par (DR1 2025-06-10 · QR3 2026-09-28, D3)

- Δ = (+5,19; −3,10)″ con paralaje restado; separación 6,05″; covarianza ≈ diag(0,187; 0,189) arcsec² (épocas independientes).
- χ² (2 g.l.) = 195; p ≈ 5×10⁻⁴³. Esperado por Gaia en ese intervalo: ≈ (+5,18; −3,21)″.

## Contexto multiépoca

- μ = (3,907; −2,476) ± 0,062 ″/año frente a Gaia DR3 (3,982; −2,467). Diferencia (−0,075; −0,009) ″/año.
- Sensibilidad: quitando una pasada, μ cambia como máximo 0,16″/año (Dec, al quitar la última, unas 2,6σ). Sin `OUTLIER` no cambia.
- `outcome = threshold_exceeded_unverified`: supera Q ≥ 28,7437, pero los supuestos A4 (errores gaussianos y covarianza verificada) no están demostrados.

## Pendiente

- Recuperación de fuentes inyectadas en fondos reales (0034 §2).
- Solución publicada de Ba/Bb (C7).
- Que decidas la aceptabilidad de alineación, calidad, incertidumbre y `centroid_color_bias`.
