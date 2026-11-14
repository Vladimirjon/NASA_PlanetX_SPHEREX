# NASA Space Apps Challenge 2026
## Planet X and SPHEREx — Documento base de alineación

> **Proyecto provisional:** SkyShift  
> **Versión:** 0.1 — Documento vivo  
> **Etapa:** Paso 1 · Comprender el problema y las observaciones  
> **Equipo:** Cinco estudiantes de Ciencias de la Computación (EPN)  
> **Objetivo de esta versión:** Alinear conocimientos y decisiones **antes** de dividir módulos o solicitar código a agentes de IA.

---

## 1. Resumen ejecutivo del reto

### 1.1. El problema

La misión **SPHEREx** de NASA observa el cielo en el infrarrojo cercano, en **102 canales espectrales**, y vuelve a cubrir el cielo periódicamente. Estas observaciones pueden compararse para estudiar qué parece cambiar entre distintos momentos.

Pero el acceso a datos astronómicos **no implica** poder interpretarlos. Se necesitan coordenadas celestes, fechas, longitudes de onda, archivos científicos, controles de calidad y conocimientos instrumentales. Una diferencia entre imágenes **no equivale necesariamente** a movimiento real ni a un descubrimiento.

**Pregunta que guía el proyecto:**

> ¿Cómo permitir que una persona sin conocimientos de astronomía identifique y comprenda **posibles cambios en una región del cielo**, mediante la comparación visual de imágenes reales de SPHEREx obtenidas en distintos momentos?

### 1.2. Por qué importa

- **Accesibilidad:** abre datos complejos a estudiantes y público general.
- **Comunicación científica:** transforma observaciones en explicaciones visuales comprensibles.
- **Rigor:** enseña a separar señales observadas, ruido, artefactos e interpretaciones.
- **Participación:** invita a explorar preguntas astronómicas sin requerir conocimientos técnicos previos.

### 1.3. Qué esperamos entregar

Un **prototipo web guiado** que permita:

1. Elegir una región o caso astronómico previamente preparado.
2. Ver **dos observaciones reales y comparables** de SPHEREx, con fecha y procedencia.
3. Compararlas mediante alternancia o deslizador.
4. Examinar una posible diferencia de posición o brillo, si existe y está validada.
5. Leer una explicación sencilla sobre lo que se observa y lo que **no puede concluirse**.

**No es parte del compromiso inicial:** descubrir Planet X, catalogar automáticamente objetos nuevos, analizar todo el cielo en tiempo real, entrenar una IA astrofísica o combinar indiscriminadamente datos de SPHEREx y NEOSSat.

### 1.4. Decisiones ya acordadas y cuestiones pendientes

| Estado | Decisión o hipótesis |
|---|---|
| **Acordado** | Enfoque: comparación **temporal** de una misma región del cielo. |
| **Acordado** | Público prioritario: personas sin conocimientos de astronomía. |
| **Acordado** | Fuentes centrales: SPHEREx/IRSA y tutoriales oficiales. |
| **Propuesto** | Experiencia guiada con pocos casos preparados y validados. |
| **Pendiente de validar** | Existencia de pares de observaciones que muestren cambios claros y científicamente defendibles. |
| **Pendiente de decidir** | Si el primer caso mostrará desplazamiento, cambio de brillo o ambos. |

---

## 2. Fundamentos de astrofísica: lo indispensable

> **Regla general:** no programamos una operación sobre datos si no sabemos qué representan sus entradas y qué significa su salida.

### 2.1. Qué registra un telescopio

Un telescopio capta radiación procedente de regiones del cielo. **SPHEREx observa luz infrarroja**, invisible para nuestros ojos. Las imágenes pueden representarse usando colores artificiales para que podamos verlas en una pantalla. Esos colores no son necesariamente lo que veríamos a simple vista.

**Conceptos:**

