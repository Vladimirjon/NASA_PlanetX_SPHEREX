# 0030 · Validación sin red y vista local

- Estado: implementación solicitada por Sebastián; uso científico de umbrales y contratos sigue sujeto a sus límites documentados.
- Fecha: 2026-11-14.
- Decidido por: Sebastián solicitó código y servidor local; elección técnica realizada para esta tarea.

## Contexto

Mateo necesita funciones reutilizables para revisar datos ya obtenidos de Johann. La experiencia debe mostrar las razones de un resultado sin atribuir una detección o un cambio que no haya sido evaluado.

## Opciones consideradas

1. Funciones Python sin dependencias más página estática: se integran sin red ni cambios en contratos; no leen FITS directamente.
2. API nueva y pipeline FITS completo: permitiría automatizar más pasos, pero dependería de contratos y módulos todavía en evolución.

## Decisión

Se implementan funciones Python de validación sin dependencias de terceros y una vista estática de casos reales. La página consume un informe generado por Python y no expone API. Las tolerancias son explícitas y la selección espectral no equivale a una validación científica.

## Consecuencias

Se puede ejecutar en Fedora y Windows con Python 3.11 o posterior. El consumo de `Observation`, la lectura de FITS, las mediciones, los controles de fuente y la evaluación de las respuestas espectrales completas siguen en los módulos correspondientes. Una API futura se definirá primero en `contracts/openapi.yaml`.
