# 0008 · Lugares (puntos y zonas) con histórico de estudios, sin salidas

**Estado:** aceptada · 2026-10

## Contexto

Se discutió agrupar estudios por "salida" de campo, pero no todos salen el mismo día ni juntos.

## Decisión

Un **lugar** se crea una vez y acumula **estudios** (visitas) con su fecha, horas, responsables, entrevistado y evidencias. Las **zonas** son polígonos opcionales que marcan lo cubierto y muestran los puntos que contienen. Los estudios de puntos y de zonas tienen la misma estructura. No hay salidas, tipos de estudio ni datos medibles por ahora.

## Descartado

Entidad "salida"; estudios con tipo; tabla de mediciones.

## Consecuencias

Se puede agregar una tabla de mediciones más adelante sin romper el modelo.
