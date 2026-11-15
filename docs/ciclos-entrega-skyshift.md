# SkyShift — ciclos de entrega del equipo

**Estado:** guía operativa propuesta para revisión humana · **Base original revisada:** `main` en `906094d4e37c9b413f617b9a0f2029b8955d1ad0`, 14 de noviembre de 2026. No certifica que las tareas estén terminadas. Para cambios posteriores consultar `docs/STATE.md` y el historial de Git.

## Cómo usar esta guía

Este documento coordina entregas; no reemplaza `AGENTS.md`, `docs/STATE.md`, los contratos, las fichas, los ADR ni la rúbrica. En caso de conflicto, prevalece `AGENTS.md`; la guía de onboarding contiene la autoridad humana y `STATE` registra el estado y bloqueos. Resolver contradicciones con los dueños y actualizar los documentos afectados en el mismo PR, sin convertir un borrador en acuerdo por omisión. Las rutas nuevas de abajo son **propuestas**, no archivos existentes ni una arquitectura obligatoria. Las rutas de implementación definitivas se acuerdan en las fichas y con sus dueños.

El repositorio ya contiene código, contratos, fichas, pruebas y evidencias. Que exista una pieza no demuestra que esté integrada, aprobada o científicamente validada. Confirmar la rama, el commit y los PR antes de considerar algo disponible en `main`. Los roles confirmados por el usuario son: **Dax** (visor y regiones), **Mateo** (movimiento y brillo), **Sebastián** (reglas e interpretación), **Daniel** (frontend y UX), **Johann** (datos e integración). La asignación detallada de carpetas está pendiente; respetar a los dueños de código ya existentes.

### Alcance y reglas compartidas

- **Estrategia A: casos guiados con imágenes SPHEREx reales**, sus fuentes y procedencia. El objetivo son cinco regiones asociadas a los cinco objetos de prueba del reto: Estrella de Barnard, Epsilon Indi B, WISE 0855, RW Aurigae y R Draconis. La disponibilidad de observaciones, pares comparables y calidad debe verificarse por región. Tener imágenes no garantiza una medición válida ni un cambio; registrar cobertura y limitaciones sin rellenar huecos con datos inventados. La entrada libre RA/Dec y el resto del reto siguen siendo requisitos de producto a verificar, aunque los casos guiados sean la ruta prioritaria de demo.
- **Observado:** diferencia aparente; **evaluado:** persiste después de los controles de calidad exigidos y demostrados; **confirmado:** requiere evidencia científica suficiente y juicio humano externo al automatismo. El software nunca asigna confirmado por sí solo. Si falta un control, mostrar la razón y no elevar el estado; ausencia de cambio significativo no demuestra ausencia de cambio.
- Cada imagen conserva archivo o identificador verificable, colección, fecha, banda/longitud de onda y procedencia. Las teselas HiPS/PNG son para navegación y visualización, no para medición científica. Los datos sintéticos se etiquetan y solo prueban software; nunca se presentan como observaciones.
- La comparación exige revisar región, visitas/fechas, compatibilidad espectral, alineación, calidad y FLAGS, incertidumbre y procedencia. No inventar umbrales. `docs/context/12-mapa-de-datos-spherex.md` y `docs/reviews/2026-11-14-triage-specs-main.md` identifican discrepancias entre propuestas: Sebastián y los dueños deben resolverlas antes de implementar o afirmar evaluación. `Observation` de 0001 y `AnalysisResult` de 0010 son borradores; el contrato actual no implica que exista una API de medición.
- La idea y las decisiones de producto/arquitectura son humanas. Antes de delegar un módulo, aprobar una ficha basada en `docs/specs/0000-plantilla-ficha-agente.md`. Los agentes investigan y ejecutan tareas autorizadas; cada persona revisa sus resultados. Registrar uso relevante de IA en `docs/AI_USAGE.md`.

### Ritmo, dependencias y fechas

Los ciclos son puertas de entrega, no necesariamente trabajo secuencial: investigación y fichas pueden avanzar en paralelo; implementación compartida depende de interfaces y fichas aprobadas. Lo ya implementado se somete a las mismas puertas de revisión. Ruta crítica: **contratos mínimos → caso real verificable → integración → validación → publicación y envío**. No esperar a completar cinco mediciones para revisar el flujo de un caso. Al congelar, se atienden defectos críticos y evidencia, no nuevas funciones sin decisión del equipo.

