# 0033 · Vistas del mapa y locales del mapa base

**Estado:** aceptada · 2026-11 · Refs #147

## Contexto

El mapa solo tenía una vista de calles (OpenFreeMap Liberty) y mostraba los nombres de todos los locales de Manila. Mientras el equipo lleva pocos estudios, esos nombres hacen ruido y se confunden con los lugares registrados en KIRA. Además se quería ver el barrio con otros mapas base.

## Decisión

- **Tres vistas**, con un botón de capas arriba a la izquierda del mapa (debajo de "Filtros"): **Calles** (la de siempre, con su modo oscuro derivado, [decisión 0004](0004-modo-oscuro-nocturno.md)), **Topográfico** (`topo-v2`) y **Calles simplificado** (`dataviz`, con las calles dibujadas más anchas y con borde oscuro para que se noten). Las dos últimas son estilos de MapTiler, con su versión oscura según el tema. La vista elegida se guarda en el dispositivo (`krapi-vista-mapa`).
- **Clave de MapTiler:** `VITE_MAPTILER_API_KEY`. Sin ella, el botón de vistas no aparece y el mapa sigue en Calles. La clave queda visible en el navegador, así que se **restringe por dominio** en el panel de MapTiler (en "Allowed HTTP origins" va solo el nombre del dominio, sin `https://`, por ejemplo `localhost` y el dominio de Vercel).
- **Los locales del mapa base se ocultan por defecto** en todas las vistas (se esconden las capas `poi` del estilo). En **Filtros** hay un interruptor "Mostrar locales del mapa" para verlos. No es un filtro de datos: no cuenta en el contador del botón, no lo borra "Limpiar filtros" y se recuerda en el dispositivo (`krapi-locales-del-mapa`). Los lugares y elementos de KIRA no se ven afectados.
- **Sin cambios en la base de datos.**

## Descartado

- **Satélite y satélite con calles (MapTiler):** se implementaron y se quitaron. Sobre Manila la imagen se ve borrosa al acercarse, que es justo cuando más se usa el mapa.
- **Vista de transporte:** OpenStreetMap casi no tiene paradas ni rutas de Medellín (en la zona había 2 paradas), así que la vista quedaba prácticamente vacía. Si se retoma, haría falta cargar los datos abiertos de rutas y paradas de la Alcaldía o del Metro como una capa propia.
- **Buscar direcciones (geocodificación) con MapTiler:** se probó y se retiró. Devuelve la calle completa, no el predio, porque OpenStreetMap no tiene los números de las casas de Medellín.
- **Seguir mostrando los locales siempre:** era la decisión de la 0004 (los nombres "son clave en campo"). Ahora son opcionales y se activan en Filtros.

## Consecuencias

- `MapView` recibe la vista y lee del contexto de filtros si se muestran los locales; cambiar cualquiera de las dos recarga el mapa base (las capas propias se vuelven a agregar en `style.load`).
- Las vistas extra dependen de un servicio externo y de su cuota gratuita mensual; sin conexión o sin cuota, solo funciona Calles.
- Las pruebas simulan MapTiler (`https://api.maptiler.com/**`) y usan una clave falsa en `.env.e2e`.
