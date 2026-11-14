# Rendimiento del visor · revisión 1

- Chromium con --use-angle=gl --enable-gpu --ignore-gpu-blocklist: ANGLE (AMD, AMD Radeon 780M Graphics (radeonsi phoenix ACO), OpenGL ES 3.2). Ventana 1280×800; red real IRSA.
- Fotograma con red sin peticiones activas durante 600 ms y dos cuadros posteriores: frío 4286 ms; caliente 737 ms.
- Arrastre circular de 5 s y zoom: intervalo p95 16.70 ms; 31 peticiones, 0 URL repetidas, 0 peticiones abortadas.
- Errores de consola: 0. La medición no incluye el escenario de dos minutos ni calcula el porcentaje de abortos.