Según `docs/STATE.md` y `docs/context/01-reto-y-jurado.md`, hora de Ecuador (UTC−5): **domingo 15 de noviembre, 02:00**, congelación interna de funciones; **09:00**, entrega local y carga global; **11:00–13:30**, pitch y preguntas; **23:59**, cierre global. Verificar con organización la duración del pitch, los formularios y cualquier actualización. El equipo debe asignar horas internas y responsables de envío antes del cierre; no se inventan aquí.

### Acuerdo común para todos los PR

Rama por tarea `tipo/area-descripcion-corta`, commits en inglés y PR pequeño contra la base acordada; nunca push directo a `main`. Un humano aprueba, con revisión de los dueños afectados. Usar `.github/pull_request_template.md`: descripción, ficha/ADR, evidencia de tests, lint/typecheck y build; UI además capturas de escritorio y móvil, modo claro y proyector. Si una comprobación no aplica o falla, explicar por qué y registrar el riesgo; no declarar terminado sin la evidencia requerida por `AGENTS.md`. Cambios de API: primero `contracts/openapi.yaml`, luego código y tipos generados. Documentar nuevas dependencias, compatibilidad Fedora/Windows y cambios de interfaz; no incluir secretos. Al terminar cada sesión, actualizar `docs/STATE.md` en ≤5 líneas; anotar IA y ADR cuando correspondan. Cada puerta termina con evidencia enlazada desde el PR y aceptación humana, no solo con la apertura del PR.

## Ciclo 1 — Alineación y contratos

- **Objetivo:** acordar alcance mínimo, responsables, fronteras entre módulos y contratos utilizables por consumidores.
- **Responsables:** Johann coordina datos e integración; los cinco deciden y aprueban sus fronteras. Sebastián revisa ciencia; Dax, regiones; Mateo, mediciones; Daniel, necesidades de UI.
- **Entradas/dependencias:** onboarding, `AGENTS.md`, `STATE`, ADR 0001–0005 y 0040–0044, `contracts/openapi.yaml`, esquemas en `contracts/`, fichas 0001/0002/0010 y revisión de triage. Identificar qué existe en la rama de destino.
- **Entregables/rutas:** actualizar `docs/STATE.md` con reparto y bloqueos; ADR en `docs/adr/` solo para decisiones nuevas; contratos existentes en `contracts/` y fichas afectadas en `docs/specs/` revisados por sus dueños. Acordar datos de región, observación/serie, errores, procedencia, estados y, solo si se implementa, medición con incertidumbre. Ninguna ruta o campo propuesto se considera aprobado hasta el PR.
- **Aceptación:** cada consumidor puede identificar entradas, unidades, salidas, errores, ejemplos reales o sintéticos etiquetados, versión y dueño; la API actual se distingue de ampliaciones propuestas. Resolver explícitamente discrepancias de visitas, FLAGS, selección espectral, paralaje y controles señaladas en el triage; corregir documentación desactualizada con fuentes.
- **Pruebas/evidencia:** validación de esquemas y ejemplos, por ejemplo `mise run check-contracts` si está disponible; recorrido de un ejemplo de observación a UI y casos ausentes/incompatibles; acta de decisiones y revisiones enlazadas.
- **PR/revisores:** Johann propone cambios compartidos; revisan Mateo, Sebastián, Daniel y Dax según interfaz, y aprueba un humano. Los ADR y fichas siguen sus propietarios y convenciones existentes.
- **Bloqueo/fallback:** si no se ratifica una interfaz, investigación y prototipos aislados con ejemplos sintéticos marcados pueden avanzar; no integrar un contrato supuesto. Registrar preguntas y fecha de decisión en `STATE`.
- **Terminado cuando:** acuerdos humanos y contratos mínimos están revisados, versionados e integrados; cada persona sabe qué puede construir y qué debe pedir a otra.

## Ciclo 2 — Investigación y validación de las cinco regiones

