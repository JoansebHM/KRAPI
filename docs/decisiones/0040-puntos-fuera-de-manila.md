# 0040 · Puntos y elementos pueden quedar fuera de Manila

**Estado:** aceptada · 2026-11 · reemplaza en parte la [decisión 0003](0003-limite-manila.md)

## Contexto

Hay lugares aledaños al barrio que el equipo también necesita en el mapa. La regla de la decisión 0003 («ningún lugar puede quedar fuera del polígono») obligaba a descartarlos: la mira se ponía roja, «Usar mi ubicación» no creaba el punto y la base de datos rechazaba la fila.

## Decisión

- **Los puntos y los elementos se pueden crear y mover a cualquier posición** que deje navegar el mapa. La mira ya no se pone roja para ellos y «Usar mi ubicación» crea el punto donde está la persona, esté o no dentro de Manila.
- **Las zonas siguen dentro de Manila.** Son áreas del barrio (sus tipos, sus recorridos), no tiene sentido dibujarlas afuera. Lo mismo vale para las zonas de asignación de las salidas (`asignaciones_dentro_de_manila`, sin cambios).
- **Base de datos:** la migración `20261122120000_puntos_fuera_de_manila` cambia `ubicaciones_dentro_de_manila` para que solo exija estar dentro del polígono cuando `tipo = 'zona'`.
- **App:** `MiraCentral` recibe `limitarAManila` (por defecto `true`). Crear punto, crear elemento y mover punto lo ponen en `false`; dibujar zonas lo deja como estaba.
- **La navegación del mapa no cambia:** sigue limitada a **1 km** alrededor del borde (`maxBounds`, decisión 0003), así que ese es el alcance práctico de los puntos. Si hace falta registrar algo más lejos, se amplía `MANILA_BUFFER_METERS`.

## Descartado

- **Quitar la regla para todo.** Una zona fuera del barrio sería casi seguro un error de dibujo.
- **Un segundo polígono «Manila ampliada».** Obliga a mantener otra copia del polígono en TypeScript y en SQL, y a decidir dónde termina «aledaño».

## Consecuencias

- Los puntos de afuera aparecen en el mapa, filtros, analítica y exportación como cualquier otro. No hay forma de distinguirlos de los de adentro salvo por su posición.
- Quien quiera saber cuáles quedaron fuera puede consultarlos con `st_disjoint(geom, limite_manila())`.
