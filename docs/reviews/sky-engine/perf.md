# Rendimiento del visor · revisión 3 (navegación)

- Chromium con --use-angle=gl --enable-gpu --ignore-gpu-blocklist: ANGLE (AMD, AMD Radeon 780M Graphics (radeonsi phoenix ACO), OpenGL ES 3.2). Ventana 1280×800; red real IRSA.
- Fotograma con red sin peticiones activas durante 600 ms y dos cuadros posteriores: frío 3196 ms; caliente 729 ms.
- Arrastre circular de 5 s y zoom: intervalo p95 16.80 ms; 39 peticiones, 0 URL repetidas, 0 peticiones abortadas.
- Errores de consola: 0. SIN ya no cambia a AIT; el FOV se acota por proyección.
