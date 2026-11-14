# Revisión del cambio

- Alcance: motor nuevo, adaptadores de IRSA/proxy, validación de estado URL, renderizador y controles. No se cambiaron backend ni contratos.
- Fronteras revisadas: las coordenadas de URL y los identificadores de tesela se validan; imágenes de la red deben medir 512×512; hay cancelación, límite de 16 peticiones simultáneas y máximo configurable de 256 bitmaps/texturas. El visor no interpreta valores físicos del PNG.
- Riesgos abiertos: la selección visible por muestreo no es una prueba de intersección exhaustiva; la orientación no se ha contrastado con WCS en todas las caras; el registro de estrategias todavía no controla el shader y agregar una proyección requiere modificarlo; SIN cambia a AIT sobre 180° y se informa en pantalla. No se ha demostrado paridad con IRSA ni probado la recuperación de contexto, la accesibilidad completa o el pellizco en dispositivo real.
- Cobertura: un millón de posiciones y todos los centros y vecinos de orden 5 contrastados con Astropy; diez conjuntos de esquinas; pruebas de proyecciones y navegador. Faltan esquinas y vecinos exhaustivos en todos los órdenes y pruebas de red caída/404 y desalojo en WebGL.
- Revisión efectuada sobre el cambio nuevo, sin revisión independiente ni auditoría de dependencias completa.
