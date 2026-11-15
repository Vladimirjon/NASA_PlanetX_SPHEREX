
# Handoff — presentación del pitch (Na za)

Sábado 14 de noviembre de 2026, noche (actualizado el 15-nov con el guion nuevo: `docs/pitch/guion-es.md`). Quien continúe: lee esto entero antes de tocar nada. La presentación vive en un Artifact, no en este repo.

## 1. Dónde está todo

- **Presentación en español (7 diapositivas):** https://claude.ai/artifact/5zGWJt4cUbCtF84yAWmabP (privada, solo el dueño; versión 18 al cerrar esta sesión). Tipo «Slides». Contiene el guion de voz y las notas del equipo en las notas del orador de cada diapositiva.
- **Antes de editar:** vuelve a leer el Artifact (`Artifact` acción `read`, rutas `project/deck.json`, `project/deck.css`, `project/slides/<id>.html`). La persona puede haber editado en el visor; una publicación sobre un cambio no leído se rechaza.
- **Copia local de trabajo (se pierde al limpiar el scratchpad de la sesión):** carpeta `artifact-files/<id>/project/` con `deck.json`, `deck.css` y `slides/`, y un script de previsualización con Edge sin interfaz. Si no existe, se reconstruye leyendo el Artifact. **Capturas reales de la app (sin versionar):** `docs/pitch/capturas/`; `api-fotos-4.png` es la de la diapositiva 5 y las demás (diferencia, fechas en color, «Detalles y procedencia») sirven de respaldo para el Q&A.
- **Contexto del repo que respalda las cifras:** `docs/context/01-reto-y-jurado.md` (rúbrica y penalizaciones), `docs/context/03-datos-y-apis.md` (cifras medidas), `docs/fuentes/guia-participantes-y-rubrica-sangolqui-2026.pdf`.
- **Registro de IA:** `docs/AI_USAGE.md`, con la línea del guion y las diapositivas ya añadida (14-nov noche). El logotipo y el icono de Copernix los generó ChatGPT Images (declarado ahí y en la última diapositiva).
- **Guion hablado (fuente de las notas del orador):** `docs/pitch/guion-es.md`, con tiempos, demo paso a paso, cortes para 5 minutos, lista previa y respuestas cortas para el Q&A.

## 2. Qué hay hecho

Siete diapositivas en español (versión 38+), en tres actos: gancho y problema (1–3), Copernix y **demo en vivo con R Draconis** (4, desde la página pública `copernix.vercel.app`), y lo que se vio y lo que falta (5–7). Acento ámbar `#F2B13C` (`--mark`).

| # | Id | Contenido en pantalla |
| - | -- | --------------------- |
| 1 | `c1930` | «1930», dos puntos que parpadean (tu versión; solo cambié el color) |
| 2 | `datos` | Mapa de SPHEREx; «102 bandas. Todo el cielo.»; «Luz infrarroja que no vemos, de 0,75 a 5 micras.» |
| 3 | `problema` | «Cada foto pesa 66 MB. Lo que cambia puede ocupar un píxel.» y «¿Quién puede ver un cambio así?» |
| 4 | `revela` | Wordmark de Copernix, «El cielo nunca es el mismo dos veces.» y el enlace `copernix.vercel.app` (aquí se pasa a la página y a la demo) |
| 5 | `rdra` | «R Draconis, un año después.»: dos fotos reales (7 jul 2025 y 14 jul 2026) y tres líneas |
| 6 | `sigue` | «Falta medirlo.»: medir R Draconis con su centro saturado, revisión independiente de lo Observado y colegios de Ecuador |
| 7 | `cierre` | Plutón, «Elige un punto del cielo.», wordmark abajo a la izquierda, enlace a la demo y créditos |

Se eliminaron las diapositivas `demo`, `metodo`, `como` y `creer`. El guion hablado, con tiempos y demo paso a paso, está en `docs/pitch/guion-es.md`.

## 3. Sistema visual (no lo cambies sin motivo)

