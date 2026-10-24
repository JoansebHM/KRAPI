# 0016 · Documentación navegable en /docs generada desde el Markdown

**Estado:** aceptada · 2026-10

## Contexto

La documentación vive en archivos `.md` (decisión 0015), cómodos para editar pero poco amigables para leer de corrido, sobre todo para quien no abre el repositorio.

## Decisión

Generar **un solo HTML** con menú lateral, índice de cada página, buscador, modo claro/oscuro y código en Monokai, a partir de los mismos `.md`. Se sirve en `/docs` (plugin de Vite) y se incluye al compilar en `dist/docs/index.html`. No usa dependencias nuevas ni internet.

## Descartado

Escribir el HTML a mano (se desactualiza); Docusaurus, VitePress u otros generadores (otra herramienta y otra configuración que mantener); una ruta de React dentro de la app (exigiría sesión y cargaría el mapa).

## Consecuencias

Los `.md` siguen siendo la fuente de verdad: basta con editarlos. El generador solo entiende el Markdown que usa el repositorio (incluidos los diagramas SVG en su propia línea); si se usa algo nuevo, hay que agregarlo en `scripts/docs/markdown.ts`.
