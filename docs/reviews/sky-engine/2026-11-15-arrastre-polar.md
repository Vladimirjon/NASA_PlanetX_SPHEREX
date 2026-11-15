# Revisión del arrastre polar

La primera protección detectaba saltos del centro, pero no grandes giros de RA cerca del polo. La nueva regresión reprodujo 87,4° de giro en un píxel.

Para campos ≥90° el arrastre conserva el norte arriba con movimientos angulares acotados y un límite de declinación de ±89,9°. No atraviesa el polo: la cámara actual no tiene rotación de roll. En campos pequeños se conserva el anclaje, con rechazo de soluciones discontinuas. El zoom alejado cerca del polo mantiene el centro.

Verificación: 175 pruebas aprobadas; lint y build Copernix con salida 0. Persisten tres avisos de fuentes resueltas en ejecución. Navegador con SwiftShader: zoom hasta FOV 180° desde Dec 89°, arrastre de 100 px, RA 10°→38,125°, Dec 89°→89,9°, sin inversión brusca. Captura: `2026-11-15-polo-estable.png`. Falta probar la GPU del usuario.
