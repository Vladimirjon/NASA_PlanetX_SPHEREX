# Plan de trabajo — validación científica y vista local

- Responsable: Sebastián. Alcance solicitado: implementar los controles documentados, entregar una vista local explicativa y publicar el trabajo en `scientific-rules`.
- Base: fichas 0030–0032; `Observation` y `AnalysisResult` de 0001/0010. Esta entrega no modifica los contratos de Johann ni implementa las mediciones de Mateo.
- Lógica: funciones Python sin red que reciben evidencias explícitas, calculan la razón espectral y las pruebas estadísticas, y producen `pass`, `fail` o `unknown` con motivos. Sin tolerancias por defecto ni asignación automática de confirmado.
- Vista: página estática local con ejemplos reales de IRSA, claramente rotulados como exploratorios, enlaces a datos y explicación de controles. No sustituye la interfaz de Daniel ni constituye un producto científico evaluado.
- Secuencia: pruebas de entradas ausentes y límites → cálculos y agregación → generación reproducible de informes → página → prueba del servidor y captura → commit/push.
- Verificar, en particular: valores no finitos o inválidos; mismo archivo/adquisición; escala temporal ausente; filtros provisionales aplicados solo al caso correcto; comprobaciones `unknown` impiden autorización; umbral estadístico 2D correcto y covarianza positiva.
- Extensión solicitada: listas separadas para posición y brillo con motivos y evidencias; probar duplicados, fechas repetidas, faltantes y desplazamientos sintéticos; registrar el estado real sin convertir preselección en evaluación. Mantener contratos compartidos sin cambios y no fijar tolerancias sin validación.
