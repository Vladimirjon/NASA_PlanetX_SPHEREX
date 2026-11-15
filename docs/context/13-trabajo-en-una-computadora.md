# Datos, mediciones y ciencia en una computadora

Guía operativa para **Johann, Mateo y Sebastián** y sus agentes. La interfaz y UX están fuera de esta coordinación. `AGENTS.md`, los contratos y `docs/STATE.md` siguen siendo la referencia; consultar también la ficha aprobada y el responsable antes de implementar un módulo. Este documento no aprueba contratos, cambia estados científicos ni integra PR por sí solo.

## Inicio: una carpeta compartida

1. Abrir **la misma carpeta del repositorio** en las terminales o agentes. Cada sesión debe leer `AGENTS.md`, `docs/STATE.md` y esta guía. No se necesitan cuentas distintas para compartir archivos locales; cada herramienta usa las credenciales y permisos de su propio usuario, sin copiarlos al repositorio.
2. Antes de cada tarea, desde la raíz, comprobar rama, modificaciones y última versión remota:

   ```text
   git status --short --branch
   git worktree list
   git fetch origin --prune
   git log -1 --oneline origin/main
   ```

   No cambiar de rama si hay cambios sin revisar ni usar `git reset`, `git clean` o borrar worktrees ajenos. La sesión actual trabaja en `scientific-rules`; actualizarla desde `origin/main` solo si la integración es segura, conservando cambios y resolviendo conflictos. El `main` local puede estar desactualizado.
3. **Por defecto, un solo agente escribe a la vez** en la carpeta compartida. Los demás pueden leer y preparar revisiones; el coordinador registra quién edita qué y cuándo termina. Nunca hacer `checkout` mientras otro agente trabaja allí.
4. Si se necesita **escritura simultánea**, respetar `AGENTS.md` §10: una rama y un worktree distinto por agente, con archivos asignados sin solapamiento. La persona integradora revisa los cambios y los reúne en la rama acordada; no se crean ni borran worktrees automáticamente. Los datos ignorados por Git no aparecen automáticamente en otros worktrees.
5. El coordinador es el único escritor de `docs/STATE.md` y `docs/AI_USAGE.md` al cerrar cada turno. Los demás entregan notas con rutas, commit, comandos y bloqueos; no duplican ni pisan esas líneas. Los contratos compartidos los cambia su responsable coordinando antes con los consumidores.

## Mapa de trabajo y entrega

| Área | Responsable | Dónde empezar | Qué deja al siguiente |
| --- | --- | --- | --- |
| Datos y procedencia | Johann | `contracts/`, `scripts/check_contracts.py`; paquete del par en PR #12 | Originales, recortes nativos, WCS, FLAGS, VARIANCE, calibración y manifiesto verificable; ruta local y versión exactas. |
| Mediciones | Mateo | `backend/src/skyshift/domain/measurement/`, `backend/src/skyshift/application/measure_target.py`, `docs/reviews/measurement/` | Posiciones y errores de cada fecha, máscaras en el centro medido, controles del campo y pruebas reproducibles; no asigna «evaluado». |
| Reglas científicas | Sebastián | `science/`, `docs/specs/0030`–`0039` | Interpretación, motivos y controles pendientes o satisfechos, con evidencia y límites; semáforo según `AGENTS.md`. |

La API realmente implementada se consulta en `contracts/openapi.yaml`; los esquemas de `Observation`, manifiesto y `AnalysisResult` deben leerse con su versión y estado documentados, sin tratarlos como una API que no existe. Cualquier extensión de API sigue la regla de contrato primero. No editar `frontend/`, `science_preview/` ni archivos UX como parte de este flujo; si se necesita un cambio, registrarlo para su dueño.

## Caso inicial compartido: ε Indi B D3

El caso acordado es `eps-indi-b-d3-pair`, región `eps-indi-b-d3-cutout-box` revisión 1: DR1 `2025W24_1A_0245_4D3` y QR3 `2026W40_1A_0070_2D3`. La serie D2 de la demo es otro conjunto. El par sigue como **candidato**, no evaluado: ver [0036](../specs/0036-revision-par-epsilon-indi-b.md) y [0037](../specs/0037-respuesta-paquete-epsilon-indi-b.md).

