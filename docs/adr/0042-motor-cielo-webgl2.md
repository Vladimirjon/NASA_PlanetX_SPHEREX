# 0007 · Motor de cielo WebGL2

- Estado: navegación ronda 3 (proyección fija, arrastre con punto bajo el puntero, zoom anclado, flyTo, inercia).
- Contexto: la ficha 0003 requiere HiPS SPHEREx DR1 sin código de Aladin y con una fuente intercambiable.
- Decisión: TypeScript sin dependencias de ejecución en el motor; núcleo funcional, puertos y adaptadores; React solo presenta. Texturas WebGL2 R8 indexadas por HEALPix NESTED con padres mientras faltan hijos. IRSA/proxy implementan el puerto cancelable.
- Navegación (ronda 3):
  - La proyección **no cambia sola**. SIN es un globo ortográfico: FOV máximo 180° (un hemisferio en disco; fuera del disco = fondo). TAN máx. ~90°. AIT solo si el usuario la elige (hasta 360°).
  - Arrastre = rotación celeste que mantiene el punto del cielo bajo el puntero (`keepPointUnder`, Newton en RA/Dec con semilla de rotación 3D; sin deltas RA/Dec ni gimbal en polos). Norte arriba se conserva como convención de la cámara.
  - Zoom de rueda/pellizco anclado al cursor, amortiguado exponencial independiente del frame rate; `+`/`−` al centro. Inercia ~300 ms tras soltar; desactivada con `prefers-reduced-motion`.
  - API pública: `flyTo({ ra, dec, fov }, { durationMs })` → Promise al llegar; slerp del centro + FOV en log; cancelable por entrada del usuario; emite `viewchange`. Compatible con `setView` / `zoomBy` previos.
- Extensión: nueva fuente vía `TileSource`; proyecciones vía registro (shader aún con ramas explícitas SIN/TAN/AIT).
- Consecuencias y límites: fixtures Astropy para HEALPix/proyecciones; orientación este-izquierda contrastada. Faltan intersección exhaustiva de celdas, cobertura completa de esquinas en todos los órdenes y prueba de pellizco en dispositivo real. Memoria PNG de sesión sin tope. Métricas: `docs/reviews/sky-engine/perf.md`.
