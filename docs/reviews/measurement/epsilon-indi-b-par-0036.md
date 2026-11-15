# ε Indi B — respuesta a la ficha 0036 (controles del par A/B)

- Medición: Mateo · 14-nov-2026, noche · **El caso sigue como candidato, techo OBSERVADO.** Nada de aquí cambia el resultado ni el contrato.
- Par: **A** = `2025W24_1A_0245_4` (DR1, 2025-06-10) · **B** = `2026W40_1A_0070_2` (QR3, 2026-09-28) · detector D3.
- Datos completos: [`epsilon-indi-b-pair-controls.json`](epsilon-indi-b-pair-controls.json). Reproducir: `mise run measure-epsindb` (lee IRSA/S3 reales; usa caché).

## 1. Píxeles problemáticos (FLAGS en la posición medida y en la ventana del ajuste)

| | Posición prevista (px) | Medida − prevista (px) | Banderas a ≤ 2,5 px de la prevista | … de la **medida** | … en la **ventana del ajuste** (9×9 px) |
| --- | --- | --- | --- | --- | --- |
| A | (793,29; 1146,13) | (+0,019; −0,087) | ninguna | ninguna | ninguna |
| B | (194,69; 1184,13) | (−0,016; +0,071) | ninguna | ninguna | ninguna |

Se listan todos los bits distintos de `SOURCE` (bit 21, que marca fuentes conocidas y nunca es un problema). Ningún píxel de la zona usada por el ajuste tiene bits de `COMPARE_MASK` ni `OUTLIER`. La posición medida quedó a menos de 0,1 px de la prevista en ambas imágenes, así que la revisión centrada en la medición coincide con la centrada en la previsión.

## 2. Alineación de A y B y efecto en el error del objetivo

**Estrellas de referencia por imagen** (Gaia DR3, mismo método, radio de identificación de 1 px; el detalle por estrella está en el JSON):

| | Usadas / intentadas | Excluidas | Desplazamiento medio (RA·cosδ; Dec) | Dispersión por estrella | Error de la media (SEM) | Cambio máximo al quitar 1 estrella |
| --- | --- | --- | --- | --- | --- | --- |
| A | 9 / 15 | 5 con FLAGS, 1 fuera del recuadro | (−0,050; +0,180)″ | (0,264; 0,467)″ | (0,088; 0,156)″ | 0,141″ |
| B | 12 / 15 | 1 con FLAGS, **2 rechazadas por identificación** (residuos de 31,8″ y 27,0″: el ajuste cayó sobre otra fuente) | (+0,002; −0,151)″ | (0,232; 0,295)″ | (0,067; 0,085)″ | 0,058″ |

**Qué pasa si los errores de las dos fechas no son independientes.** Solo el término WCS (0,3″ por eje) puede estar correlacionado entre fechas; el del centroide es independiente. Con correlación ρ: `C_Δ,WCS = 2σ²(1 − ρ)` por eje.

| ρ entre fechas | σ de la diferencia por eje | Q (umbral 28,7437) |
| --- | --- | --- |
| −1 (peor caso posible) | 0,61″ | **99,4** |
| −0,5 | 0,53″ | 131,6 |
| 0 (lo entregado) | 0,43″ | 194,7 |
| +0,5 | 0,31″ | 373,7 |
| +0,9 | 0,16″ | 1414,7 |

**Aun en el peor caso (ρ = −1), Q supera el umbral 3,5 veces.** Dato que respalda ρ ≈ 0: con las 76 exposiciones, la correlación de los desplazamientos medios de referencia es **+0,004 / +0,057 dentro de una misma pasada** (747 pares) y **−0,019 / −0,038 entre pasadas** (2103 pares). Esto no demuestra la independencia, pero no muestra una correlación apreciable.

**Variante "registro diferencial"** (corregir el objetivo con el desplazamiento medio de las referencias de cada imagen): Δ = (+5,141; −2,770)″ ± (0,138; 0,200)″ y Q = 1557. Es más preciso, pero **se aleja de lo esperado por Gaia en Dec** (−3,21″): la diferencia entre las medias de A y B (−0,33″ en Dec, ~1,8 SEM) parece ruido de las referencias más que un error real del WCS. Por eso **no la propongo como método por defecto**; queda como sensibilidad.

## 3. Prueba del método: fuentes SINTÉTICAS inyectadas sobre fondos REALES