- **Fuente astronómica:** objeto o región que produce una señal medible (estrella, enana marrón, galaxia, etc.).
- **Brillo observado:** intensidad que registra el instrumento; puede cambiar por el objeto, por las condiciones de medición o por el procesamiento.
- **Longitud de onda (λ):** característica de la luz observada; dos bandas distintas pueden mostrar un mismo objeto de forma diferente.
- **Canal espectral:** intervalo de longitudes de onda observado por el instrumento. SPHEREx utiliza 102 canales.

**Ejemplo mental:** fotografiar una camisa con luz visible y con una cámara infrarroja puede producir imágenes muy diferentes aunque la camisa no cambie. **Diferencia espectral no es cambio temporal.**

### 2.2. Coordenadas: identificar la misma zona del cielo

La Tierra usa latitud y longitud; la astronomía usa, entre otros sistemas:

- **RA (ascensión recta):** coordenada angular alrededor de la esfera celeste.
- **Dec (declinación):** coordenada angular al norte o sur del ecuador celeste.
- **WCS (World Coordinate System):** información que permite asociar posiciones de píxeles `(x, y)` con coordenadas astronómicas `(RA, Dec)`.

Dos imágenes pueden parecer desplazadas simplemente porque el telescopio apuntó con una orientación distinta. **No basta con superponer píxeles de igual índice; primero hay que alinear las imágenes por coordenadas del cielo.**

### 2.3. Píxeles y archivos FITS

Una imagen astronómica es una matriz de mediciones. Un objeto puntual puede ocupar varios píxeles debido a la respuesta óptica del telescopio.

**FITS** es un formato científico que permite almacenar matrices, metadatos y varias capas de información. Para nuestro proyecto interesan especialmente:

| Dato / concepto | Significado sencillo | Uso previsto |
|---|---|---|
| `IMAGE` | Medición científica por píxel | Visualizar la región. |
| Fecha de observación | Cuándo se registró la imagen | Ordenar y comparar momentos. |
| Coordenadas / WCS | Qué lugar del cielo representa cada píxel | Alinear imágenes. |
| Banda / longitud de onda | Qué parte de la radiación observamos | Evitar comparaciones incompatibles. |
| `FLAGS` | Alertas de calidad en píxeles | No interpretar artefactos como cambios. |
| `VARIANCE` | Incertidumbre asociada a las mediciones | Evaluar si una diferencia es confiable. |
| `WCS-WAVE` | Información de longitud de onda según ubicación | Verificar compatibilidad espectral. |
| `ZODI` | Modelo de fondo zodiacal | Comprender posibles diferencias de fondo. |
| `EPSF` | Cómo aparece una fuente puntual en el detector | Análisis avanzado; no esencial al inicio. |

**Particularidad de SPHEREx:** la longitud de onda puede depender de la ubicación de un objeto dentro del detector. Por ello, elegir dos imágenes del mismo detector **no garantiza por sí solo** que sean espectralmente comparables.

### 2.4. Qué puede cambiar entre dos fechas

**A. Movimiento aparente:** un punto cambia de posición respecto de referencias estelares. Posibles explicaciones: movimiento de un objeto del Sistema Solar, movimiento propio o efectos geométricos. **No prueba que sea Planet X.**

**B. Variabilidad de brillo:** una fuente aparece más o menos intensa. Puede ser un fenómeno astrofísico, pero también puede deberse a calibración, fondo, sensibilidad, ruido o longitud de onda distinta.

**C. Artefacto:** una diferencia causada por los datos o el instrumento, no por un cambio real en el cielo.

**Ejemplo simplificado:**

```text
FECHA A                   FECHA B
★    ·    ★               ★    ·    ★
     ●                         ●
★         ★               ★         ★

★ = estrellas de referencia; ● = punto de interés
La posición relativa del punto debe comprobarse con coordenadas,
no solo con su ubicación aparente en la pantalla.
```

### 2.5. Qué hace válida una comparación

Antes de interpretar una diferencia, confirmar:

