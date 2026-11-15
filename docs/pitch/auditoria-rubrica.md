# Auditoría contra la rúbrica de Sangolquí 2026 (14-nov, noche)

Fuentes: *Guía integral de calificación y juzgamiento* y *Guía de participantes y rúbrica*. Entrega: **dom 15-nov 09:00**; auditoría del Staff 09:30–10:45; pitch 11:00. Cada punto marcado «verificado» se comprobó el 14-nov contra el repo o con `curl` sin sesión (equivale al modo incógnito).

## 1. Penalizaciones del Staff (hasta −8)

| # | Parámetro | Pena | Estado | Evidencia / qué falta |
| --- | --- | --- | --- | --- |
| 1 | Datos abiertos de la NASA citados y enlazados | −2 | **OK** (verificado) | Landing, sección *Fuentes*: SPHEREx/IRSA (DOI 10.26131/IRSA652), página de la misión, tutoriales IRSA, Gaia (STScI), NASA's Eyes, reto oficial. El visor muestra por foto: archivo (`obs_id`), fecha UTC, banda/λ, colección y enlace a IRSA. **Pegar los mismos enlaces en la ficha** (ver `ficha-proyecto.md`). |
| 2 | Repositorio público + licencia en la raíz | −2 | **OK con una condición** | `github.com/Vladimirjon/NASA_PlanetX_SPHEREX` responde 200 sin sesión; `LICENSE` = MIT en la raíz. **Condición:** la landing y el visor viven en la rama `ui-ux-dflores`; `main` no los tiene hasta fusionar el PR. Si el Staff abre `main`, no verá Copernix. |
| 3 | Todos los enlaces abren sin sesión, sin 404 | −1 | **RIESGO ALTO** | Los 19 enlaces externos de la landing/visor dan 200 (verificado). **Falta la demo pública**: hoy Copernix solo corre en `localhost`; un «Live Demo» que no abre = −1 (y −2 en la pregunta 2.1 si no se puede mostrar). |
| 4 | ≤ 7 diapositivas (carátula y cierre incluidas); video ≤ 30 s (35 s con tolerancia) | −1 | **Por confirmar** | Johann tiene 7 diapositivas en un Artifact (fuera del repo). Exportar PDF y contar páginas = 7. El video es opcional; si se sube, ≤ 30 s. |
| 5 | Declaración de IA, marcas de agua, logos NASA | −1 | **OK** (verificado) salvo 2 puntos | Marca grabada «AI-generated · Generada con IA» en las 5 ilustraciones y en las 3 imágenes del método; fondo del hero retirado; declaración ES/EN en *Fuentes* y `docs/AI_USAGE.md` (enlazado). Ningún logo de la NASA (el modelo del satélite es de NASA's Eyes, con crédito). El logotipo y el icono de Copernix (generados con IA, confirmado por Daniel) ya están en la declaración; no llevan marca de agua porque son la identidad visual del equipo: si el Staff es estricto, añadir «Logo generado con IA» en la última diapositiva. **Pendiente:** marcar la casilla de IA en el formulario/plataforma. |
| 6 | Ficha y entregables en ES **y** EN | −1 | **Parcial** | Landing, visor y README son bilingües (verificado). **Faltan:** versión en inglés de las diapositivas y la ficha en los dos idiomas (borrador listo en `ficha-proyecto.md`). |

**Riesgo de puntaje si no se corrige:** hasta −5 (demo pública −1, diapositivas EN −1, ficha −1, `main` sin el proyecto −2).

## 2. Acciones por orden de valor (antes de las 09:00)

1. **Demo pública.** Hay un paquete estático listo (`node scripts/build-landing.mjs` → `dist/landing`, 24 MB): landing + visor + datos de demostración de los 5 objetos. Probado **sin API**: carga la serie, la medición real de ε Indi B y el mapa. Cualquier hosting estático sirve (Vercel, Netlify, GitHub Pages en raíz). Probar la URL en una ventana de incógnito.
2. **Fusionar la rama a `main`** (PR de `ui-ux-dflores`) y comprobar en incógnito que `main` muestra README, LICENSE y la carpeta `landing/`.
3. **Diapositivas:** PDF ≤ 7 páginas en ES y en EN; incluir en la 5 una captura del visor y el diagrama de arquitectura; en la 7 la declaración de IA y los créditos.
4. **Ficha** ES/EN pegada en la plataforma, con los enlaces de la sección 1.
5. **Respaldo de la demo en vivo:** llevar el visor en local (`mise run copernix`) y el paquete estático en un USB; la API de IRSA depende de la red de la sede.

## 3. Dónde ganamos puntos (y dónde no hay que exagerar)

**RCD (rigor científico y datos)**
- 1.1: se ven los datos *en pantalla* (fotos reales de SPHEREx con fecha, λ y archivo), no como decoración. Decir los nombres: SPHEREx DR1/QR3 vía IRSA, Gaia DR3, Luhman & Esplin 2016 (WISE 0855).
- 1.2 y 1.4: el semáforo **Observado / Evaluado / Confirmado** y el hecho de que el software nunca asigna «Confirmado» es nuestra defensa más fuerte; ε Indi B queda en *Observado, sin verificación independiente* (`outcome = threshold_exceeded_unverified`, tope del contrato).
- 1.3: el pipeline está en la landing (buscar → igualar λ → alinear → restar) y en el código; la medición de ε Indi B usa centroide gaussiano + ajuste de movimiento propio con paralaje catalogada.
- 1.5: la declaración de IA y el crédito de fuentes ya están visibles; separar siempre «lo nuestro» de «lo de la NASA / Gaia / IA».

**IET (innovación y ejecución)**
- 2.1: demo funcional con datos reales; ensayar el recorrido de 90 s: landing → «Explorar el cielo» → ε Indi B → flechas ‹ › → «Solo lo que cambió» → «Detalles y procedencia».
- 2.2: arquitectura por capas (motor de cielo WebGL2 propio sobre HiPS/HEALPix, API FastAPI hexagonal con contrato OpenAPI, caché local-first, visor React) y el diseño «contrato primero».
- 2.3: lo distintivo: *parpadeo + diferencia + color* sobre fotos reales de SPHEREx, con procedencia por píxel y un semáforo honesto; búsqueda de cualquier objeto, no solo cinco.
- 2.5: reproducible (`mise`, lockfiles, ~140 pruebas de frontend, pruebas del backend); tiene modo sin conexión con datos grabados.

**IR (impacto)**
- 3.5: pensado para quien no sabe astronomía: frases simples, ayudas «?», guía de 3 pasos, ES/EN, teclado y contraste.
- 3.1: responde al reto *Planet X and SPHEREx*; **no** afirmar que descubrimos Planet X (regla del repo, `AGENTS.md` §1).

**STP (storytelling)**
- Hilo: *el cielo nunca es el mismo dos veces* → mira qué cambió → cómo lo comprobamos → qué sigue. Cierre con el semáforo.
- Tiempo: ensayar con cronómetro; la demo no debe pasar de 90 s.

## 4. Antes de entrar a la sala (lista de 5 minutos)
- [ ] Demo pública abre en incógnito (landing, `/viewer/`, ES y EN).
- [ ] `main` muestra LICENSE y el proyecto.
- [ ] PDF ES y EN, 7 páginas cada uno.
- [ ] Ficha ES/EN pegada; casilla de IA marcada.
- [ ] Plan B: visor local abierto y paquete estático en USB.
