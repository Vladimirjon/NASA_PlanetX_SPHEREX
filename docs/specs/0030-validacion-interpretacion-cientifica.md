# Ficha de tarea para agente — Validación e interpretación científica

- Dueño humano: **Sebastián**; responsabilidad confirmada por el usuario en esta conversación.
- Estado: **borrador científico**, 14-11-2026. El usuario solicitó implementar funciones y vista local; ello no implica validar los casos ni aprobar todos los criterios científicos.
- Revisores humanos: **Mateo y Johann**; Daniel revisa los mensajes destinados a la interfaz.
- ADRs relacionados: [0001](../adr/0001-agents-md-fuente-unica.md), [0002](../adr/0002-reescritura-desde-cero.md); esta ficha no adopta decisiones de arquitectura.
- Alcance: **movimiento aparente y variación de brillo** de una misma región, usando observaciones SPHEREx. No modifica contratos compartidos ni afirma descubrimientos.
- Dependencia: [ficha 0001 de Johann](0001-arquitectura-observation.md), propuesta `Observation` aún en borrador; sus nombres se citan para coordinación, no se declaran aprobados por esta ficha. La aceptación previa de otro borrador descartado no sustituye la revisión de la ficha 0001.
- Seguimiento: [0032 — criterios cuantitativos y evidencia](0032-criterios-cuantitativos-validacion.md) registra las cifras de la ficha de Mateo y su alcance; ningún umbral aislado certifica un par.

Etiquetas: **[OFICIAL]** fuente NASA/IPAC citada en §7; **[OTRA SESIÓN]** resultado documentado en la ficha 0001, no reproducido aquí; **[PROPUESTA]** interpretación o interfaz para revisión; **[VERIFICAR]** evidencia faltante; **[DECISIÓN]** acuerdo humano pendiente. El equipo decide producto y métodos; no se fijan umbrales sin respaldo.

## 1. Objetivo funcional

Proponer controles que determinen si un par de observaciones puede usarse con un método concreto y, después, qué afirmación puede sustentarse en las mediciones. Cada resultado conserva evidencia, incertidumbres y límites. El sistema distingue **observado**, **evaluado** y **confirmado** según `AGENTS.md`; nunca asigna confirmado por sí solo.

Flujo propuesto por la ficha 0001: búsqueda y preselección → enriquecimiento con FITS y calibración → preparación → controles del par preparado → medición de Mateo → interpretación de Sebastián. Una candidata o una autorización para aplicar un método **no demuestra un cambio**. La aptitud es para un par, posición o área y método determinados; no es una propiedad universal de una imagen.

## 2. Entradas exactas

Las estructuras `Observation` y `AnalysisResult` pertenecen a Johann y Mateo; no se modifican aquí. Las entradas siguientes son requisitos científicos para acordar con ellos, no contratos ya implementados. Datos nulos, ausentes o sin evidencia se comunican, no se sustituyen con cero.

| Entrada | Necesidad, tipo/unidad y procedencia | Cuándo |
| --- | --- | --- |
| Región y objetivo | Identificador y revisión de región; coordenadas ICRS RA/Dec en grados, geometría, posición o área de medición y su época de referencia. RA `[0,360)`, Dec `[-90,90]`. | Siempre; para una fuente móvil, posición esperada por época y su procedencia cuando esté disponible. |
| Productos | Dos o más referencias a productos versionados distintos: `observation_id`, `identity_status`, `source.collection`, `source.obs_id`, `source.acquisition_id`, `source.publisher_did`, detector, URI, versión y `provenance`. | Identidad resuelta antes de medir; dos versiones de la misma adquisición no son dos épocas. |
| Fechas | `time.samples`: fechas efectivas de adquisición, formato ISO o MJD, escala temporal y fuente. Unidades de tiempo en días o segundos cuando corresponda. | Para establecer fechas distintas y reproducir el análisis. Una fecha de publicación o de procesamiento no la sustituye. |
| Geometría | `coverage`, WCS espacial de cada producto y huella válida; recortes/rejilla, máscaras, transformación y evidencia de residuales de alineación con unidades angulares. | Para evaluar región común; de nuevo después de reproyección. |
| Espectro | `spectral.local`: λ central y anchura locales en µm, posición/píxel nativo, origen del índice, método, archivos y revisión de calibración asociada; registrar también cómo se obtiene el valor para una apertura o área. | Para cada época y zona de medición. `em_min/em_max` solo preseleccionan; el rango de todo el detector no es λ local. |
| Calidad e instrumento | `quality.flags` y definiciones por versión, `quality.variance` con unidad, IMAGE/unidad, respuesta a fuente puntual (PSF/EPSF), saturación, fondo, cobertura, calibración y tratamiento de fuentes vecinas; distinguir recurso no inspeccionado de recurso ausente. | Según el método; evidencias de FLAGS y calidad necesarias para evaluar. `L2DQA=Pass` no certifica comparabilidad. |
| Procesamiento | Originales y derivados `products`, identificación de recursos, transformaciones, parámetros, versión, unidades, interpolación y tratamiento de máscaras e incertidumbre. Escalas de pantalla separadas de los datos científicos. | Para reproducir controles y mediciones. |
| Mediciones de Mateo | Referencias a observaciones y controles, posiciones y/o flujos por época y diferencias con unidades, incertidumbre, método, detección/no detección y límites, fondo y sistemáticos conocidos. | Para interpretar un resultado; forma final de `AnalysisResult` pendiente con Mateo. |