1. **Misma región celeste:** cobertura equivalente en RA/Dec.
2. **Fechas realmente distintas:** tiempos de adquisición documentados.
3. **Longitudes de onda compatibles:** mismo rango o comparación espectral justificada.
4. **Geometría comparable:** escala, orientación y registro espacial corregidos.
5. **Calidad aceptable:** máscaras, ruido, saturación y valores dudosos revisados.
6. **Procedencia trazable:** identificar archivo y origen de cada observación.

**Semáforo de interpretación:**

- **Observado:** «Las imágenes muestran una diferencia aparente».
- **Evaluado:** «La diferencia persiste después de controles de calidad».
- **Confirmado:** «La interpretación física ha sido validada con evidencia suficiente».

Nuestro MVP puede llegar bien a los dos primeros niveles. No debe atribuirse automáticamente el tercero.

### 2.6. Matemática mínima (para pensar, no para implementar aún)

- **Diferencia de brillo:** `ΔB = B₂ − B₁`. Solo tiene sentido físico si las mediciones son comparables.
- **Distancia entre posiciones en píxeles:** `d = √[(x₂−x₁)² + (y₂−y₁)²]`. Es distancia **en la imagen**, no movimiento celeste confirmado.
- **Incertidumbre:** toda medición tiene error. Una diferencia pequeña frente al ruido puede no ser significativa.

No necesitamos dominar cálculo avanzado para iniciar. Sí debemos saber **qué pregunta responde cada operación** y **qué condiciones la hacen válida**.

### 2.7. Glosario rápido

| Término | Traducción práctica |
|---|---|
| Observación | Registro tomado por un instrumento en un instante/intervalo. |
| Época | Momento o conjunto temporal de observaciones. |
| Banda espectral | Rango de longitudes de onda. |
| Cutout | Recorte pequeño de una imagen astronómica. |
| Reproyección | Transformación para hacer corresponder coordenadas espaciales. |
| Calibración | Corrección o caracterización de la respuesta instrumental. |
| Artefacto | Rasgo aparente que no corresponde necesariamente a un objeto real. |
| SNR | Relación señal/ruido: cuán distinguible es una medición del ruido. |
| Metadatos | Datos que describen un archivo: fecha, posición, banda, etc. |

---

## 3. Arquitectura conceptual y flujo de solución

### 3.1. El recorrido de extremo a extremo

```text
[Archivo científico SPHEREx / IRSA]
                  |
                  v
[Buscar observaciones por región, fecha y banda]
                  |
                  v
[Seleccionar dos observaciones candidatas]
                  |
                  v
[Verificar procedencia y comparabilidad]
           |                   |
        NO válida           Válida
           |                   |
           v                   v
 [Buscar otro par]      [Recortar y alinear]
                               |
                               v
                       [Control de calidad]
                               |
                               v
                     [Comparación visual]
                               |
                               v
                   [Explicación e incertidumbre]
                               |
                               v
                   [Interfaz web para usuarios]
```

**Importante:** encontrar dos fechas no garantiza encontrar un cambio claro. La selección de casos es un trabajo científico previo.

### 3.2. Módulos lógicos (candidatos, todavía no asignaciones)

| Módulo | Responsabilidad | Entrada | Salida / contrato esperado |
|---|---|---|---|
| **Catálogo** | Buscar observaciones en IRSA | Región, intervalo de fechas, banda | Lista de observaciones con metadatos y referencias |
| **Selector** | Elegir pares potencialmente comparables | Lista de observaciones | Par candidato + razones de selección/rechazo |
| **Preparación** | Recortar, reproyectar, normalizar visualización | Archivos FITS del par | Dos imágenes referidas a la misma cuadrícula celeste |
| **Calidad** | Revisar FLAGS, incertidumbre y compatibilidad | Par preparado + metadatos | Estado de validación + advertencias |
| **Comparación** | Producir vistas A/B y, opcionalmente, diferencias | Par validado | Capas visuales + métricas justificadas |
| **Interpretación** | Explicar lo observable sin exageraciones | Resultado + controles | Texto claro, nivel de confianza y limitaciones |
| **Experiencia web** | Mostrar navegación, alternancia y contexto | Datos preparados y explicaciones | Interacción comprensible para no especialistas |