- **Objetivo:** verificar qué muestran y qué permiten comparar las observaciones disponibles para los cinco objetos, con límites claros.
- **Responsables:** Sebastián coordina interpretación y selección; Johann recupera y documenta datos; Dax verifica región/cobertura; Mateo revisa aptitud para medir; Daniel valida comprensión de los casos.
- **Entradas/dependencias:** fuentes SPHEREx/IRSA, `docs/context/03-datos-y-apis.md`, `docs/context/12-mapa-de-datos-spherex.md`, fichas y contratos vigentes. Corregir información antigua de λ según revisión humana del triage.
- **Entregables/rutas:** inventario propuesto `docs/research/regiones-guiadas.md`, con una fila por objeto: coordenadas y época/fuente, búsqueda y fecha, identificadores y enlaces de producto, colección, fechas de adquisición y visitas, detector/λ, cobertura, calidad, limitaciones, estado y siguiente acción. Los manifiestos/paquetes reales van donde acuerde Johann, siguiendo contratos existentes; añadir referencias a evidencia reproducible en `docs/reviews/`.
- **Aceptación:** cada fila permite rastrear y reproducir la consulta; distinguir imagen disponible, par comparable y medición evaluable. Verificar posición propagada y cobertura; no reutilizar la demo antigua de WISE 0855 que no contiene el objeto. La disponibilidad es por región y producto, no promesa de cinco detecciones. ε Indi B es candidato exploratorio, no resultado evaluado: sus controles pendientes figuran en ficha 0010 y triage. No declarar un caso de brillo validado por existir estrellas variables saturadas.
- **Pruebas/evidencia:** conservar consultas o procedimientos, identificadores/versiones y fechas de acceso; inspección de metadatos, cobertura y controles de calidad; revisión cruzada de una muestra real. Registrar explícitamente fallos, incertidumbres y `[VERIFICAR]`.
- **PR/revisores:** Sebastián y Johann organizan PR documental y de manifiestos; revisan Mateo y Dax la validez técnica y Daniel los mensajes; aprobación humana.
- **Bloqueo/fallback:** si IRSA falla, usar un paquete real previamente descargado con procedencia y licencia verificadas; si falta un par válido, mostrar región disponible y razón de no evaluabilidad. Buscar una variable adicional solo si el equipo la aprueba, sin sustituir silenciosamente los cinco objetos del reto.
- **Terminado cuando:** existen cinco fichas de investigación con estado y evidencia —incluida la falta de datos cuando corresponda— y el equipo selecciona los casos demostrables sin inventar hallazgos.

## Ciclo 3 — Fichas de los cinco roles

- **Objetivo:** transformar los acuerdos en tareas acotadas y aprobadas antes de delegar módulos a agentes.
- **Responsables:** cada dueño redacta su ficha; Johann coordina interfaces y Sebastián revisa afirmaciones científicas.
- **Entradas/dependencias:** plantilla `docs/specs/0000-plantilla-ficha-agente.md`, contratos acordados, ADR existentes, inventario de regiones y revisión del código actual. Se pueden redactar en paralelo con el ciclo 2; no se aprueba una interfaz dependiente aún no resuelta.
- **Entregables/rutas:** reutilizar o actualizar fichas existentes en `docs/specs/` y crear únicamente las faltantes con número acordado. Cada ficha incluye objetivo, entradas/salidas exactas, unidades, restricciones, fallos, pruebas, aceptación y fuentes:
  - **Dax:** geometría/malla y regiones, coordenadas, selección y frontera con visor; revisar 0003 y ADR 0042 antes de proponer cambios.
  - **Mateo:** movimiento y brillo, datos nativos, incertidumbre, no detección y trazabilidad; revisar 0010/0011 y discrepancias del triage.
  - **Sebastián:** reglas, controles, estados, explicaciones, límites y causas de rechazo; umbrales pendientes como decisiones científicas humanas.
  - **Daniel:** navegación, casos guiados, accesibilidad, estados de carga/error, semáforo y procedencia; revisar ADR 0043 y norma UI en `docs/context/07-estandar-ui.md`.
  - **Johann:** consulta, transformación, caché, manifiestos, fallos de datos, contratos e integración; revisar 0001, ADR 0040/0041 y `contracts/`.
