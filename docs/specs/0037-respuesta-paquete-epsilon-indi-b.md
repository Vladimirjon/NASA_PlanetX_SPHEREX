# Respuesta científica al paquete D3 de ε Indi B

14-nov-2026 · Rama de Johann `feat/validation-package-eps-indi-b` en `3a5617d`, PR #12. El paquete es para el par de la ficha 0032 §4.1, no la serie D2 de la demo. Sigue siendo candidato; un paquete de datos no aprueba los controles científicos.

## Por qué los valores espectrales difieren

Se recuperó el procedimiento original de la ficha 0032 (`/tmp/eps_fit_explore.py` de la sesión anterior) y se ejecutó nuevamente con Astropy 8.0.2, SciPy 1.18.1 y NumPy 2.5.4 sobre los recortes anteriores. El ajuste gaussiano era exploratorio, sin máscara FLAGS, y redondeaba al píxel nativo más cercano **al centro ajustado**, con origen 0. Johann usa el píxel nativo más cercano **al centro del recorte** (RA 331,095°, Dec −56,801°). No son el mismo punto.

El archivo local de calibración usado en la repetición tiene SHA-256 `51750c8f948a30541d391e54930279aa067c62c398a7cc2679e592bc6044427a`, igual al del `link-report.json` del PR. Se leyeron las extensiones como `array[y, x]`:

| Fecha | Píxel de la ficha 0032 `(x, y)` | CWAVE / CBAND (µm) | Píxel del centro de Johann `(x, y)` | CWAVE / CBAND (µm) |
| --- | --- | --- | --- | --- |
| A, DR1 | `(793, 1146)` | 1,934120774 / 0,046931170 | `(794, 1146)` | 1,934140682 / 0,047086824 |
| B, QR3 | `(195, 1184)` | 1,933309913 / 0,047647767 | `(194, 1184)` | 1,933396697 / 0,047672659 |

La razón `|ΔCWAVE| / min(CBAND)` es ≈0,01728 en los píxeles del sondeo y ≈0,01580 en los píxeles centrales. La diferencia se reproduce leyendo esos cuatro píxeles del mismo archivo; no evidencia por sí sola un error de Johann ni de la calibración. Las coordenadas continuas de nuestro centroide anterior fueron A `(793,270; 1146,043)` y B `(194,676; 1184,201)`, aproximadas a milésimas; se aplicó redondeo al entero más cercano. La evidencia de Mateo del PR #11 reporta centroides A `(793,306; 1146,038)` y B `(194,676; 1184,198)`, que redondean a los mismos píxeles que el sondeo, sin demostrar por ello que estén validados.

**Regla de trabajo:** conservar los valores del centro como referencia de la región. Para el caso científico, leer `CWAVE` y `CBAND` en la posición medida de la fuente de **cada época**, mediante el vínculo documentado recorte → píxel nativo y calibración; registrar el método de redondeo, origen y versión. Si la fuente o su centroide no están verificados, el valor en ese punto es provisional. Comparar centro y ancho es solo una preselección para brillo; 0,02 no valida la equivalencia espectral y no es un criterio universal de movimiento.

## Identificadores para el paquete

Aceptar para este intercambio los identificadores **ya usados por Johann**: `case_ref = eps-indi-b-d3-pair` y `region_id = eps-indi-b-d3-cutout-box`, `revision = 1`. Son identificadores de ese caso y de esa caja, no nuevas reglas globales ni un cambio de contrato. La clave interna `epsilon` de la vista de ciencia identifica el ejemplo local y debe mapearse explícitamente; no sustituye al `case_ref`. `AR-epsilon-indi-b-motion-D3` identifica el análisis de Mateo y no debe confundirse con el caso ni con la región. Cualquier modificación de nombres o revisión del contrato se acuerda con Johann y el dueño de regiones.

## Alcance de la revisión

Se regeneró el paquete de `3a5617d` de forma independiente en una carpeta temporal con `uv run --locked --script scripts/build-validation-package.py --out ...` y después se ejecutó `--verify --package ...`: el manifiesto validó, los cuatro activos verificables pasaron y el informe generado coincide exactamente con `link-report.json` del PR. El generador verificó identidad píxel a píxel para IMAGE, FLAGS, VARIANCE y ZODI y comparación de la tabla WCS-WAVE; estos controles no prueban identidad de todos los elementos de EPSF. No se incorporaron FITS al repositorio. Las comprobaciones de alineación, calidad, incertidumbre y sesgo de color del objeto permanecen pendientes según [0036](0036-revision-par-epsilon-indi-b.md).