Estos módulos son una **propuesta para debatir**, no una orden de implementarlos como siete servicios separados. Un MVP puede utilizar un proceso de preparación offline y una web estática ligera.

### 3.3. Modelo de información mínimo

Cada caso demostrativo debería guardar, como mínimo:

```text
Caso astronómico
 ├─ id, título y explicación para público general
 ├─ región del cielo (RA, Dec y extensión angular)
 ├─ observación A (fecha, instrumento, banda, archivo fuente)
 ├─ observación B (fecha, instrumento, banda, archivo fuente)
 ├─ parámetros de alineación y visualización
 ├─ resultados de controles de calidad
 ├─ imágenes o capas listas para mostrar
 └─ interpretación: observado / posible / no confirmado
```

**Regla:** nunca separar una imagen de sus metadatos de procedencia.

### 3.4. Arquitectura para programación agéntica

**El equipo humano decide** qué debe hacer el sistema, cómo se relacionan los módulos, qué constituye una comparación válida, qué interfaz tendrá y cómo se comprobarán los resultados.

**Los agentes de código implementan** tareas delimitadas conforme a esas especificaciones. No deben decidir por cuenta propia la interpretación astronómica ni inventar datos de prueba presentados como reales.

Antes de delegar cualquier módulo a un agente, redactar una ficha con:

1. **Objetivo funcional**: comportamiento que se espera.
2. **Entradas exactas**: formato, unidades, valores requeridos y opcionales.
3. **Salidas exactas**: estructura, tipos y ejemplos.
4. **Restricciones científicas**: cuándo debe rechazar una operación o advertir incertidumbre.
5. **Casos de prueba**: ejemplo válido, entrada incompleta, datos incompatibles y resultado esperado.
6. **Criterio de aceptación**: cómo el equipo humano confirmará que funciona.
7. **Fuentes**: recursos oficiales que sustentan el comportamiento.

**Ejemplo de instrucción conceptual para un agente:** «Diseña el contrato de selección de pares de observaciones. Debe rechazar pares sin fechas documentadas, cobertura espacial suficiente o información espectral compatible. Devuelve siempre las razones de rechazo. No asumas que dos archivos del mismo detector son comparables».

**Prueba indispensable:** el equipo humano revisa tanto el funcionamiento del software como la validez científica de su resultado.

### 3.5. Criterios de aceptación del primer prototipo

- [ ] Mostrar un caso con dos observaciones **reales** de SPHEREx, documentadas.
- [ ] Indicar claramente fechas, región y banda/longitud de onda.
- [ ] Comparar la **misma región** mediante un control sencillo.
- [ ] Identificar si una señal destacada es válida, dudosa o solo ilustrativa.
- [ ] Explicar qué cambió aparentemente y qué no se puede concluir.
- [ ] Permitir que una persona nueva entienda la experiencia sin formación en astronomía.
- [ ] Tener una demostración de respaldo si falla la conexión a Internet.

---

## 4. Recursos oficiales, herramientas y librerías

### 4.1. Los siete recursos proporcionados por el reto