- **Fondo:** negro neutro `#090909`, igualado al negro de las fotos de NASA (la diapositiva 2 usa `#000` porque la foto es negro puro).
- **Colores (en `:root` de `deck.css`):** tinta `#F3EBDD`, secundario cálido `#CFC5B3`, secundario frío `#8C96A3` y `#AEB6C1`, y **ámbar `#F2B13C` = lo que cambió** (variable `--mark`, se cambia en una línea). Se retiró el cian `#6FD0E6` y el naranja del dato infrarrojo (el usuario los rechazó el 15-nov).
- **Tipografías (Google Fonts, en `deck.json` › `faces`):** Archivo variable con eje de ancho (titulares: `font-stretch:125%`, peso 200) y Spectral cursiva (la voz humana, créditos, descripciones).
- **Fotos subidas al Artifact** (se usan como `src="/_blob/<id>"`):
  - `32280591b844b99a99cf5f1ed32adf9c` mapa SPHEREx completo, 4160×2340 (PIA26600, NASA/JPL-Caltech).
  - `6e1baec4691f2ac9dcc4696cbbf3c193` recorte del centro del mapa, 2400×1350.
  - `378c51d2530e7f5bfbd14396d6e66cdd` Plutón en color real, 1920×1080 (PIA19857, NASA/Johns Hopkins APL/SwRI).
  - `685f0bb7ba7a8bfcaff935ea51fa1154` wordmark de Copernix ampliado 3× y afilado desde `landing/assets/copernix-wordmark.webp` (blanco sobre transparente; logo generado con IA).
  - `c2baa96d0ba0c5ef192a4d63b6f54781` wordmark original (sin usar). `e0d533c226f701f6e2186e7b43d66548` icono de Copernix (`frontend/copernix/public/favicon-192.png`).
  - `9ab06009315116d820f65bfb8edae83d` captura 1920×1080 de Copernix con Epsilon Indi B (`docs/pitch/capturas/api-fotos-4.png`).
- **Dirección de diseño guardada** (en la carpeta del scratchpad, no en el repo): `PRODUCT.md` y `.impeccable/surfaces/project-deck-json.md`. Resumen: el cielo como un video que se puede recorrer; la imagen o la frase manda; una sola marca cian sigue lo que cambió.

## 4. Lo que el usuario rechazó (no lo repitas)

- Cajas, tarjetas, marcos, píldoras, tablas y números sueltos con etiqueta. Tampoco numeraciones «01 02 03», ni texto pequeño encima de un título.
- Frases de IA o infantiles: «puerta con candado», «darle play al cielo», «da pena explicarla», «puntito», «una y otra», «real pixels», «nothing invented», «cada foto es real».
- Personajes en el discurso: niño, profesora, curioso. También «X horas → Y segundos» y «N de M personas».
- «Solo para especialistas» en la diapositiva 3, «De los archivos de NASA a un servidor ligero…» en la 6, «En vivo», «WISE 0855», «datos reales de SPHEREx», «[nombre — rol] × 5» y «Gracias».
- Explicar cómo está construido en lugar de qué resuelve. Solo una frase de método en la 6.
- Fraunces, DM Sans, Cormorant, Inter y similares (valores por defecto de la IA).
- Imágenes generadas con IA, logos de NASA y las placas reales de Tombaugh (el Observatorio Lowell exige permiso escrito).
- (15-nov) Frases que «no pegan» o son palabras vacías: «Cada seis meses, el cielo entero otra vez», «El cielo, como un video», «Eliges un punto del cielo. Ves sus fotos reales, una tras otra…», «Mira arriba», «Ya no hace falta ser científico para ir a averiguarlo». El bloque «Antes de cada imagen» con cuatro pasos y el semáforo juntos tampoco: se dividió en dos diapositivas. El nombre y el logo no van centrados ni perdidos: el wordmark va grande y anclado al margen.

## 5. Reglas del evento que condicionan esto

- **Máximo 7 diapositivas** por archivo (8 o más: −1 punto). Entrega en **PDF**, presentando desde el Artifact.
- **Dos versiones, español e inglés** (−1 punto si falta una). La exposición en vivo es en español.
- **Citar y enlazar datos NASA** (−2), repo público con licencia MIT (−2), enlaces públicos abiertos en incógnito (−1), IA declarada y sin logos NASA (−1).
- **Rúbrica local:** rigor y datos, innovación y ejecución, impacto y relevancia, storytelling y presentación, de 1 a 5. Lo evalúa un jurado de cuatro; el global solo ve el PDF, sin voz, así que **cada diapositiva debe entenderse sola**.
- La duración del pitch y del Q&A **no está confirmada**; preguntar a los mentores del bloque 4. El guion dura unos 4:30.

## 6. Pendiente, en orden

