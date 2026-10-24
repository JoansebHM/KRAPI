# 0010 · Evidencias en un bucket privado y videos por enlace

**Estado:** aceptada · 2026-10

## Contexto

El plan gratuito tiene 1 GB de archivos y 50 MB por archivo, y los videos ya están en SharePoint.

## Decisión

Bucket privado `evidencias` (50 MB por archivo) para fotos, audios y documentos, leídos con URLs firmadas. Las notas de texto se guardan en la tabla. Los **videos** se registran como **enlace a SharePoint** (prueba de embebido en #22). Cada evidencia es exactamente una de archivo, texto o enlace.

## Descartado

Google Drive como almacenamiento; subir videos al bucket.

## Consecuencias

La app debe borrar el archivo de Storage al borrar una evidencia.