- **Aceptación:** las cinco fichas identifican dueño, estado, archivos autorizados, dependencias y consumidor; definen pruebas válidas, incompletas e incompatibles con resultado esperado. Una ficha ya existente se revisa, no se duplica. Las decisiones pendientes no aparecen como hechos.
- **Pruebas/evidencia:** lectura cruzada de ejemplos de extremo a extremo, comprobación contra esquemas y fuentes; aprobación humana identificada en cada PR.
- **PR/revisores:** cada dueño abre PR de su ficha; revisan Johann y el consumidor directo, además de Sebastián para ciencia y Daniel cuando afecta UI. Un humano aprueba.
- **Bloqueo/fallback:** si falta un contrato, limitar la ficha a investigación y marcar dependencias; Sebastián puede preparar tabla fenómeno/evidencia/limitación y reglas sin fijar tolerancias. No delegar implementación del módulo hasta aprobar la ficha.
- **Terminado cuando:** cinco responsabilidades tienen fichas aprobadas o una decisión humana explícita de reducir alcance, con límites y dependencias registradas.

## Ciclo 4 — Desarrollo agéntico y entregas por módulo

- **Objetivo:** completar o adaptar módulos existentes conforme a las fichas aprobadas y generar evidencia revisable.
- **Responsables:** cada dueño humano dirige y revisa su agente; Johann coordina las fronteras; Sebastián revisa ciencia y Daniel experiencia.
- **Entradas/dependencias:** fichas aprobadas, interfaces del ciclo 1, resultados del ciclo 2, ADR y código de la rama base. Una rama/worktree por tarea; no editar simultáneamente los mismos archivos.
- **Entregables/rutas:** cambios en las rutas acordadas de `frontend/`, `backend/`, `contracts/`, `scripts/`, pruebas y documentación; no crear módulos paralelos sin acuerdo. Registrar decisiones en `docs/adr/`, uso de IA en `docs/AI_USAGE.md` y estado en `docs/STATE.md`.
- **Aceptación:** cada módulo respeta su contrato, valida entradas y errores, conserva procedencia, no eleva indebidamente el semáforo y permite instalarse y ejecutarse en Fedora y Windows según instrucciones del dueño. Los cambios de interfaz se negocian antes con el consumidor.
- **Pruebas/evidencia:** pruebas de lógica con casos válidos, ausentes e incompatibles; sintéticos marcados; tests, lint/typecheck y build del área; captura si cambia UI; salidas y limitaciones en PR. Usar los comandos documentados en `docs/context/08-entorno-y-comandos.md` o equivalentes documentados.
- **PR/revisores:** un PR pequeño por tarea/módulo, con ficha enlazada; consumidor directo y dueño de archivos afectados revisan; Sebastián revisa reglas y Daniel UI. Aprobación humana y plantilla completa.
- **Bloqueo/fallback:** dependencia externa o contrato ausente: usar fixture sintética marcada para probar interfaz aislada, sin promocionarla a demo científica; informar bloqueo. Si una medición no llega a tiempo, mantener visualización guiada y explicar que no se ha evaluado.
- **Terminado cuando:** cada cambio aprobado está integrado en la rama acordada con evidencia y sin bloqueos críticos abiertos; lo excluido queda registrado.

## Ciclo 5 — Integración y recorrido completo

- **Objetivo:** conectar datos, región, visualización y, si existe, análisis/interpretación en una versión reproducible.
- **Responsables:** Johann coordina; Dax integra región/visor, Mateo mediciones disponibles, Sebastián estados y explicaciones, Daniel flujo y presentación.
- **Entradas/dependencias:** módulos aprobados, contratos y al menos un caso real trazable. Revisar la rama `integration/main-ready` mencionada en `STATE` y su PR antes de asumir que sus funciones están en `main`.
- **Entregables/rutas:** PR de integración hacia la rama acordada; manifiesto y activos reales permitidos en las rutas acordadas, por ejemplo la demo existente `frontend/public/demo/`; instrucciones en `README.md` y evidencia en `docs/reviews/integration/` o PR. Actualizar `STATE` con commit y brechas.
- **Aceptación:** desde selección de región hasta serie y procedencia se conserva identidad; fechas, banda y estados corresponden a los datos. Los errores de red, datos ausentes y casos no comparables son comprensibles. Confirmar capacidades reales de búsqueda/RA-Dec, animación y controles; no presentar como implementada una API de medición que aún no existe.
- **Pruebas/evidencia:** pruebas de contrato, integración y recorrido real; tests/lint/build y capturas; probar carga en vivo y respaldo, además de desktop/móvil. Verificar tests intermitentes y paridad pendientes mencionados en `STATE`, registrando resultado y commit.
- **PR/revisores:** Johann abre o coordina PR de integración; revisan los cuatro dueños de las fronteras y un humano aprueba. Resolver conflictos con cada propietario.
- **Bloqueo/fallback:** ante IRSA o hosting inestable, paquete local real trazable y recorrido grabado como respaldo; no presentar un respaldo local como demo pública. Si falta una integración, desactivar el control y declarar el límite.
- **Terminado cuando:** recorrido de extremo a extremo aprobado con evidencia, versión identificada y fallos críticos resueltos o alcance reducido mediante decisión humana.

