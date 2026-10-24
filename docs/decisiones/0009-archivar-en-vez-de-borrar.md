# 0009 · Archivar en vez de borrar

**Estado:** aceptada · 2026-10

## Contexto

El histórico es el valor del estudio y se quiere evitar perderlo por error.

## Decisión

Lugares y estudios se **archivan** (`archivada_en` / `archivado_en`). Un lugar tiene **estado** activo/cerrado: si cierra se marca, y si abre otro negocio se crea un lugar nuevo. Solo se borra de verdad una **evidencia equivocada** o un lugar sin estudios.

## Descartado

Borrado con cascada.

## Consecuencias

Las consultas siempre filtran lo archivado.
