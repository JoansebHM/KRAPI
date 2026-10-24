# 0007 · Usuario compartido y política de sesión

**Estado:** aceptada · 2026-10

## Contexto

El grupo es pequeño, todos editan todo y no se necesita trazabilidad por persona (los responsables se eligen en cada estudio).

## Decisión

**Un solo usuario** creado con `npm run usuario:crear` y el registro público desactivado. Sesión cerrada tras **2 h de inactividad** (aviso 1 minuto antes) y **7 días** como máximo, aplicada en el cliente porque el plan gratuito no permite configurarla en el servidor. Hay opción de **cerrar en todos los dispositivos** (`scope: global`).

## Descartado

Usuarios individuales (más administración sin beneficio por ahora).

## Consecuencias

Si se cambia la contraseña, conviene cerrar la sesión en todos los dispositivos.
