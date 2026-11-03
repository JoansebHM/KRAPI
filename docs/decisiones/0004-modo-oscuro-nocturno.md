# 0004 · Modo oscuro con estilo nocturno derivado de Liberty

**Estado:** aceptada · 2026-10

## Contexto

El estilo oscuro de OpenFreeMap ocultaba los nombres de los locales, que son clave en campo.

## Decisión

Generar el estilo oscuro transformando Liberty (`toNightStyle`): fondos oscuros, etiquetas claras con halo y alto contraste.

## Descartado

Usar el estilo "dark" tal cual.

## Consecuencias

> **Actualización ([decisión 0033](0033-vistas-del-mapa.md)):** los nombres de los locales del mapa base ahora se ocultan por defecto y se activan con un interruptor en Filtros. El estilo nocturno se sigue generando igual.


Si se configura `VITE_MAP_STYLE_URL_DARK`, se usa ese estilo en lugar del generado.