**Espectro [OFICIAL]:** IRSA recomienda las extensiones `CWAVE` y `CBAND` del producto de calibración para análisis científico; `WCS-WAVE` aproxima valores para visualización. Necesitamos vínculo verificable entre calibración e imagen y correspondencia entre posición celeste, píxel original y recorte. Si no existe, no usar la aproximación para declarar compatibilidad científica [S1]. Coincidencia de centro y anchura no garantiza por sí sola igualdad de respuesta espectral completa ni autoriza una tolerancia sin revisión.

## 3. Salidas exactas

Los siguientes nombres y tipos son **[PROPUESTA]** para coordinación con Johann y Mateo, no modifican `Observation`, `AnalysisResult` ni `contracts/openapi.yaml`.

### 3.1 Prevalidación y control del par preparado

Un registro por par, zona, método, etapa y versión de evidencia:

| Campo | Tipo propuesto | Significado |
| --- | --- | --- |
| `pair_observation_ids` | lista de dos textos | Identidades exactas de productos; mismo orden en entradas y mediciones. |
| `region_ref`, `target_ref`, `method_ref`, `stage` | textos/referencias | Región y posición/área, método previsto y fase `preselection` o `prepared`. |
| `status` | `pending`, `rejected`, `eligible_for_method` | Falta evidencia; incompatibilidad comprobada; o controles requeridos para un método satisfechos. No es semáforo científico. |
| `checks` | lista de `{name, status, reason, evidence_refs}` | Un estado `pass`, `warning`, `fail` o `unknown` por control aplicable. Los motivos y las evidencias son trazables; no simular ejecución. |
| `limitations`, `review` | listas/referencia | Advertencias, supuestos, política y revisión humana aplicable. |

En `preselection`, como máximo hay un par candidato pendiente; `eligible_for_method` solo habilita medir en la fase `prepared`, después de ejecutar los controles aplicables a los derivados. Si solo existe una candidata, conservar el motivo de insuficiencia y las referencias disponibles; no crear una segunda observación. Si cambian productos, área, método o reproyección, revisar de nuevo los controles afectados. [DECISIÓN] Johann, Mateo y Sebastián deben acordar nombres, codificación, política de advertencias y ubicación definitiva.

### 3.2 ScientificCase

**[PROPUESTA]** Identificador de caso y región; pregunta educativa; observaciones y producto nativo por época; referencia a controles y, si existe, `AnalysisResult`; afirmación permitida; nivel `observed` o `evaluated`; limitaciones, incertidumbres, lo que no se puede concluir, fuentes y estado/revisor humano. `confirmed` no se asigna automáticamente; cómo registrar una validación humana externa queda [DECISIÓN].

Ejemplo estructural **sintético y parcial, sin observaciones reales**:

```json
{"pair_observation_ids":["synthetic-a","synthetic-b"],"stage":"preselection","status":"pending","checks":[{"name":"local_spectrum","status":"unknown","reason":"Synthetic example: calibration not linked","evidence_refs":[]}]}
```

### 3.3 Interpretaciones permitidas

| Evidencia | Mensaje permitido [PROPUESTA] | No se concluye |
| --- | --- | --- |
| Diferencia de apariencia con controles incompletos | **Observado:** «Las imágenes muestran una diferencia aparente». Indicar qué falta. | Movimiento físico, fuente variable o descubrimiento. |
| Posiciones medidas distintas, controles completos y diferencia distinguible de incertidumbres y sistemáticos | **Evaluado:** «La posición aparente medida difiere entre estas observaciones». | Por sí sola no determina movimiento propio, paralaje, órbita ni identidad. |
| Flujos medidos distintos con banda, calibración y calidad apropiadas; diferencia defendible frente a incertidumbre | **Evaluado:** «El brillo medido difiere en estas observaciones y condiciones». | Causa, periodicidad o cambio intrínseco inequívoco. |
| Diferencia compatible con incertidumbres o sensibilidad insuficiente | «No se establece una diferencia con estos datos»; indicar límites cuando estén justificados. | Que la fuente sea inmóvil o constante. |
| Una época sin detección o cobertura | «No hay detección utilizable en una época»; revisar cobertura, sensibilidad y límites. | Que desapareció, sea un asteroide o sea una fuente nueva. |
| Residuo tipo dipolo o puntual | «El patrón es compatible con desplazamiento o cambio de brillo, respectivamente» solo como pista, tras advertir alternativas. | Que el patrón identifique una causa sin controles de PSF, alineación y fondo. |

