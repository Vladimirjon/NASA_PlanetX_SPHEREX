# Guion del pitch en español · Copernix · Na za

Versión 2.1 del 15-nov-2026 (revisada por Codex contra frases de relleno y afirmaciones de más) (reescrita tras la revisión del equipo: demo con R Draconis, sin «resta» ni «semáforo» en las diapositivas). Se dice en voz alta; las diapositivas casi no tienen texto. **Dura unos 6:15 con la demo.** La duración oficial del pitch no está confirmada (la guía solo dice que cada sala evalúa 10 equipos entre 11:00 y 13:30): los cortes ✂ llevan el guion a unos 5 minutos. `[VERIFICAR]` marca datos históricos que B debe comprobar antes de decirlos.

## Cómo está armado

Tres actos (presentación del problema, desarrollo con evidencia, solución y propuesta de valor) y el orden que pide la rúbrica del jurado (STP 4.1: Problema → Solución con datos → Impacto). El pitch se apoya en la página de Copernix, que ya cuenta la historia con sus propias palabras («El cielo nunca es el mismo dos veces», «¿Ves qué cambió?», «Elige un punto. Míralo cambiar.»): las diapositivas no repiten lo que la página dice, lo complementan.

| Acto | Qué hace | Diapositivas | Rúbrica |
| --- | --- | --- | --- |
| 1 · Gancho y problema | Un chico de 24 años, un punto que se mueve y la pregunta central | 1, 2, 3 | RCD 1.1 · IR 3.1 · STP 4.1 |
| 2 · Solución en vivo | Página de Copernix y demo con R Draconis; después, qué se vio | 4, demo, 5 | IET 2.1, 2.2 · RCD 1.3 |
| 3 · Impacto y cierre | Qué falta medir, quién lo usa y el regreso a 1930 | 6, 7 | IR 3.2–3.5 · STP 4.4 |

Reglas de redacción: frases cortas y concretas; «tú» para el público; una idea por diapositiva; nada de «no es X, es Y» ni de listas de tres adjetivos; cada cifra viene de `docs/context`, de la página o de la app. La limitación de R Draconis (centro saturado) se dice como lo que es, una parte de la foto y el siguiente paso, no como disculpa.

---

## ACTO 1 · El gancho y el problema

### Diapositiva 1 · «1930» · 0:00–0:40

*En pantalla: negro, estrellas que aparecen y dos puntos que parpadean entre dos fechas. Empiezas sin presentarte.*

> Enero de 1930. Un chico de veintitrés años, hijo de granjeros, trabaja en un observatorio de Arizona. `[VERIFICAR: edad (23 en enero; cumplió 24 el 4 de febrero), origen]` Casi tiene nuestra edad.
>
> Busca un planeta que nadie ha visto: el Planeta X.
>
> Tiene dos fotos de la misma zona del cielo, tomadas con seis días de diferencia. Las mira una y otra vez en una máquina que las alterna.

*(Silencio de tres segundos. Los puntos parpadean. No hables encima.)*

> Todo está quieto. Menos un punto. Ese punto era Plutón.

### Diapositiva 2 · «102 bandas. Todo el cielo.» · 0:40–1:10

*En pantalla: el mapa infrarrojo de SPHEREx.*

> Casi cien años después, la NASA plantea un reto parecido con otro telescopio. Se llama SPHEREx. Desde marzo de 2025 fotografía el cielo entero en ciento dos colores de luz infrarroja, una luz que no vemos y que sentimos como calor.
>
> Publica todas esas fotos, abiertas, en el archivo IRSA de la NASA. El reto se llama *Planet X and SPHEREx*: que cualquier persona pueda ver cómo cambia el cielo entre una foto y otra.

### Diapositiva 3 · «¿Quién puede ver un cambio así?» · 1:10–1:40

*En pantalla: «Cada foto pesa 66 MB. Lo que cambia puede ocupar un píxel.» y la pregunta.*

> Pero hay un problema. Cada foto pesa sesenta y seis megabytes, y lo que cambia entre una foto y otra puede ocupar un solo píxel. Para verlo hoy hay que buscar las fotos en el archivo, descargarlas, alinearlas con código y compararlas, una región a la vez. Eso exige saber programar y saber de astronomía.

