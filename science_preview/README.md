# Local comparison preview / Vista local de comparación

## Español

La página muestra **píxeles reales** de cuatro recortes SPHEREx de NASA/IPAC. Los pares no están alineados y sus objetos no están confirmados; las imágenes no son evidencia de movimiento o variación. Cada imagen tiene fecha, colección, detector, longitud de onda aproximada y enlace al FITS original. Los dos cuadros usan la misma escala de visualización asinh en cada caso; el brillo en pantalla no es fotometría. Los píxeles sin valor se muestran en negro.

`cases.json` conserva los valores de `IMAGE` en `MJy/sr`, más URLs y fechas. Se obtuvieron de los recortes IRSA enlazados en ese archivo y se leyeron con `astropy.io.fits` 8.0.2, sin reproyección ni interpolación. El orden de matriz se conserva; la orientación celeste entre imágenes no se iguala. Los archivos FITS de origen se descargaron a directorios temporales y no se incluyen en Git:

| Caso | Fecha | SHA-256 del recorte descargado |
| --- | --- | --- |
| WISE 0855 | 2025-05-05 | `8637937f0e43e28a7ce976e45207bd1066931909d12b7c8528692b28b451168a` |
| WISE 0855 | 2026-05-11 | `521f7fa6b340eead782f4134d09867919f5470425521035495dba65013c768dc` |
| ε Indi B | 2025-06-10 | `482a85a08a66a88075214b17f27a43afcfffd5b4224b9dbc7d2e31052f0c1b0c` |
| ε Indi B | 2026-09-28 | `eb9504eeea4a2e71ffa5aab0a3f60aa41237aff6b00c3e4e2f30eb1398f81ed5` |

Los valores de λ se calcularon en posiciones candidatas; WISE usa posiciones hipotéticas y ε Indi B un centroide exploratorio. Las calibraciones se documentan en las fichas 0031 y 0032. `reports.json` se regenera con `python -m science.preview`; los estados `unknown` no se rellenan artificialmente.

Para ejecutar y probar, ver [el README del módulo](../science/README.md). Esta página es una explicación local para el equipo; la UI final pertenece a Daniel.

## English

This local preview displays real SPHEREx cutout pixels from NASA/IPAC IRSA. The images are not registered and neither candidate is a validated detection. Dates, detector, approximate wavelength, source links, display scaling, and missing uncertainty are visible in the page. See `cases.json` for the source and cutout URLs and the table above for downloaded cutout checksums. Run the commands in [the module README](../science/README.md).
