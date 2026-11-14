# Revisión diferencial HiPS

Alcance: diff sin commit, con atención a llamadas externas, límites y validación. El adaptador HiPS tiene un único punto de composición (`api/app.py`); la selección de fuente se usa desde el motor compartido por ambos visores. La búsqueda se usa desde el cuadro integrado. El código previo de la petición directa se introdujo en `9555d79`.

- El semáforo limita por proceso las llamadas HiPS, no por despliegue: varias réplicas multiplican el límite. El rango de configuración es 1–32; las rutas y coordenadas siguen validadas por el dominio.
- Los reintentos de backend conservan el validador PNG y solo se cachean respuestas válidas. MockTransport cubre dos 503 seguidos de éxito, caché y máximo de concurrencia.
- La comprobación de salud trata 502/504 como proxy inaccesible; una pasarela que emita esos códigos por otra causa también activará el acceso directo.
- El caso SIN imposible se limita horizontalmente; la convergencia completa cerca de polos y el fallo intermitente observado en AIT no están demostrados para todo el dominio. La semilla fija y 20 ejecuciones no prueban ausencia de otros casos.
- La prueba en vivo usa IRSA real, no demuestra todos los patrones de error ni sustituye una revisión independiente de código y ciencia. No se ejecutó una auditoría de seguridad completa.
