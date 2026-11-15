# 0008 · Restaurar la landing original con renderizado acotado

- Fecha: 2026-11-14.
- Estado: implementado por instrucción explícita de Daniel.
- Sustituye la dirección visual del ADR 0007.

El rediseño fue rechazado. Se restaura el HTML, textos, paleta, imágenes y sistema de escenas originales, con dos cambios de estabilidad: satélite prerenderizado por CPU en lugar de WebGL y eliminación del blur del compositor. Se acotan resolución, memoria y frecuencia de render, con suspensión al ocultar la pestaña. No se cambia el visor científico ni el controlador del sistema.

La rotación horizontal cubre 360°; la inclinación se ofrece en cinco niveles. Detalles y evidencia: docs/landing/2026-11-14-restored.md.