## Ciclo 6 — Validación científica, funcional y UX

- **Objetivo:** verificar que lo mostrado sea correcto, accesible y defendible ante el jurado.
- **Responsables:** Sebastián lidera ciencia; Mateo verifica análisis; Johann procedencia y datos; Dax geometría; Daniel UX. Todos participan en revisión cruzada y prueba con usuarios.
- **Entradas/dependencias:** versión integrada, inventario de regiones, normas de UI, triage, fuentes, contratos y casos de error.
- **Entregables/rutas:** informe propuesto `docs/reviews/validacion-final.md`, con commit, entorno, casos, resultados, evidencia, defectos y responsables; actualizar `STATE` y documentación científica cuando corresponda.
- **Aceptación:** revisar la misma región, visitas separadas, geometría, λ, FLAGS y calidad, incertidumbre y procedencia antes de atribuir «evaluado». No convertir ausencia de datos en ausencia de cambio. Verificar que las etiquetas y el pitch no prometen descubrimiento; comprobación humana de cualquier afirmación y de criterios aún `[VERIFICAR]`. UX cumple `docs/context/07-estandar-ui.md`, navegación por teclado y estados de carga/error, claridad para público no experto y lectura en móvil/proyector.
- **Pruebas/evidencia:** repetir pruebas automatizadas pertinentes y probar un recorrido con datos reales, uno no comparable y uno sin conexión; guardar capturas y observaciones de al menos una prueba humana, identificando límites. Revisar procedencia, accesibilidad y consistencia de textos; dejar defectos y decisiones registradas.
- **PR/revisores:** PR de correcciones por dueño; Sebastián y Mateo revisan ciencia, Daniel UX, Johann datos y Dax representación. Aprobación humana tras evidencia.
- **Bloqueo/fallback:** ante duda científica, degradar al estado sustentado o mostrar «no evaluable» con razón; ocultar medición no validada. Para fallo grave de UX o red, usar recorrido limitado y respaldo real documentado.
- **Terminado cuando:** no quedan defectos críticos sin decisión, la evidencia está enlazada y los cinco aceptan el alcance real de la demo.

## Ciclo 7 — Demo, pitch y paquete de envío

- **Objetivo:** preparar y ensayar una presentación fiel al producto y todos los entregables exigidos.
- **Responsables:** Daniel coordina demo/UX; Sebastián ciencia y narrativa; Johann enlaces, despliegue y envío técnico; Dax visualización; Mateo método y preguntas de medición. El equipo decide portavoz y sustituto.
- **Entradas/dependencias:** versión validada, fuentes y evidencias, rúbrica local en `docs/fuentes/guia-participantes-y-rubrica-sangolqui-2026.pdf`, `docs/context/01-reto-y-jurado.md` y estado real del pitch; confirmar ubicación del material externo señalado en `STATE`.
- **Entregables/rutas:** `README.md` bilingüe ES/EN; ficha de proyecto ES/EN con fuentes y declaración de IA; slides PDF de máximo siete, bilingües o versiones ES y EN; demo pública y respaldo offline real; guion y enlaces propuestos en `docs/pitch/`; `docs/AI_USAGE.md` actualizado. Video opcional ≤30 s según guía del repositorio. Mantener `LICENSE` abierta en raíz.
- **Aceptación:** narrativa problema → datos SPHEREx y método → demo → impacto y límites; semáforo y procedencia visibles; no afirmar capacidades ni resultados ausentes. README, ficha y slides cumplen idiomas y atribuciones; enlaces sin login y accesibles; confirmar duración y formato con organización. Las imágenes generadas con IA llevan marca de agua y se respetan las reglas de identificadores NASA del repo.
- **Pruebas/evidencia:** ensayo cronometrado con preguntas para los cinco; abrir repo, demo, PDFs y referencias en ventana privada y dispositivo distinto; comprobar reproducción del respaldo, capturas y enlaces. Registrar versión y evidencia en PR o `docs/reviews/`.
- **PR/revisores:** Daniel coordina contenidos visuales; Johann revisa enlaces y despliegue, Sebastián/Mateo ciencia y Dax visualización; equipo aprueba el paquete final. No confundir PR aprobado con envío completado.
- **Bloqueo/fallback:** demo en vivo falla: usar respaldo offline o grabación identificados como tales, conservando demo pública y reportando cualquier falla. Si falta traducción o un enlace, priorizar corregirlo antes de las 09:00; registrar riesgo si no se logra.
- **Terminado cuando:** paquete ES/EN, demo, respaldo y pitch ensayado están aprobados y accesibles antes de la entrega local.

