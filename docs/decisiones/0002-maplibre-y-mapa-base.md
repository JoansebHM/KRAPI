# 0002 · MapLibre GL y mapa base provisional OpenFreeMap

**Estado:** aceptada · 2026-10

## Contexto

El equipo ya conocía MapLibre. No estaba claro qué proveedor de teselas se iba a usar con la clave existente (issue #6).

## Decisión

**MapLibre GL 6** con **OpenFreeMap** (Liberty) como mapa base provisional: es gratis y no pide clave. Los estilos se pueden cambiar con `VITE_MAP_STYLE_URL_LIGHT` y `VITE_MAP_STYLE_URL_DARK`. El worker se configura en `maplibre.ts` porque Vite no lo resuelve solo.

## Descartado

Mapbox GL (licencia y costo); Leaflet (sin teselas vectoriales).

## Consecuencias

Cuando se defina el proveedor (#6), solo cambian las variables de entorno.