*(Pausa corta, mirando al jurado.)*

> Entonces, ¿quién puede ver un cambio así? Nosotros queremos que pueda hacerlo cualquiera.

---

## ACTO 2 · La solución, en vivo

### Diapositiva 4 · Copernix · 1:40–1:55

*En pantalla: el wordmark, «El cielo nunca es el mismo dos veces.» y el enlace copernix.vercel.app. Tienes la página abierta en otra pestaña.*

> Por eso hicimos Copernix. Mejor se lo mostramos.

*(Cambias de pestaña. No leas la diapositiva.)*

### Página de Copernix · 1:55–2:25 ✂

*En pantalla: la página. Scroll lento.*

> Copernix empieza como empieza el cielo: parece quieto. *(scroll)* Las estrellas no se mueven. Una sí. *(llegas a «¿Ves qué cambió?» y arrastras el control)* Arrastro, y el cambio aparece.
>
> *(Te detienes en «El espacio se delata de dos formas».)* Hay dos formas: algo se mueve, o algo se enciende y se apaga. Hoy les muestro la segunda.
>
> *(Llegas al final, «Elige un punto. Míralo cambiar.», y haces clic en «Explorar el cielo».)*

### Demo en vivo con R Draconis · 2:25–3:55 (90 segundos)

*En pantalla: el visor. Si sale la guía de bienvenida, «Saltar». Enlace directo por si algo falla: `copernix.vercel.app/viewer/?target=r-draconis&mode=colour`.*

| Seg. | Haces | Dices |
| --- | --- | --- |
| 0 | Clic en **R Draconis** (lista de destacados) | «R Draconis es una gigante roja que se hincha y se encoge. SPHEREx la fotografió tres veces: julio y octubre de 2025, y julio de 2026.» |
| 15 | **Reproducir** (modo *Fotos en secuencia*) | «Miren el halo alrededor del centro.» *(5 segundos de silencio. El centro es negro porque la estrella brilla demasiado para el detector.)* |
| 40 | **Opciones de vista → Fechas en color** | «Ahora la primera foto se tiñe de magenta y la última de verde. Donde son iguales se ve blanco.» |
| 55 | Señalas el panel **¿Qué cambió?** y la etiqueta | «Y Copernix lo marca como *Observado*: las imágenes muestran una diferencia aparente. Todavía no la medimos.» |
| 70 | **Detalles y procedencia** | «Cada foto trae su archivo, su fecha, su color de luz, su colección y el enlace al archivo de la NASA.» |
| 85 | Cierras el panel | «Acaban de comparar dos fotos reales de una estrella y encontrar una diferencia, sin saber nada de astronomía.» |

*(Opcional ✂, solo si sobra tiempo: escribes «Sirius» en el buscador. «Y funciona con cualquier objeto: hay unos ciento cincuenta listos y cualquier nombre conocido.»)*

*(Vuelves a las diapositivas, mirando al jurado.)*

> ¿Cómo sabemos que ese cambio es de la estrella y no de las fotos?

### Diapositiva 5 · «R Draconis, un año después» · 3:55–4:35

*En pantalla: las dos fotos reales (7 jul 2025 y 14 jul 2026) y tres líneas.*

> Estas son las dos fotos de lo que acaban de ver, con la misma luz infrarroja. Para que la comparación sea justa, Copernix busca en el archivo de la NASA todas las fotos de ese punto, se queda solo con las del mismo color de luz y las pone sobre la misma cuadrícula del cielo. Con colores de luz distintos confundiría la diferencia entre colores con un cambio entre fechas.
>
> El halo se ve más ancho en la primera foto que en la última. Es una diferencia aparente. R Draconis es una estrella variable, de las que se hinchan y se encogen, y puede explicarla, pero falta comprobarlo. El centro sale negro porque ahí el detector se satura.
>
> Por debajo, un servidor consulta el archivo de la NASA y el navegador dibuja el cielo. Todo el código es abierto, con licencia MIT.

---

## ACTO 3 · Lo que falta y el cierre

### Diapositiva 6 · «Falta medirlo.» · 4:35–5:10

