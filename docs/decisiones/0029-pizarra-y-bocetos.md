# 0029 · Pizarra y bocetos: dibujar sobre el mapa y guardar el pantallazo

**Estado:** aceptada · 2026-10

## Contexto

En las reuniones el equipo necesita explicar cosas sobre el mapa: la ruta que sigue un bus, por dónde se mueve la gente… Hasta ahora no había cómo dibujar sobre el mapa ni dónde guardar esa explicación (issue #129). Para el MVP basta con guardar el pantallazo; editar los dibujos después queda para más adelante.

## Decisión

- **Pizarra (`/pizarra`) y Bocetos (`/bocetos`)**, dos secciones del menú. En la pizarra se dibuja a mano alzada y se guarda; Bocetos es el registro.
- **Mano y Lápiz.** Con **Mano** el mapa se mueve como siempre. Con **Lápiz** una capa transparente (`touch-action: none`) cubre el mapa y recibe los toques: el mapa queda quieto y el dedo, o el mouse, dibuja. No se desactivan los gestos del mapa uno por uno: la capa los intercepta todos, también los de pellizcar. Se empieza en Mano para ubicar el mapa primero.
- **Herramientas:** cinco colores (rojo, naranja, verde, azul y negro), dos grosores (4 y 8 px), deshacer el último trazo y borrar todo (con confirmación).
- **Los trazos son capas del mapa** (fuente GeoJSON, una capa de borde blanco y otra de color), no un lienzo HTML encima. Así se quedan pegados al mapa si se mueve, se ven bien en claro y oscuro (el borde blanco hace que hasta el negro se vea sobre el mapa nocturno) y salen en la captura.
- **Se guardan dos cosas.** La **imagen** (PNG del mapa con los trazos, más una miniatura JPEG de 480 px para las listas) y los **trazos con coordenadas reales** (`bocetos.trazos`, GeoJSON con el color y el grosor de cada uno). Hoy la app solo usa la imagen, pero con los trazos guardados se podrán editar después sin perder los de ahora.
- **Simplificación:** al soltar el dedo, el trazo se simplifica en píxeles (Douglas-Peucker, 1.5 px) antes de pasar a coordenadas, para guardar decenas de puntos y no cientos. La tabla rechaza trazos de más de 1 MB.
- **Captura sin `preserveDrawingBuffer`.** El lienzo de un mapa WebGL se borra después de mostrarse; en vez de activar esa opción (que hace más lento el mapa de toda la app) se copia el lienzo dentro del evento `render`. Si el mapa todavía está cargando mosaicos se espera hasta 5 s.
- **Un boceto no se edita.** La tabla `bocetos` no tiene permiso de `update`: se crea, se consulta y se borra (su autor o un admin). Si algo cambia, se hace otro, que además deja el registro de cómo se explicó cada vez.
- **Almacenamiento:** el bucket `evidencias`, en `bocetos/<id>/imagen.png` y `bocetos/<id>/miniatura.jpg`. Sus políticas ya cubren cualquier ruta del bucket. Mismo orden que las evidencias: primero se suben los archivos y después se crea la fila (si falla, se borran los archivos); al borrar, primero la fila y luego los archivos.

## Descartado

- **Guardar solo la imagen:** más simple, pero sin los trazos no se puede editar nada nunca; guardarlos cuesta una columna.
- **Un lienzo HTML encima del mapa:** los trazos no se quedarían pegados al mapa al moverlo y habría que fusionar dos imágenes al guardar.
- **Terra Draw (o una librería de dibujo):** trae edición de puntos y formas, que no hace falta para el MVP. A mano alzada bastan pointer events, `map.unproject()` y una función de 30 líneas.
- **Una segunda captura con los marcadores de los lugares:** son elementos HTML, no salen en la captura del lienzo del mapa. Se ocultan en la pizarra para que lo que se ve sea lo que se guarda; el mapa base (calles y nombres), las zonas y el límite de Manila sí salen.
- **Ligar los bocetos a salidas o zonas, texto y flechas:** quedan para después.

## Consecuencias

- Migración `20261027130000_bocetos` y pruebas en `supabase/tests/bocetos.test.sql`.
- El estilo del mapa debe permitir leer su lienzo (CORS en sus recursos). OpenFreeMap, el proveedor por defecto, lo permite. Si se cambia el proveedor del mapa, hay que revisar que la captura siga funcionando.
- En la pizarra, tocar un lugar o una zona no navega a otra parte (igual que al ubicar o dibujar).
