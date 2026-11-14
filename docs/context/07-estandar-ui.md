# 07 · Estándar de UI: formal, profesional y **cero "AI slop"**

**Regla absoluta:** está **prohibido** que la interfaz tenga aspecto de plantilla generada por IA ("AI slop"). Un PR de UI que viole esta página **no se mergea**, aunque funcione. Aplica a la app, las slides y cualquier imagen del pitch.

Por qué importa: la rúbrica puntúa directo la calidad visual (4.2: "estándar profesional") y la usabilidad para cualquier ciudadano (3.5). Además, un jurado reconoce al instante una interfaz genérica, y eso resta credibilidad a la ciencia.

## 1. Carácter de la interfaz

**Instrumento científico, no landing page.** La referencia es un software de observatorio o de laboratorio bien diseñado: sobrio, preciso, denso cuando hace falta y silencioso el resto del tiempo. **La imagen del cielo es la protagonista; la interfaz se aparta.**

- **Formal y moderna:** jerarquía tipográfica clara, alineación estricta a una rejilla, espacios consistentes, un solo color de acento.
- **Solo los controles necesarios.** Cada botón tiene que responder a una pregunta del usuario. Si no se usa en el flujo principal, va a la capa experta o no existe.
- **Divulgación progresiva:** Mirar → Comparar → Inspeccionar (ver `04-vision-ux.md`). La capa simple nunca muestra controles expertos.
- **Honestidad visual:** fecha, banda/λ y procedencia siempre a un vistazo. Semáforo Observado/Evaluado/Confirmado en cada afirmación.

## 2. Prohibido (lista de rechazo automático)

| Prohibido | Por qué |
| --- | --- |
| Gradientes morado/azul/rosa, "aurora" o malla de fondo | Firma número uno del slop |
| Glassmorphism, blur decorativo, brillos y neón | Ruido; baja el contraste en proyector |
| Héroe gigante con titular de marketing ("Unlock the universe…", "Explore the cosmos like never before") | Somos una herramienta, no una landing |
| Rejilla de tarjetas iguales con icono + título + texto | Plantilla genérica sin jerarquía |
| Emojis como iconos o en la UI | Informal |
| Sombras profundas, bordes muy redondeados (> 8 px), "pastillas" por todas partes | Look de kit genérico |
| Estrellas animadas de fondo, partículas, parallax decorativo | Compite con los datos reales y engaña: no son datos |
| Animaciones sin propósito (rebotes, aparecer al hacer scroll, spinners sin texto) | Distrae; ver §5 |
| Paletas arcoíris/jet en imágenes o gráficas | Falsean la lectura; inaccesibles |
| Gráficas 3D, de pastel o donas, sombras en gráficas, cuadrículas densas | "Chartjunk" |
| Textos de relleno, lorem ipsum, cifras inventadas, testimonios falsos | Viola la regla de datos reales |
| Tipografía por defecto sin decisión (Inter/Geist/Roboto "porque sí") | Señal de no diseño; ver §3 |
| Más de un color de acento; colores semánticos usados como decoración | Rompe la jerarquía |
| Modales de bienvenida o tours que bloquean | Ponen fricción antes del valor |
| Ilustraciones o imágenes generadas por IA que parezcan datos | Prohibido además por la regla de IA del evento |

## 3. Sistema visual (base; se fija en `DESIGN.md` con `impeccable document`)

- **Tipografía:** IBM Plex Sans para la interfaz, IBM Plex Mono para coordenadas, fechas, λ y lecturas numéricas. `font-variant-numeric: tabular-nums` en todo número. Escala de 4–5 tamaños, nada más.
- **Color:** neutros fríos (grises) para la interfaz y **un** acento para la acción o selección. Colores semánticos (aviso, error, éxito) solo con significado. La imagen astronómica usa su propia paleta (grises/cividis), independiente de la interfaz.
- **Tema:** oscuro por defecto (la imagen del cielo se lee mejor) **y** claro de alto contraste para el proyector, ambos probados.
- **Forma:** radios de 4–6 px; bordes de 1 px en lugar de sombras; elevación mínima.
- **Espaciado:** escala de 4 px. Densidad media: es una herramienta de trabajo.
- **Iconos:** Lucide, trazo uniforme, siempre con etiqueta o tooltip; nunca un icono solo para una acción crítica.
- **Tokens:** todo color, tamaño y radio sale de tokens (`@theme` de Tailwind). Prohibido el valor suelto en un componente.

## 4. Gráficas e imágenes científicas (nivel publicación)

- **Ejes siempre con unidad** (µm, mag, MJD/fecha, ″). Títulos que dicen qué se ve, no "Gráfica 1".
- **Incertidumbre visible:** barras de error cuando existan (VARIANCE). Sin error = decirlo.
- **Rango honesto:** no recortar ejes para exagerar cambios; si se usa escala log o asinh, se indica.
- **Mínima tinta:** sin fondos, sin sombras, cuadrícula tenue o ninguna, leyenda directa sobre la serie cuando se pueda.
- **Paletas:** grises con estiramiento asinh por defecto; cividis/viridis como opción. Diferencias con paleta divergente centrada en cero y su barra de color. Compuesto de épocas con pares seguros para daltonismo (magenta/verde o naranja/azul) y etiqueta "E1 / E3".
- **Píxeles reales:** zoom con vecino más cercano (`image-rendering: pixelated`); nunca suavizar ni "embellecer" datos.
- **Cada imagen o gráfica** muestra fuente (SPHEREx DR1 / IRSA), fecha y λ, y se puede exportar.
- **Herramienta:** Observable Plot (ver `06-stack-propuesto.md`).

## 5. Movimiento

Solo animación con propósito: el blink de las épocas (1–2 Hz, máx. 2,5 Hz; WCAG 2.3.1) y transiciones de 150–200 ms para cambios de estado. Respetar `prefers-reduced-motion` (vista estática por defecto). Pausa siempre visible (WCAG 2.2.2).

## 6. Estados obligatorios en toda pantalla

Vacío (con un ejemplo de un clic) · cargando (progreso honesto: "Buscando imágenes en IRSA… 3 de 6 épocas") · error (qué pasó y qué hacer; nunca un error técnico crudo) · sin datos para la región (explicarlo y sugerir otra) · éxito · **modo offline/demo** (indicado claramente).

## 7. Accesibilidad (WCAG 2.2 AA, no negociable)

Contraste ≥ 4,5:1 en texto · todo usable con teclado y foco visible · etiquetas en controles · región `aria-live` que describe el cambio medido · nunca solo color para comunicar · texto ≥ 16 px en la interfaz, ≥ 18 px en modo proyector.

## 8. Puerta de calidad para cada PR de UI (obligatoria)

1. `impeccable critique` y `impeccable audit` → sin hallazgos de prioridad alta.
2. `web-design-guidelines` → revisión de accesibilidad e interacción; `scientific-charts` si hay gráficas.
3. `playwright-cli` + `accessibility` → capturas de escritorio, móvil, tema claro/proyector y `prefers-reduced-motion`, más axe sin violaciones serias.
4. Lista de §2 revisada **a mano por un humano** sobre las capturas.
5. Si una pantalla "parece plantilla", se rehace aunque pase lo anterior.

## 9. Prueba de los 5 segundos (antes de la demo)

Mostrar la pantalla 5 s a alguien sin contexto y preguntar: ¿qué hace esta herramienta?, ¿qué tocarías primero?, ¿parece profesional o hecha con IA? Si dudan en cualquiera, se simplifica.
