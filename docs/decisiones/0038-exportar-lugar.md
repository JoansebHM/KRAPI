# 0038 · Exportar un lugar completo en un ZIP

**Estado:** aceptada · 2026-11 · Refs #165

## Contexto

El equipo guarda el material del levantamiento en SharePoint. KIRA solo permitía bajar **un estudio** a la vez ([decisión 0010](0010-evidencias-y-almacenamiento.md) y la descarga en ZIP): para llevarse un lugar con todo su histórico había que repetirlo estudio por estudio y organizar las carpetas a mano.

## Decisión

- **Un botón "Exportar lugar (.zip)" en la ficha** de un punto o una zona (no de un elemento, que no tiene estudios). Baja un ZIP con todos los estudios visibles del lugar. No aparece si el lugar no tiene estudios.
- **Estructura lugar → estudio → tipo**, sin archivo de índice:

  ```
  Café Manila/
    Lugar.txt                      categoría, estado, dirección, contacto, descripción y quién exportó
    2026-10-30 14.00 - Ana Pérez/
      Resumen.txt                  fecha, hora, entrevistado, participantes, quién lo registró, notas y conteo de evidencias
      Fotos/  Audios/  Documentos/
      Textos y enlaces.txt         textos y enlaces (los videos de SharePoint son enlaces)
  ```

  La fecha va primero, en formato ISO, para que las carpetas queden en orden de tiempo. Las carpetas sin archivos no se crean. Un recorrido (estudio de una zona) no tiene "entrevistado", así que no lo lleva ni en el resumen ni en el nombre de la carpeta.
- **Nombres a prueba de SharePoint, Windows y macOS:** se reemplazan los caracteres prohibidos, no quedan puntos ni espacios al final, cada carpeta se recorta a 60 caracteres y cada archivo a 80 (conservando la extensión), porque SharePoint limita la ruta completa a 400 y Windows a 260. Los nombres repetidos se numeran: "(2)" en las carpetas y antes de la extensión en los archivos.
- **No incluye los estudios archivados.** Si hace falta uno, se recupera primero.
- **Todo en el navegador**, reutilizando la descarga en ZIP existente (`descargaZip.ts`): los archivos se bajan con sus enlaces temporales, de a 4 a la vez, mostrando "Armando el ZIP… 3 de 15" en el botón. Si un archivo falla, se exporta el resto y se avisa cuál faltó.
- **Límites por memoria:** un ZIP se arma en memoria. Desde **200 MB** se pide confirmar, y por encima de **800 MB** no se intenta y se explica que se descargue estudio por estudio.

## Descartado

- **`Indice.csv`** con una fila por estudio: se pensó para filtrar en Excel o SharePoint y se descartó por ahora.
- **Estructura por tipo primero** (Fotos/Lugar/Estudio) y **repetir la del ZIP de un estudio**: se eligió lugar → estudio → tipo, que es como se piensa el trabajo.
- **Subir directo a SharePoint desde KIRA:** exigiría registrar una aplicación en el Azure de EAFIT con permisos que da un administrador de la universidad.
- **Armar el ZIP en el servidor** (Edge Function): poca memoria y poco tiempo de ejecución para gigas en el plan gratuito.

## Consecuencias

- Exportar **varios lugares o todo el levantamiento** queda para después. Lo natural es escribir directo en una carpeta del computador (API de carpetas de Chrome y Edge): sin ZIP, sin límite de memoria y, si se elige la carpeta que sincroniza SharePoint con OneDrive, los archivos suben solos.
- Cualquier cuenta activa puede exportar, igual que ya puede ver y descargar esos archivos.
- Los archivos se leen con las mismas reglas (RLS) de siempre; la exportación no abre ningún acceso nuevo ni toca la base de datos.
- Las pruebas e2e descomprimen el ZIP y revisan la estructura, el contenido de los resúmenes, la limpieza de nombres, los archivos que fallan y los avisos de peso.
