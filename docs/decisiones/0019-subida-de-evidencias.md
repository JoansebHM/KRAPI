# 0019 · Subida de evidencias: página del estudio, cola con avance y servicio de almacenamiento

**Estado:** aceptada · 2026-10

## Contexto

En campo se toman fotos, se graban entrevistas y se adjuntan documentos, muchas veces con datos móviles lentos. Hace falta saber cuánto falta para que termine una subida, no perder archivos si algo falla y no gastar datos de más. Además, la [decisión 0010](0010-evidencias-y-almacenamiento.md) pide poder cambiar de proveedor de archivos más adelante.

## Decisión

- **Página del estudio** (`/lugares/:id/estudios/:estudioId`): reúne los datos del estudio, "Editar estudio" y sus evidencias, con el botón flotante "Agregar evidencia". Al guardar un estudio nuevo se abre ahí.
- **Servicio propio** `src/lib/almacenamiento.ts` (`subirArchivo`, `borrarArchivos`, `enlacesTemporales`). Es lo único que conoce el bucket.
- **Subida con `XMLHttpRequest`** directo a la API de Storage, porque `supabase-js` no informa el avance.
- **Cola fuera de React** (`features/evidencias/subidas.ts`): sube de a un archivo y sigue aunque se cierre la página del estudio. Si hay subidas pendientes, el navegador pregunta antes de cerrar la pestaña.
- **Orden de escritura:** primero el archivo y después la fila. Si la fila falla, se borra el archivo. Al borrar una evidencia se hace al revés: primero la fila y después el archivo.
- **Fotos:** se reducen a 2048 px de lado mayor y se comprimen a JPEG (calidad 0,82) en el navegador. Si el navegador no puede leer la foto (HEIC fuera de Safari), se sube la original.
- **Audio:** se graba dentro de la app con `MediaRecorder` (WebM en Chrome y Android, MP4 en iPhone). En iPhone, `<input capture>` no graba audio.
- **Abrir un archivo:** por ahora, con un enlace firmado de una hora en otra pestaña. El visor dentro de la app es la #20.

## Descartado

- **Subida reanudable (TUS):** agrega una dependencia. Para archivos de hasta 50 MB basta con reintentar. Se puede retomar si en campo fallan muchas subidas largas.
- **Guardar las subidas en IndexedDB para retomarlas sin conexión:** es más complejo de lo que el MVP necesita.
- **Agregar evidencias desde el formulario del estudio:** obliga a guardar el estudio antes de tener dónde colgar los archivos, y el formulario ya es largo en celular.

## Consecuencias

Si la app se recarga a mitad de una subida, esa subida se pierde y hay que repetirla. Si falla el borrado de un archivo, queda un archivo sin uso en el bucket, pero nunca una evidencia sin su archivo.
