# 0011 · Aviso de duplicado a menos de 15 m

**Estado:** aceptada · 2026-10

## Contexto

En campo es fácil crear dos veces el mismo local.

## Decisión

Al crear un punto se consulta `ubicaciones_cercanas` (15 m). Si hay alguno, la app pregunta si es el mismo, para **agregarle el estudio** en vez de duplicarlo.

## Descartado

Bloquear puntos cercanos (hay locales vecinos legítimos).

## Consecuencias

Es un aviso, no una restricción.