El paquete de Johann se propuso en [PR #12](https://github.com/Vladimirjon/NASA_PlanetX_SPHEREX/pull/12). **Comprobar si ya se integró** antes de usar `scripts/build-validation-package.py`; en la última revisión de esta guía estaba en su rama, no en `origin/main`. Una vez disponible, seguir `data/packages/eps-indi-b-d3/README.md` para regenerar y verificar: generar necesita red; `--verify` comprueba la copia local. No sustituir un archivo real con datos de prueba.

Los FITS, `data/raw/`, `data/derived/` y `.cache/` están ignorados en Git. En una sola carpeta los tres roles pueden leer la misma copia local; comunicar ruta absoluta, identificadores, versión y huellas del manifiesto. En worktrees separados, usar una ruta local explícita para leer la misma copia o regenerarla; no asumir que Git transporta FITS. Evitar que dos procesos escriban el mismo paquete o caché simultáneamente. Los datos originales son de solo lectura durante el análisis; las salidas regenerables van a una carpeta propia ignorada por Git.

Para la calibración de cada medición usar el píxel nativo de la fuente en esa época y su `CWAVE`/`CBAND` vinculados, no el centro del recorte como si fuera la fuente. Documentar posición, origen, redondeo y versión. El filtro espectral provisional no demuestra compatibilidad científica ni es un criterio universal.

## Comandos seguros de trabajo local

Estos comandos funcionan desde la raíz en Fedora y Windows con las herramientas instaladas según [entorno](08-entorno-y-comandos.md). `mise run setup` sincroniza skills; **no instala por sí solo todas las dependencias del backend**. `uv run --locked` prepara el entorno fijado cuando es necesario.

```text
mise run check-contracts
mise run api-test
mise run api-lint
uv run --no-project python -m unittest tests.test_science_validation tests.test_science_checklists
```

Los tests científicos anteriores prueban el prototipo y no validan el cielo. Para una ejecución de mediciones sin escribir en la interfaz, Mateo puede usar la CLI existente; consulta IRSA/S3 y crea o sobrescribe **ambas salidas locales** indicadas:

```text
uv run --locked --directory backend python -m skyshift.api.measure_cli --out ../data/derived/epsilon-indi-b/analysis-result.json --checklist-out ../data/derived/epsilon-indi-b/checklist-evidence.json --detector 3
```

La CLI crea el directorio padre. Antes de ejecutarla, conservar cualquier salida local que se quiera mantener y confirmar que no hay otra ejecución escribiendo allí. La salida es reproducible con sus fuentes y configuración, pero no es automáticamente un caso aprobado. **No usar `mise run measure-epsindb` para este trabajo:** la tarea actual escribe en `frontend/public/demo/`. `python -m science.checklists` también sobrescribe el archivo rastreado `science/real-checklists.json`; solo lo ejecuta su responsable cuando corresponda. La vista previa tiene su propio archivo generado y queda fuera de esta tarea.

## Tablero inicial para los agentes

| Orden | Tarea concreta | Estado al 14-nov | Dependencia o evidencia |
| --- | --- | --- | --- |
| 1 | Johann: verificar disponibilidad del paquete D3 y localizar manifiesto y FITS en esta computadora. | PR #12; verificar estado actual. | Archivos reales, huellas, cajas nativas y calibración; no copiar binarios a Git. |
| 2 | Mateo: revisar FLAGS alrededor del centroide medido, residuos de estrellas para A/B y correlaciones; probar recuperación con fuentes sintéticas etiquetadas. | Evidencia en `feat/measurement-pair-controls` (`c643009`); revisión científica e integración pendientes. | Paquete o datos equivalentes trazables; método y resultados por época. |
| 3 | Sebastián: revisar la evidencia de cada control y documentar razones, incertidumbre y límites. | Pendiente. | Ficha 0036; no aprobar un control por existir el paquete o pasar Q. |
| 4 | Sebastián: corregir y probar la inconsistencia del prototipo que puede dar `eligible_for_method` en una prueba sintética de brillo con filtro espectral fallido. | Pendiente; no usar el prototipo como puerta automática de producción. | Reproducir con pruebas negativas; separar controles de movimiento y brillo; revisar con Mateo antes de integrar. |
| 5 | Coordinador: comprobar tests y contratos aplicables, actualizar estado/uso de IA y preparar PR a `main`. | Por cada entrega. | Un commit identificable, resultados reales de verificación y revisión humana; nunca push directo a `main`. |

Para cada tarea, el agente recibe: responsable, objetivo, archivos permitidos, ficha aplicable, entradas/versiones, salidas, pruebas y qué no debe tocar. Al terminar, anota qué hizo, qué verificó y qué falta. Datos faltantes o no comprobados se mantienen pendientes; el software nunca asigna «confirmado».
