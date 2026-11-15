# Preguntas probables del jurado y respuestas con datos verificados

Cada juez es especialista de un área (RCD, IET, IR, STP) y lidera sus preguntas. Las cifras salen de `frontend/public/demo/epsilon-indi-b/analysis-result.json` y del repo; lo que no esté verificado se dice como tal.

## RCD · Rigor científico
- **¿Cómo saben que el objeto se movió y no es un artefacto?** Cuatro pasadas (76 exposiciones usadas de 99 medidas; 23 descartadas por píxeles malos o por quedar fuera del campo), centroide gaussiano y ajuste de movimiento propio. El desplazamiento medido es 6,55″ en 517 días (≈ 4,6″ al año); el estadístico χ² = 5651 con 2 grados de libertad supera el umbral 28,7. Aun así lo llamamos **Observado**: falta verificación independiente.
- **¿Por qué no dicen «Confirmado»?** Porque el contraste con Gaia no es independiente (la calibración de coordenadas de SPHEREx usa Gaia, y la paralaje catalogada corrige las posiciones). Lo declaramos en el panel de detalles. El software nunca asigna «Confirmado»; es una decisión de proyecto (`AGENTS.md`).
- **¿Qué incertidumbre tiene?** El residuo del ajuste es 0,29″ y la incertidumbre de coordenadas por eje es ≈ 0,3″ (piso provisional) frente a 6,15″ por píxel de SPHEREx.
- **¿De dónde vienen los datos?** SPHEREx DR1/QR3 vía IRSA (NASA/IPAC), posiciones y movimientos propios de Gaia DR3 y Luhman & Esplin 2016 para WISE 0855 `[VERIFICAR la referencia exacta antes de citarla en voz alta]`.
- **¿Encontraron Planet X?** No, y no lo afirmamos: construimos la herramienta para que cualquiera compare imágenes y vea qué cambió.

## IET · Técnica
- **Arquitectura:** motor de cielo WebGL2 sobre teselas HiPS/HEALPix; API FastAPI hexagonal con contrato OpenAPI («contrato primero») y caché en capas; visor React con la interfaz de Copernix; búsqueda local-first más CDS Sesame.
- **¿Qué es propio y qué es de terceros?** Propios: motor, API, visor, pipeline de recortes y medición. De terceros: datos (NASA/IRSA, Gaia), modelo 3D (NASA's Eyes), librerías de código abierto, y la ayuda de IA declarada.
- **¿Funciona sin red?** Sí para los cinco objetos: hay un modo sin conexión con datos grabados (demo).
- **¿Reproducible?** Herramientas y dependencias fijadas (`mise`, lockfiles), pruebas automáticas del frontend (~140) y del backend, revisión de solapes de interfaz en 6 tamaños de pantalla.

## IR · Impacto
- **¿Para quién es?** Para cualquier persona sin conocimientos de astronomía: frases simples, ayudas, guía de 3 pasos, ES/EN. Para el experto: procedencia, estadística y medición.
- **¿Y después del hackathon?** Catálogo abierto (hoy ~150 objetos populares y cualquier nombre vía Sesame), más estrellas con movimiento propio alto, brillo (variables) como segunda entrega, y validación independiente de los resultados con el rol de ciencia. `[Ajustar a lo que el equipo decida contar]`

## STP · Presentación
- **Hilo:** *El cielo nunca es el mismo dos veces* → elige un punto → mira qué cambió → cómo lo comprobamos → qué sigue.
- **Demo de 90 s:** landing → «Explorar el cielo» → Epsilon Indi B → flechas ‹ › → «Solo lo que cambió» → «Detalles y procedencia».
- **Q&A:** reparto sugerido: ciencia → quien midió/validó; técnica → quien construyó API y motor; impacto y producto → quien presenta; todos conocen el semáforo.
