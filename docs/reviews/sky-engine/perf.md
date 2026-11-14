# Rendimiento del visor

- Entorno: Chromium headless, SwiftShader, 1280×800, red real IRSA; no representa GPU integrada.
- Primer píxel no negro, carga fría: 2778 ms.
- Doce respuestas de orden 0 y dos cuadros posteriores: 2802 ms en frío, 287 ms tras recarga con caché. No verifica que cada imagen tenga datos no negros.
- Intervalo p95 de cuadros durante arrastre: 16.70 ms (59.9 fps equivalentes).
- Peticiones HiPS entre tres vistas y una recarga: 61; repetidas durante arrastre y zoom de una sesión: 0.
- Errores de consola: 0.
- Falta medir cuadro completo en laptop con GPU integrada y verificar calidad visual de todas las teselas.