0. **B valida los datos históricos del guion** antes de decirlos: Tombaugh con 24 años, hijo de granjeros, en el Observatorio Lowell (Arizona) y buscando el Planeta X; y que Plutón aparece en placas anteriores a 1930 (se cita 1915).
1. **Revisar en el visor** (el equipo): animaciones y detalles que el usuario dijo que faltan, sobre todo el parpadeo de la 1, las transiciones `magic` 1→2 y 5→6, la barra de la 4 y el parpadeo del ámbar en la 1 y la aparición de los tres recortes de la 5. La previsualización local solo muestra el estado final.
2. **Corregir la app antes de la demo (Daniel/Dax):** el panel «¿Qué cambió?» (`frontend/copernix/src/explain-i18n.ts:148-178`) sigue diciendo «se desplazó ≈ 5,0″» en WISE 0855 o «su brillo cambia» en RW Aurigae y R Draconis, y eso no está medido (`docs/reviews/regions/2026-11-14-cinco-regiones.md`). **La demo y la diapositiva 5 usan solo Epsilon Indi B.** Además, en español el panel de detalles y un aviso de carga salen en inglés.
3. **Cifra de Epsilon Indi B (Sebastián):** 6,6″ (ajuste de 4 pasadas, la que muestra la app y la ficha) o 6,05″ (par D3). Hoy el pitch usa 6,6″; si cambia, actualizar diapositivas 3 y 5, ficha y visor a la vez.
4. **Versión en inglés:** segundo Artifact con la misma estructura (−1 punto si falta). Reutilizar las fotos y los logos con `files` de este artifact.
5. **Exportar a PDF** ambas versiones (Compartir › Exportar) y comprobar que el estado final de cada diapositiva se ve completo y que las fuentes cargan.
6. **Demo pública:** sustituir el enlace del repo por la URL de la demo cuando exista (`[URL DEMO]`).
7. **B valida:** que Tombaugh buscaba el Planeta X; que el método de la 6 coincide con lo construido; y la frase «el mismo color de luz» (la app compara λ parecida, `CWAVE`/`CBAND`). Ya no hay paso «Predecir con Gaia»: Gaia solo da la referencia de la medición de Epsilon Indi B y no es independiente.
8. **Ensayo cronometrado** y video de respaldo de la demo (el Plan B está en las notas de la 5).
9. **Duración del pitch y del Q&A:** sin confirmar; preguntar a los mentores. El guion dura unos 4:30.
## 7. Cómo se verificó el diseño (y cómo repetirlo)

El visor del Artifact exige sesión de Claude, y el navegador integrado no la tiene. Se previsualiza así:

1. Leer los archivos del Artifact a una carpeta local `pitch-es/project/`.
2. Generar `preview.html` con un script que concatena las diapositivas, antepone `deck.css`, reemplaza `/_blob/<id>` por la ruta local de cada JPG, quita las `<aside>`, y añade `z-index:-1` a las clases de elementos fijados antes del primer elemento de flujo (`.bg,.core3,.core4,.pluto,.scrim2,.scrim3,.scrim4,.grain,.st,.st2,.dotA,.dotB,.bar,.barfill,.head,.rule,.nd,.lab`) para imitar el orden de pintado del visor.
3. Partir en una página por diapositiva y capturar con Edge sin interfaz: `msedge.exe --headless=new --window-size=1920,1080 --virtual-time-budget=9000 --screenshot=out.png file:///…/sN.html`. Con `animation:none` se ve el estado final.

Límite: la captura muestra el estado final, no el movimiento.

## 8. Peculiaridades del formato Slides (para no repetir errores)

- Lienzo fijo 1920×1080; texto mínimo 24 px; sin scripts fuera de `<x-embed>`.
- `transform-origin` se ignora en reposo: para llenar una barra, deslizar un hijo dentro de un contenedor con `overflow:hidden`.
- Animar solo `opacity`, `transform`, color y sombras (no tamaño ni posición). El estado final es la regla normal y el inicio va en `@keyframes`.
- El orden de pintado es el del código; los elementos fijados van antes del primer elemento de flujo.
- Las transiciones `magic` necesitan el mismo `id` en un elemento fijado de ambas diapositivas; solo hay un `id="mark"` por diapositiva.
- Publicar: mismo `url`, `root` con la carpeta que contiene `project/`, `file_path` un archivo y `files` los demás; el índice `project/deck.json` solo cuando cambia el orden, los títulos o las fuentes.
- Los créditos van pequeños y en cursiva; los puntos de rúbrica por rigor se cubren con el guion y las notas, no con más texto en pantalla.

## 9. Estado de verificación

- **Visto en captura local (estado final):** las 7 diapositivas tras los cambios de Copernix (previsualización con Edge sin interfaz). Capturas de la app tomadas el 14-nov con la API local y datos reales de IRSA (`docs/pitch/capturas/`, sin versionar).
- **No visto:** el movimiento (parpadeo, transiciones, barra, el punto sobre el anillo), la exportación a PDF y la versión en inglés (no existe). El visor de Slides no se pudo abrir desde el navegador integrado (exige sesión).
- **Honestidad científica:** solo Epsilon Indi B se midió; las notas de la 5 explican por qué no se usan los otros cuatro objetos y qué decir si el jurado los abre.
- **Sin commit** de nada de esto; `docs/pitch/capturas/` y este archivo tampoco están añadidos a Git.
- (15-nov) Rechazado también: «Cuánto puedes creerlo», «El software nunca lo escribe», «Dos fotos. Una resta.», «Solo cambia la fecha», y decir en voz alta «solo este objeto se pudo medir». La limitación de R Draconis (centro saturado) se dice como parte de la foto y como siguiente paso.
