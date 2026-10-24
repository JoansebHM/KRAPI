# 0018 · Lugares en el mapa: marcadores HTML, zonas en capas y `lugares_mapa()`

**Estado:** aceptada · 2026-10

## Contexto

Hay que dibujar los puntos con el color y el ícono de su categoría (los mismos de la lista de categorías) y las zonas como polígonos, en modo claro y oscuro, y que se puedan tocar con el dedo. PostgREST devuelve la columna `geom` en binario (WKB), que MapLibre no entiende.

## Decisión

- **Datos:** la función SQL `lugares_mapa()` devuelve los lugares no archivados con su forma en GeoJSON. El color y el ícono se toman en la app de las categorías ya cargadas.
- **Puntos:** `Marker` de MapLibre con un botón HTML que reutiliza `IconoCategoria` (con un portal de React). Tiene área de toque de 44 px, nombre accesible y se puede usar con el teclado. Además no se pierde al cambiar el mapa base.
- **Zonas:** capas `fill` y `line` en lila, para distinguirlas del límite azul de Manila. Al tocar zonas superpuestas se abre la más pequeña.
- **Sin categoría:** círculo blanco con borde gris, para que no se confunda con la categoría "Gris".
- Tocar un lugar abre `/lugares/:id`, con una ficha básica que completa la #16.

## Descartado

- Capas `symbol` con íconos dibujados en el mapa: hay que generar una imagen por cada combinación de color e ícono, el área de toque es pequeña y no son accesibles.
- Convertir WKB a GeoJSON en el navegador: agrega una dependencia para algo que PostGIS ya hace.

## Consecuencias

Los marcadores HTML rinden bien con cientos de puntos, que es la escala de un barrio. Si algún día fueran miles, convendría agruparlos (clustering) o pasar a capas `symbol`. Las zonas no se pueden recorrer con el teclado: los filtros y la lista de lugares (#21) deben ofrecer otra forma de llegar a ellas.
