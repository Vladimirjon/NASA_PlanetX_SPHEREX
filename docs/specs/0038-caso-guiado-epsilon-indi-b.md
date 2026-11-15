# Comparación guiada de ε Indi B

- Alcance aprobado por el usuario. Responsables de referencia: Johann (datos), Mateo (medición), Sebastián (ciencia) y Daniel (interfaz).
- Mostrar desde ε Indi B las dos exposiciones D3 del caso `eps-indi-b-d3-pair`, con la medida del par, fechas, fuentes y controles. El nivel es **OBSERVED**. Reutilizar la vista de comparación y el recurso precalculado previsto por la ficha 0010.
- Datos: preparar un recurso pequeño para el navegador a partir del paquete verificado. Conservar procedencia y distinguir la reproyección para visualizar de la medición hecha sobre píxeles nativos.
- Interfaz: asociar el resultado a los dos identificadores D3 exactos. Mantener accesibles las observaciones D2 como serie separada y ofrecer un estado comprensible si el caso D3 no carga.
- Ciencia: explicar la magnitud angular, la corrección de paralaje y los controles pendientes. Obtener la cifra del informe del par del PR #14. Revisar el texto en inglés y la fuente de cada valor.
- Aceptación: probar los dos cuadros reales, la asociación detector/fecha/archivo, el nivel observado, el estado de error y la navegación por teclado. Ejecutar tests, lint, build y revisión visual en escritorio y móvil.

## Evidencia para el texto

La cifra del par se obtiene como la magnitud de los dos componentes de `pair_displacement.delta_arcsec` en la [evidencia del PR #14](../reviews/measurement/epsilon-indi-b-pair-controls.json). La magnitud redondeada es 6,05″ después de corregir el paralaje. Las incertidumbres nominales de la diferencia son aproximadamente 0,43″ por coordenada con el supuesto de errores independientes entre fechas. El [informe de Mateo](../reviews/measurement/epsilon-indi-b-par-0036.md) documenta el escenario de sensibilidad a la correlación y las limitaciones del modelo y del campo.

La medición multiépoca abarca otras exposiciones. El caso guiado corresponde solo a los archivos DR1 y QR3 identificados en el [manifiesto de Johann](../../data/packages/eps-indi-b-d3/package-manifest.json). La conclusión pública conserva el nivel observado del resultado y la identificación como candidato de movimiento.

## Reproducción local

Regenerar el paquete con las instrucciones de [datos](../../data/packages/eps-indi-b-d3/README.md). Desde la raíz del repositorio, verificar el paquete y regenerar los recursos para el visor con el entorno fijado:

```text
uv run --locked --script scripts/build-validation-package.py --verify
uv run --locked --project backend python scripts/prepare-eps-indi-b-display.py data/packages/eps-indi-b-d3
```

Añadir `--verify` al segundo comando para contrastar los cuatro recursos versionados con el paquete local. La comprobación en el navegador se ejecuta con `node frontend/d3-case-smoke.mjs` una vez instaladas las dependencias y Chromium de Playwright.