*En pantalla: tres líneas.*

> Lo que vieron hoy es una diferencia aparente. Falta medirla. Lo primero es buscar cómo medir el brillo de estrellas como R Draconis aunque su centro esté saturado, para decir cuánto cambió y no solo que cambió.
>
> Lo segundo, que científicos independientes revisen lo que hoy dice *Observado*. Hasta que lo hagan, se queda en *Observado*.
>
> Y lo tercero, probar Copernix con estudiantes de colegios de Ecuador: se usa desde el navegador, sin instalar nada. `[PROPUESTA: no hay acuerdo con ningún colegio]`

### Diapositiva 7 · «Elige un punto del cielo.» · 5:10–5:55

*En pantalla: Plutón, la frase, el wordmark abajo a la izquierda y el enlace.*

> En 1930 a ese mismo chico le tomó meses ver un punto moverse. `[VERIFICAR]`
>
> Ahora las fotos del cielo entero están en internet, públicas, y cualquiera puede abrirlas. Con Copernix eliges un punto y las comparas sin programar ni descargar nada. Está en copernix punto vercel punto app.
>
> Elige un punto del cielo y mira qué cambió.

*(Silencio de tres segundos. Sin «gracias». Te quedas mirando la diapositiva.)*

---

## Si te dan 5 minutos ✂

Quita la página (ve directo a «Explorar el cielo» desde el menú, −30 s), el buscador de la demo (−15 s) y la frase del servidor de la diapositiva 5 (−10 s). Queda en unos 5:20; si hace falta más, la demo baja a 60 segundos sin la vista «Fechas en color».

## Antes de entrar (lista de 5 minutos)

- [ ] `copernix.vercel.app` abre en incógnito (página y visor, ES y EN). La página está en la pestaña 2, ya cargada. Si cae la red: `mise run copernix` (`localhost:4410`) o `docs/pitch/capturas/`.
- [ ] Haz un recorrido completo antes y marca «No volver a mostrar» en la guía, para que no salga durante la demo.
- [ ] Zoom al 100 %, notificaciones apagadas.
- [ ] Usa solo R Draconis. El panel «¿Qué cambió?» dice «su brillo cambia»: léelo siempre con la etiqueta *Observado* («diferencia aparente»), nunca como una medida.
- [ ] Plan B: el video de respaldo de la demo (se graba el domingo 07:30–08:30).

## Si preguntan (respuestas cortas; las largas están en `qa-jurado.md`)

- **¿Cuánto cambió su brillo?** Todavía no lo hemos medido: el centro de la estrella satura el detector y sale negro. Medirlo es lo primero que sigue. Hoy decimos solo que hay una diferencia aparente.
- **¿Cómo saben que no es un defecto de las fotos?** Comparamos solo fotos del mismo color de luz y sobre la misma cuadrícula; aun así lo llamamos *Observado*, no *Confirmado*.
- **¿Y el movimiento?** Medimos el de Epsilon Indi B: 6,6″ en 1,4 años (ajuste de 4 pasadas), también como *Observado*, sin verificación independiente. WISE 0855, Barnard y RW Aurigae: ahí no se pudo medir (`docs/reviews/regions/`).
- **¿Por qué no «Confirmado»?** Porque el contraste con Gaia no es independiente (SPHEREx calibra sus coordenadas con Gaia) y lo confirma la ciencia, no el programa.
- **¿Qué datos de la NASA usan?** SPHEREx (DR1 y QR3) desde el archivo IRSA, y las posiciones de referencia de Gaia (ESA).
- **¿Encontraron Planet X?** No, y no lo afirmamos. Construimos la herramienta para que cualquiera compare fotos y vea qué cambió.
- **¿Qué es propio y qué es IA?** Propios: motor del cielo, API, visor y medición. Declarado: Claude, Cursor y Codex ayudaron con código y textos; el logotipo y las ilustraciones conceptuales los generó ChatGPT Images. Todo está en `docs/AI_USAGE.md`.
- **¿Funciona sin internet?** Sí para los cinco objetos, con datos grabados; el mapa de fondo queda negro, pero las fotos y el panel se ven igual.