| Recurso | Papel en el proyecto | Uso recomendado |
|---|---|---|
| [NASA/IPAC SPHEREx](https://irsa.ipac.caltech.edu/Missions/spherex.html) | Archivo científico central, consultas y herramientas | **Fuente principal** de observaciones y metadatos |
| [SPHEREx Tutorial Notebooks](https://caltech-ipac.github.io/irsa-tutorials/spherex/) | Ejemplos oficiales de acceso, recortes, visualización y análisis | **Guía técnica prioritaria** para comprender los datos y dar contexto a agentes |
| [WiseView](http://byw.tools/wiseview) | Referencia de exploración temporal en imágenes WISE | **Inspiración UX**: alternancia, navegación y comparación; no es fuente SPHEREx |
| [NEOSSat — Canadian Space Agency](https://www.asc-csa.gc.ca/eng/satellites/neossat/) | Contexto científico de misión complementaria | Comprender otros casos de objetos móviles |
| [Canadian Astronomy Data Centre](https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/) | Infraestructura de archivos astronómicos | Utilizar si se incorpora NEOSSat |
| [NEOSSat Data Tutorial](https://github.com/asc-csa/NEOSSAT_Tutorial) | Tutoriales de extracción, visualización y preprocesamiento FITS | Aprendizaje complementario; no reemplaza notebooks SPHEREx |
| [NEOSSat Dataset](https://data.asc-csa.gc.ca/dataset/neossat) | Colección de datos de otra misión | Expansión opcional; no mezclar directamente con SPHEREx |

**Regla de alcance:** SPHEREx es la base del MVP. NEOSSat no es obligatorio, y su incorporación requeriría comparar observaciones de la misma misión o justificar un análisis multiinstrumental.

### 4.2. Conceptos de herramientas que conviene aprender

| Herramienta | Qué hace | ¿Para qué podría servir? |
|---|---|---|
| **Jupyter Notebook** | Documento que combina código, notas y resultados | Entender y reproducir los tutoriales científicos |
| **Python** | Lenguaje habitual de análisis de datos científicos | Preparación offline de las observaciones |
| **Astropy** | Funciones astronómicas: FITS, coordenadas, WCS y unidades | Leer imágenes y relacionar píxeles con cielo |
| **NumPy** | Operaciones sobre matrices numéricas | Operar con matrices de medición |
| **Matplotlib** | Gráficas e imágenes científicas | Inspeccionar observaciones durante validación |
| **Pandas** | Tablas de datos y metadatos | Organizar búsquedas y listas de observaciones |
| **Framework web (por decidir)** | Interfaz interactiva en navegador | Comparador temporal y explicaciones |
| **Git/GitHub** | Versionado y revisión colaborativa | Controlar cambios, prompts, arquitectura y evidencias |

Estas librerías **no constituyen todavía un stack aprobado**. Los recursos oficiales y los contratos funcionales deben orientar la selección, no la popularidad de una herramienta.

### 4.3. Qué pedirles a los agentes sobre los recursos

- Identificar en los notebooks **cómo se consultan observaciones por coordenadas, fechas y banda**.
- Documentar qué metadatos se necesitan para comparar imágenes.
- Explicar qué funciones disponibles evitan reinventar conversión de coordenadas y lectura FITS.
- Proponer alternativas de arquitectura **sin asumir que todas las operaciones necesitan ejecutarse en el navegador**.
- Adjuntar pruebas y referencias para cada decisión relevante.

---

## 5. Propuesta inicial de pitch

**Objetivo narrativo:** que el jurado entienda el problema, observe la solución funcionando y perciba valor científico y educativo sin tener que conocer el formato FITS.

### 5.1. Estructura sugerida (aproximadamente 5 minutos, ajustable)

| Bloque | Mensaje | Evidencia visual |
|---|---|---|
| **Apertura (40 s)** | «¿Cómo sabemos si algo cambió en el cielo cuando tenemos tantos datos?» | Dos observaciones aparentemente similares |
| **Problema (40 s)** | Los datos SPHEREx son valiosos, pero difíciles de explorar para no especialistas | Vista breve de información astronómica real |
| **Solución (45 s)** | SkyShift traduce observaciones a una exploración temporal guiada | Pantalla principal y recorrido sencillo |
| **Demo (90 s)** | Seleccionar caso, alternar fechas, observar e interpretar | Comparación funcional con datos reales |
| **Impacto y rigor (45 s)** | Acceso educativo, trazabilidad y explicación de incertidumbre | Fechas, fuentes y advertencias de calidad |
| **Cierre (40 s)** | Hacemos más accesible la exploración de un cielo cambiante | Idea central en una frase |

### 5.2. Mensaje que debería recordar el jurado

> **El universo cambia. Nuestra herramienta hace que esos cambios sean más fáciles de explorar y comprender.**

### 5.3. Reglas para una presentación creíble

- Mostrar **el resultado antes que el stack tecnológico**.
- Evitar afirmar que identificamos Planet X o descubrimos un objeto nuevo sin validación científica.
- Diferenciar claramente imágenes reales, ilustrativas y simuladas.
- Explicar qué controles evitan confundir un artefacto con movimiento.
- Practicar la explicación con personas que no sepan astronomía.

---

## 6. Preguntas abiertas para debatir en equipo

1. **Fenómeno inicial:** ¿priorizaremos **movimiento aparente**, **cambio de brillo** o la mejor demostración que permitan los datos reales? ¿Qué evidencia exigiríamos?
2. **Alcance de la experiencia:** ¿preferimos 2–3 casos guiados de alta calidad o intentaremos permitir seleccionar libremente cualquier región del cielo?
3. **Valor diferencial:** WiseView e IRSA ya tienen visores. ¿Qué característica educativa o de interpretación guiada haría que nuestro producto sea genuinamente útil?
4. **Criterio de rigor:** ¿qué controles mínimos se necesitan antes de mostrar una diferencia como «posible cambio» y quién revisará esa decisión?
5. **Programación agéntica:** ¿qué formato compartido usarán las especificaciones, contratos, pruebas y prompts para que los agentes implementen módulos compatibles?

**Dinámica sugerida:** cada integrante anota una propuesta y un riesgo por pregunta. El equipo acuerda una decisión provisional, registra la evidencia que falta y asigna una fecha de revisión.

---

## 7. Cierre del Paso 1: preparación para la siguiente fase

Antes de repartir tareas de desarrollo, comprobar que todos puedan explicar, con sus palabras:

- [ ] Qué problema resuelve nuestra aplicación y para quién.
- [ ] Qué representa una observación infrarroja de SPHEREx.
- [ ] Por qué comparar imágenes de fechas distintas requiere controles espaciales y espectrales.
- [ ] Por qué una diferencia aparente no confirma un descubrimiento.
- [ ] Qué módulos conceptuales componen el flujo de datos.
- [ ] Qué datos y evidencias deberán conservarse para el pitch.

**Entregable para cerrar esta fase:** decisión compartida sobre el fenómeno de interés y la experiencia del usuario, junto con una lista de requisitos científicos para buscar un primer par de observaciones candidatas.

### Registro de decisiones (rellenar en equipo)

| Fecha | Decisión | Motivo / evidencia | Responsable | ¿Revisar? |
|---|---|---|---|---|
| — | — | — | — | — |
| — | — | — | — | — |

### Registro de dudas e hipótesis

| Duda o hipótesis | Cómo la comprobaríamos | Estado |
|---|---|---|
| ¿Existen pares de observaciones SPHEREx adecuados para un caso visual claro? | Consultar IRSA y evaluar metadatos y calidad | Pendiente |
| ¿Qué valor diferencial ofrece la interpretación guiada? | Comparar recorridos con herramientas existentes y probar con usuarios | Pendiente |
| ¿Qué alcance puede validarse con el tiempo disponible? | Estimar dependencias y riesgo del MVP | Pendiente |

---

**Nota sobre vigencia:** este documento orienta el diseño. Los enlaces y productos disponibles pueden cambiar; los metadatos concretos de los casos científicos deberán verificarse en IRSA antes de afirmarlos durante la demostración.

**Fuentes oficiales de partida:** los siete enlaces de la sección 4.1. Este documento no sustituye la documentación científica de esas fuentes.