## 4. Restricciones científicas

### Matriz de controles y evidencia

`pending` significa falta de evidencia; `rejected`, incompatibilidad demostrada para ese método. La política concreta para advertencias se acuerda con Mateo y Johann. Los vínculos oficiales se amplían en §7.

| Fuente | Condición y control [PROPUESTA] | Consecuencia / resultado permitido |
| --- | --- | --- |
| [S1], ficha 0001 §§3.3–3.4 | Identidad y adquisición: distinguir detector, versión y adquisición; no tratar reprocesamientos como épocas. | Identidad desconocida → pendiente; misma adquisición como dos épocas → rechazar comparación temporal. |
| [S2], ficha 0001 §3.4 | Tiempo de observación conocido y compatible en formato y escala; fecha efectiva distinta. | Escala o fecha desconocida → pendiente; fechas no comparables para el propósito → rechazo razonado. |
| [S3] | Región común, cobertura útil y WCS con distorsión; comprobar alineación mediante fuentes de referencia independientes del objetivo. | Cobertura o alineación no verificadas → pendiente; cobertura demostrablemente insuficiente o incompatibilidad → rechazo. Un corrimiento global puede ser registro deficiente. |
| [S1] | Comparar `CWAVE`/`CBAND` de la calibración vinculada en posición nativa adecuada, con registro de correspondencia geométrica. | Solo `WCS-WAVE`, rango global o detector igual → evidencia insuficiente. Compatibilidad y tratamiento de una apertura quedan pendientes de criterio humano. |
| [S4] | Revisar bits `FLAGS` según definición y versión, y píxeles que afectan la medición. | Un bit no implica siempre invalidez; `SOURCE` puede ser informativo. Sin revisión → pendiente; condiciones inadmisibles para el método → rechazo con motivo. |
| [S4], [S5] | Revisar incertidumbre de `VARIANCE`, calibración, PSF local, saturación, fondo y fuentes mezcladas. La varianza no es desviación estándar. | Sin incertidumbre o calidad necesaria no elevar a evaluado; una advertencia puede requerir tratamiento o revisión. |
| [S4] | Comprobar fondo y tratamiento de `ZODI`; la herramienta IRSA usa su propia estimación de fondo. | No asumir que el modelo ya fue restado ni restarlo automáticamente; reescalar pantalla no mide flujo. |
| [S1], [S4] | Propagar incertidumbre por transformaciones y medición, incluyendo correlaciones y posibles sistemáticos compartidos. | Sin evidencia suficiente, resultado inconcluso; no definir significancia numérica en esta ficha. |
| `AGENTS.md` §1 | Controles espaciales, temporales, espectrales, instrumentales y de calidad completos y procedencia trazable. | **Evaluado** requiere que la diferencia persista tras controles; **confirmado** nunca se asigna automáticamente. |

`CWAVE`/`CBAND` se documentan por posición de la fuente; para aperturas extensas o fuente móvil, cómo resumir la respuesta del área es [VERIFICAR]. No se asume que dos escalados visuales independientes sean comparables fotométricamente. El contraste con catálogos u otras misiones puede aportar contexto, pero no sustituye los controles del par SPHEREx.

### Candidatos educativos: ninguno validado por esta sesión

| Candidato | Antecedente y estado | Falta verificar |
| --- | --- | --- |
| WISE 0855, movimiento | NASA documenta movimiento en WISE/Spitzer [S6]. [OTRA SESIÓN] ficha 0001 §7.4 encontró un par DR1 D3 con λ coincidente en un **punto fijo**, no en posiciones propagadas. | Detección del objeto, posición por época, λ en la fuente, FLAGS, alineación, incertidumbre y recuperabilidad del movimiento. No afirmar que el par es válido. |
| Estrella de Barnard, movimiento | NASA documenta su movimiento aparente [S7]. [OTRA SESIÓN] ficha 0001 encontró cobertura QR3 posterior a DR1 en el punto consultado. | Posición real por época, cobertura de fuente, saturación, PSF y medición defendible. Cobertura no demuestra detección. |
| RW Aur o R Dra, brillo | [OTRA SESIÓN] ficha 0001 documenta imágenes DR1 y QR3 que cubren las coordenadas consultadas; no demuestra variación en SPHEREx. | Identidad, detección, banda local, fondo, vecindad y fotometría comparable. |
| LRLL 54361, brillo | NASA documenta variabilidad infrarroja observada por Spitzer [S8]. | Pares SPHEREx, detección, calidad y cambio: no verificados. |