## Ciclo 8 — Envío y cierre

- **Objetivo:** entregar a tiempo, comprobar recepción y conservar una versión reproducible de lo enviado.
- **Responsables:** Johann coordina; **decisión humana pendiente:** nombrar titular y suplente con acceso a formulario local y plataforma global. Todos revisan; Daniel confirma demo, Sebastián fuentes y mensajes, Mateo análisis y Dax visor.
- **Entradas/dependencias:** paquete aprobado del ciclo 7, formularios y credenciales de los responsables, fecha y requisitos vigentes confirmados con organización.
- **Entregables/rutas:** formulario local y plataforma global completados; registro propuesto `docs/pitch/entrega.md` con hora Ecuador, enlaces públicos, versión/commit, responsable, comprobantes sin datos sensibles y estado de cada envío; `docs/STATE.md` actualizado. No guardar credenciales ni datos privados en el repo.
- **Aceptación:** antes de las 09:00 del 15-nov se comprueba recepción local y carga global, repo público con licencia, demo accesible, ficha ES/EN, fuentes, IA y slides dentro del límite. Se verifica en incógnito cada enlace. Tras el pitch, cualquier reenvío global hasta 23:59 se decide y verifica con el equipo: cuenta la última versión según la guía del repo.
- **Pruebas/evidencia:** capturas o confirmaciones de recepción, hora, enlace y commit enviado; segunda persona comprueba desde sesión privada y contrasta la lista de `docs/context/01-reto-y-jurado.md`.
- **PR/revisores:** PR documental de cierre coordinado por Johann y revisado por otro integrante; el envío real lo ejecuta el responsable humano designado. No esperar al merge del registro si amenaza el plazo de envío.
- **Bloqueo/fallback:** si un formulario o enlace falla, registrar hora/error, contactar organización mediante el canal acordado y usar el mecanismo de contingencia que indique; conservar paquete y pruebas. Si no hay confirmación de recepción, mantener el envío como pendiente, no como completado.
- **Terminado cuando:** ambas entregas tienen confirmación verificable, enlaces y versión archivados y el equipo conoce cualquier limitación o reenvío.

## Decisiones humanas pendientes y seguimiento inmediato

1. Definir dueños de carpetas, rama base, interfaz mínima y responsables/suplentes de envío; mantener `STATE` actualizado.
2. Resolver los conflictos de las fichas 0001/0010 con contrato, ficha 0002 y mapa de datos, especialmente visitas, FLAGS, λ y paralaje; acordar los criterios científicos y dejar ADR/ficha actualizados donde corresponda.
3. Elegir los casos realmente demostrables y el alcance de medición; mantener cinco objetos como objetivo condicionado a evidencia y conservar los requisitos del reto que queden pendientes.
4. Confirmar hosting, disponibilidad pública, tiempos internos, duración del pitch y vías de entrega con la organización.
5. Antes de cada sesión, leer `STATE`; al cerrarla, anotar máximo cinco líneas de avance, pendiente y bloqueo. En cada puerta, enlazar PR, commit, pruebas y aprobación humana.
