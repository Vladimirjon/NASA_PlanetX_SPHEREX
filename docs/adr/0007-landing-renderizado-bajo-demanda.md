# 0007 · Landing de pitch con renderizado bajo demanda

- Fecha: 2026-11-14.
- Estado: implementado por solicitud de Daniel; revisión visual humana pendiente.
- Alcance: landing de presentación, sin cambiar la arquitectura del visor científico.

## Contexto

Daniel pidió un acabado más premium e hiperrealista y corregir el congelamiento completo del PC. El journal del arranque anterior registra `GPU HANG` de Intel i915 dentro de Chrome, timeouts del compositor y `Failed to reset chip`. Esto confirma un bloqueo gráfico del sistema; no permite atribuir inequívocamente el fallo a una llamada concreta de esta página.

La landing anterior iniciaba un WebGLRenderer con `powerPreference: high-performance`, generaba un entorno PMREM, mantenía un requestAnimationFrame permanente, repintaba nubes y estrellas y aplicaba blur de fondo a paneles sobre esa escena.

## Decisión

1. Sustituir la escena 3D activa por una ilustración oficial prerenderizada de SPHEREx, con procedencia visible.
2. Usar dos imágenes conceptuales nuevas generadas con IA y marca de agua, optimizadas en WebP. No son observaciones ni evidencia sobre Planet X.
3. Eliminar importaciones de Three.js, fondo animado y backdrop-filter. Conservar los recursos anteriores en el repo, fuera del grafo de carga y del paquete estático.
4. Renderizar únicamente al interactuar. La reproducción explícita del ejemplo se limita a 20 fps y se pausa al ocultar la pestaña o abandonar la sección. Cada canvas explicativo queda limitado a ~0,9 MP.
5. Conservar ES/EN, la paleta azul y las secciones de contenido; adoptar composición editorial, navegación legible y vista clara para proyector. Los CTA abren la demo disponible; el visor real continúa pendiente.

La solicitud humana de una landing cinematográfica autoriza la composición de presentación. La norma del instrumento científico sigue aplicándose al futuro visor; no se cambian sus contratos ni su semáforo de interpretación.

## Consecuencias y verificación

La landing no requiere WebGL ni video automático. La interactividad explicativa sigue disponible con teclado. El realismo se descarga como imágenes pequeñas, no se calcula cada fotograma.

El cambio mitiga las rutas costosas de la página; no repara el driver i915. Las pruebas de navegador usan `--disable-gpu --disable-webgl --disable-accelerated-2d-canvas` para no provocar de nuevo el cuelgue. Resultados y capturas: `docs/landing/2026-11-14-stability.md`.