## 5. Casos de prueba

Escenarios para una implementación futura; no son datos observados ni pruebas ya ejecutadas.

- **Válido:** dos adquisiciones reales distintas, identidad y tiempos resueltos, misma región y método, calibración local, WCS y calidad comprobadas: `eligible_for_method`; el nivel evaluado requiere además una medición y persistencia de la diferencia tras controles.
- **Entrada incompleta:** tiempo sin escala o `spectral.local` solo aproximado: `pending`, con campo, motivo y evidencia faltante.
- **Datos incompatibles:** dos versiones de una adquisición como épocas o calibración espectral incompatible para el método: `rejected`, con motivo.
- **Preparación:** un desplazamiento global entre imágenes sin residuales de alineación comprobados no autoriza una afirmación de movimiento.
- **Calidad:** bit informativo `SOURCE` no causa rechazo automático; bit problemático relevante requiere política por método y versión; FLAGS sin inspección deja control pendiente.
- **Brillo:** escalas visuales distintas no constituyen diferencia de flujo; incertidumbre o fondo no disponible impide evaluar el cambio de brillo.
- **No detección / resultado nulo:** conservar límite y método cuando se conozcan; una diferencia compatible con incertidumbre no equivale a ausencia física de cambio.
- **Trazabilidad:** recurso o calibración inaccesible produce motivo explícito; `L2DQA=Pass` no eleva a evaluado y una revisión de producto no valida todos los pares.

## 6. Criterio de aceptación

Sebastián revisa fuentes, mensajes, casos y controles; Johann verifica la correspondencia con `Observation` y Mateo las necesidades de medición e incertidumbre. Daniel revisa comprensión de mensajes. La ficha se aprueba por un humano antes de delegar implementación. Cada caso real debe poder reproducirse a partir de productos, fechas, λ local, calidad y transformaciones verificables. No se califican candidatos como casos evaluados por figurar en una lista.

**Pendientes para el equipo**

1. Con Johann: confirmar campos disponibles y asociación inequívoca entre `Observation`, calibración, píxel nativo y derivados; resolver contradicciones de `docs/context/03` y `06` con la fuente oficial sin editarlas unilateralmente.
2. Con Mateo: especificar interfaz de mediciones, referencias por época, incertidumbre y correlaciones; elegir métodos de alineación, PSF, fondo y fotometría.
3. Definir por método tratamiento de bits, advertencias y tolerancias espectrales con evidencia; decidir cómo evaluar aperturas y espectros desconocidos.
4. Establecer evidencia necesaria para pasar de observado a evaluado y quién realiza una eventual revisión científica externa; confirmado jamás lo asigna automáticamente el software.
5. Elegir y verificar un par real, incluido el seguimiento de la discrepancia QR3 en `STATE`; el ejemplo WISE 0855 es solo candidato.
6. Acordar estados y estructura de `ScientificCase` y prevalidación con Johann, Mateo y Daniel antes de cambiar contratos o construir API.

## 7. Fuentes

- [S1] [SPHEREx Explanatory Supplement, producto Spectral WCS](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf), sección 4.3.1: `CWAVE`, `CBAND`, `WCS-WAVE`.
- [S2] [IRSA: espectros y fechas de observación](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/spectra.html).
- [S3] [IRSA: recortes SPHEREx](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/cutouts.html).
- [S4] [IRSA: fotometría, FLAGS, incertidumbre y fondo](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/sp.html).
- [S5] [IRSA: error histórico de cabecera PSF y corrección](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/psfhdrerr.html).
- [S6] [NASA: movimiento de WISE 0855 observado con WISE/Spitzer](https://science.nasa.gov/photojournal/cold-and-quick-a-fast-moving-brown-dwarf/).
- [S7] [NASA: movimiento aparente de la estrella de Barnard](https://science.nasa.gov/universe/exoplanets/discovery-alert-a-new-super-earth-in-the-neighborhood-six-light-years-away/).
- [S8] [NASA: variabilidad infrarroja de LRLL 54361](https://science.nasa.gov/asset/hubble/protostar-lrll-54361/).
- Repositorio: `AGENTS.md`, `docs/STATE.md`, onboarding, `docs/context/02` y `03`; [ficha 0001](0001-arquitectura-observation.md) para registros de otra sesión y discrepancias con documentación interna.