- 76 exposiciones reales, 454 posiciones, 3 niveles de SNR. Perfil gaussiano **integrado por píxel** (no es el modelo exacto del ajuste) con FWHM entre 1,0 y 1,3 px y una variante elíptica. Fase sub-píxel aleatoria y error de ±0,5 px en la posición inicial. Semilla fija 20261114. **Son fuentes sintéticas: no son detecciones.**
- Colocación: sin bits de `COMPARE_MASK` en la ventana del ajuste, sin estrellas Gaia a < 3 px y sin picos > 3σ en el núcleo. **El bit `SOURCE` cubre el ~95 % de este campo y no se puede evitar**, así que quedan fuentes débiles de fondo. Es la condición real del campo.

| SNR | Recuperadas | Sesgo (px) | Error robusto (px / ″) | Pull robusto (1 = honesto) | Capturas catastróficas (> 0,5 px) | Cobertura 2σ del núcleo |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 449 / 454 | (−0,08; +0,01) | 0,11 / 0,67″ | 0,96 / 0,93 | 31 % | 0,95 |
| 30 | 452 / 454 | (−0,08; −0,03) | 0,03 / 0,18″ | 0,92 / 0,87 | 13 % | 0,93 |
| 100 | 454 / 454 | (−0,01; −0,03) | 0,013 / 0,08″ | **1,37** / 1,07 | 5,7 % | 0,76 |

**Lectura:**
- En el núcleo (sin capturas), el error declarado es **honesto a SNR 10–30** y **se subestima ~1,4× en RA a SNR 100**, probablemente por la diferencia entre el modelo puntual y el perfil integrado por píxel. Su efecto en el par es despreciable: el error estadístico del centroide es ~0,02″, frente a 0,3″ del término WCS.
- **El riesgo principal en este campo poblado son las capturas**: el ajuste se va a otra fuente cercana (5,7 % a SNR 100). Además, en el **58 %** de las posiciones "vacías" el ajuste encuentra algo con SNR ≥ 5, porque el fondo tiene fuentes débiles. Conclusión: aquí la **identificación depende de la predicción** (Gaia más el radio de 1 px), no de una detección ciega. En A y B la posición medida quedó a < 0,1 px de la predicción, así que no hubo captura.

## 4. Ba/Bb y longitud de onda

| | A | B |
| --- | --- | --- |
| `CWAVE` en el píxel nativo | 1,934121 µm | 1,933310 µm |
| `CBAND` | 0,046931 µm | 0,047648 µm |
| Calibración | `cal-swcs-v5-2026-191` (única versión publicada; tabla `WCS-WAVE` idéntica byte a byte a la de la imagen, regla 0001 §3.5) | ídem |

- Δλ del par = **0,81 nm**. Con la pendiente medida (cota a 2σ), el sesgo posible por Ba/Bb **en este par** es **≤ 0,0003″ por eje**, frente a un error del par de 0,43″ (unas 1/1300 de σ). Es despreciable.
- En todo el rango de la serie (1,64–2,40 µm) la misma cota llega a **0,31″ / 0,24″**. Por eso la medición multiépoca es más sensible a Ba/Bb que el par.
- Límite: el modelo es lineal en λ; no excluye un desplazamiento del fotocentro no lineal.

## Propuesta para tu decisión (no la tomo yo)

| Control | Evidencia nueva | Lo que queda abierto |
| --- | --- | --- |
| Calidad (FLAGS) | Ninguna bandera en la zona medida ni en la ventana del ajuste de A y B | Fuentes infrarrojas sin Gaia (el campo es denso) |
| Alineación | Residuos por estrella en A y B; SEM 0,07–0,16″; correlación entre fechas ≈ 0 en 76 exposiciones | Que aceptes 0,3″ por eje como cota local |
| Incertidumbre | Q > 28,74 incluso con ρ = −1; errores del centroide honestos (pull ≈ 1) salvo 1,4× a SNR alta | Riesgo de captura (5,7 %); errores no gaussianos en las colas |
| `centroid_color_bias` | `CWAVE`/`CBAND` vinculados; sesgo de Ba/Bb ≤ 0,0003″ en el par | Comportamiento no lineal; solución publicada de Ba/Bb |

Pendiente para Johann (0036, punto 5): el paquete con recortes nativos y huellas de integridad.
