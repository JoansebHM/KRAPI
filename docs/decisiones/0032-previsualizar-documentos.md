# 0032 · Previsualizar documentos dentro de la app

**Estado:** aceptada · 2026-10

## Contexto

Los PDF y los Word que se suben como evidencia (informes, actas) solo se podían descargar o abrir en otra pestaña. En el celular eso saca a la persona de la app y, en iOS, el visor nativo de PDF muestra mal los documentos de varias páginas.

## Decisión

- **Botón "Ver"** en los documentos que se pueden previsualizar: en el modal del estudio ("Ver documento") y en la lista de evidencias (ícono de ojo junto a "Borrar"). Abre el documento en `PantallaCompleta`, con "Descargar" siempre a mano.
- **PDF con `pdfjs-dist`** (build *legacy*, por compatibilidad con iOS): cada página se dibuja en un `<canvas>` cuando se acerca a la pantalla, con botones de acercar y alejar (1×, 1,5×, 2×, 3×) y desplazamiento en ambos ejes.
- **Word `.docx` con `mammoth`**: se convierte a HTML y se **sanea con `DOMPurify`** antes de mostrarlo, porque el archivo lo subió una persona. Se muestra con el aviso "Vista aproximada": se pierden estilos finos, columnas y encabezados.
- **Todo en el cliente**: el archivo se descarga con su enlace temporal y no pasa por ningún servicio de terceros. Las tres librerías se cargan **solo al abrir un documento** (aparte del paquete principal; el trabajador de pdf.js pesa 1,3 MB).
- **`.doc`, `.xls` y `.xlsx` no se previsualizan**: solo se descargan o se copia su enlace.

## Descartado

- **Visor de Microsoft o Google:** se ve idéntico al original, pero las entrevistas e informes saldrían a un tercero.
- **Convertir a PDF al subir:** necesita un servicio de conversión (LibreOffice) y más infraestructura.
- **`<iframe>` con el PDF:** en iOS no se desplaza ni se acerca bien.

## Consecuencias

- Tres dependencias nuevas (`pdfjs-dist`, `mammoth`, `dompurify`).
- Las pruebas usan un PDF y un `.docx` mínimos en `e2e/soporte/archivos/`.
- Previsualizar `.xlsx` quedaría para después (por ejemplo, con SheetJS).
