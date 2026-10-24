# 0003 · Todo dentro de Manila; navegación hasta 1 km alrededor

**Estado:** aceptada · 2026-10

## Contexto

El estudio cubre solo el barrio Manila. Datos fuera del barrio serían errores.

## Decisión

El mapa no deja alejarse más de **1 km** del borde del barrio (`maxBounds`). Ningún lugar puede quedar fuera del polígono: la app avisa y la base de datos lo impide con `ubicaciones_dentro_de_manila`. El polígono existe en `manila.ts` y en `limite_manila()`.

## Descartado

Validar solo en el frontend.

## Consecuencias

Si el polígono cambia, hay que actualizar los dos lugares y crear una migración.
