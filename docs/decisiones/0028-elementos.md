# 0028 · Elementos: puntos sin estudios que reciben evidencias

**Estado:** aceptada · 2026-10

## Contexto

En campo hay cosas del barrio que vale la pena ubicar y documentar con fotos, pero que no son lugares de estudio: canecas de basura, postes, árboles, alcantarillas, parqueaderos… La única forma de registrarlas era como un punto con un estudio inventado, lo que llenaba el histórico de visitas que nunca ocurrieron y mezclaba esos puntos con los locales en el mapa y en los filtros (issue #127).

## Decisión

- **Nuevo tipo de ubicación `elemento`** (además de `punto` y `zona`). Es un POINT dentro de Manila con nombre, categoría y descripción; no tiene dirección, contacto ni estado. El nombre "elemento" se eligió frente a "punto de referencia" (suena a un sitio para orientarse y es largo) y "mobiliario urbano" (deja por fuera árboles, alcantarillas y parqueaderos).
- **Un elemento no tiene estudios** (lo impide el trigger `validar_ubicacion_de_estudio()`). **Sus evidencias cuelgan de él directamente:** `evidencias.estudio_id` deja de ser obligatoria y se agrega `evidencias.ubicacion_id`; cada evidencia tiene exactamente una de las dos, y `ubicacion_id` solo puede apuntar a un elemento. Los archivos van en `elementos/<ubicacion_id>/` dentro del mismo bucket, con las mismas políticas.
- **El tipo de un lugar no cambia** (trigger `tipo_de_ubicacion_fijo()`), y en la app no se convierte un elemento en lugar de estudio ni al revés: cambiarlo dejaría estudios o evidencias sueltas.
- **Borrar:** un elemento solo se borra de verdad si no tiene evidencias (así no se pierden archivos de una vez); si no, se archiva, como cualquier lugar.
- **Categorías compartidas, con su uso:** `categorias.aplica_a` dice si una categoría es de `lugares`, `elementos` o `ambos` (por ejemplo, Parqueadero). Las que ya había quedaron como lugares. Solo filtra el selector de la app, no es una regla de la base de datos: así cambiar el uso de una categoría no deja lugares inválidos.
- **Duplicados:** no se usa el aviso de 15 m de los lugares (decisión 0011), que saltaría siempre con postes seguidos. Antes de guardar un elemento se buscan otros **de la misma categoría a menos de 3 m** (`elementos_cercanos()`).
- **En el mapa:** los locales siguen siendo círculos y los elementos son **gotas invertidas** más pequeñas (26 px), con la punta sobre la ubicación exacta y el color y el ícono de su categoría.
- **Filtros:** "Mostrar elementos" los oculta todos y la categoría los filtra. Los filtros de los estudios (fechas, días, horas, evidencia y responsables) no los afectan, porque no tienen estudios.
- **En el código**, las evidencias, su subida y su lista dependen de un "dueño" (`DuenoEvidencia`: un estudio o un elemento) en vez de un `estudioId`, y la ficha del elemento reutiliza `ListaEvidencias`, `CarruselFotos`, `AgregarEvidencia` y `AccionesDelLugar`.

## Descartado

- **Un estudio "fantasma" por elemento** para colgarle las evidencias: no cambiaba el esquema, pero ensuciaba el histórico, los filtros y los conteos de estudios.
- **Una tabla aparte de elementos con sus propias evidencias:** duplicaba la geometría, el archivado, la autoría, la bitácora y la subida de archivos que ya tienen `ubicaciones` y `evidencias`.
- **Categorías separadas para elementos:** obligaba a repetir el catálogo de colores e íconos y a crear dos veces las que sirven para ambos.
- **Convertir un elemento en lugar de estudio (o al revés):** se pidió explícitamente dejarlo por fuera.

## Consecuencias

- Migraciones `20261027120000_tipo_elemento` (el valor nuevo del enum va solo: Postgres no deja usarlo en la misma transacción) y `20261027120100_elementos`. Pruebas en `supabase/tests/elementos.test.sql`.
- Las consultas de evidencias que asumían un estudio (los filtros) ignoran las de los elementos.
- `lugares_mapa()` ordena las zonas primero y después puntos y elementos por nombre.
