# KIRA · Guía para asistentes de código

Geovisor **KIRA** del barrio **Manila** (El Poblado, Medellín) para el equipo de **Kratos Innovation Lab** (EAFIT). Registra en un mapa los lugares visitados durante el estudio de proximidad y el histórico de visitas (entrevistas, fotos, audios, informes) de cada uno.

Este archivo es el punto de entrada. **La fuente de verdad está en el repositorio:**

| Necesitas saber… | Lee |
| --- | --- |
| Qué es la app, para quién y cómo se usa en campo | [`docs/producto.md`](docs/producto.md) |
| Tablas, relaciones, reglas, funciones y seguridad | [`docs/modelo-de-datos.md`](docs/modelo-de-datos.md) |
| Stack, estructura y patrones de código a reutilizar | [`docs/arquitectura.md`](docs/arquitectura.md) |
| Colores, tipografía, componentes y reglas de UX móvil | [`docs/diseno.md`](docs/diseno.md) |
| Por qué se decidió algo (y qué se descartó) | [`docs/decisiones/`](docs/decisiones/) |
| Flujo de issues, ramas, commits y PRs | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Lo que falta por hacer | Issues de GitHub, milestone **MVP** (`JoansebHM/KRAPI`) |

Si una decisión cambia, **actualiza el documento correspondiente en el mismo PR** y, si es importante, agrega un registro en `docs/decisiones/`.

La documentación navegable (`/docs`) se genera sola a partir de estos `.md`, así que basta con mantener el Markdown al día (ver la regla "Documentación siempre al día").

## Comandos

```bash
npm run dev            # servidor de desarrollo (http://localhost:5173)
npm run build          # revisa tipos (incluidas las pruebas) y compila
npm run lint           # oxlint; falla también con advertencias
npm run test:e2e       # pruebas de punta a punta (Playwright, Supabase simulado)
npm run docs           # genera la documentación navegable (también en /docs con npm run dev)

npm run db:new nombre  # nueva migración en supabase/migrations/
npm run db:push        # aplica migraciones al proyecto de Supabase (requiere `npx supabase login` y `npm run db:link`)
npm run db:types       # regenera src/types/database.ts desde el proyecto
npm run db:config      # aplica supabase/config.toml
npm run usuario:crear  # crea o actualiza el usuario compartido
```

Los comandos `db:*` y `usuario:crear` se conectan al proyecto real de Supabase (`ggrwybqiqffoxuoojopp`) y los corre una persona del equipo en su computador.

## Reglas de trabajo

- **Todo en español**: código de dominio (nombres de funciones, variables, componentes), comentarios, mensajes de la interfaz, commits, issues y PRs.
- **Una issue por cambio.** Rama `tipo/numero-descripcion` (por ejemplo `feat/13-lugares-en-mapa`), commits pequeños con [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) en español terminados en `Refs #N` o `Closes #N`, y un PR que explique **cada commit**. Detalles en `CONTRIBUTING.md`.
- **Sin coautoría de asistentes.** No agregues `Co-Authored-By`, firmas ni menciones a herramientas de IA en commits, PRs ni issues.
- **Se une con merge commit** (no squash ni rebase) para conservar el historial.
- **Documentación siempre al día.** Todo cambio que haga desactualizar algo de `README.md`, `CONTRIBUTING.md`, este archivo o `docs/` los corrige **en el mismo PR**. Eso incluye los diagramas de `docs/diagramas/`, las secciones de "Estado" y las tablas de comandos, variables o migraciones. Antes de abrir el PR, busca en los `.md` lo que tocaste (`grep`) y revisa la página en `/docs`. Si un documento nuevo debe aparecer en el menú de `/docs`, agrégalo a `SECCIONES` en `scripts/docs/generar.ts`.
- **Antes de pedir revisión:** `npm run lint`, `npm run build` y `npm run test:e2e` sin errores. Toda funcionalidad nueva trae sus pruebas en `e2e/`.
- **Base de datos solo con migraciones nuevas.** Nunca edites una migración ya aplicada ni cambies cosas a mano en el panel de Supabase. Cada tabla nueva lleva sus `grant` a `authenticated`, RLS y política en la misma migración (el proyecto tiene desactivado "Automatically expose new tables"). Actualiza `src/types/database.ts`.
- **Pensado para celular.** Revisa cada pantalla a 390 px (y que no se desborde a 320 px), en modo claro y oscuro. Áreas de toque de 44 px o más.
- **Reutiliza los patrones existentes** (ver `docs/arquitectura.md`): `Panel`, `Dialog`, `notificar`, hooks de TanStack Query en `api.ts`, `mensajeErrorDatos`, tokens de `theme.css`.
- **Nada con histórico se borra:** lugares y estudios se archivan. Solo se borra de verdad una evidencia equivocada o un lugar sin estudios.

## Trampas conocidas

- **`supabase/config.toml`:** `[auth.email] enable_signup` debe quedar en `true`. En la CLI ese valor activa o desactiva **todo** el login por correo; los registros se bloquean con `[auth] enable_signup = false`. Los *vector buckets* están desactivados porque solo existen en el plan de pago.
- **MapLibre 6 + Vite:** el worker se configura en `src/features/map/maplibre.ts` (`setWorkerUrl`). Importa MapLibre siempre desde ese archivo, no desde `maplibre-gl`.
- **Diálogos:** `Dialog` se dibuja en `<body>` con un portal. No lo reemplaces por un modal dentro del panel, porque la barra superior lo tapaba.
- **Mac no distingue mayúsculas en nombres de archivo:** no crees `avatar.ts` junto a `Avatar.tsx`.
- **Polígono de Manila duplicado a propósito:** está en `src/features/map/manila.ts` y en la función SQL `public.limite_manila()`. Si cambia, actualiza ambos.
- **Conexión de GitHub de Claude:** al crear o editar issues, PRs o comentarios desde una sesión de Claude, se agrega al final la línea "Generated by Claude Code". El equipo la quita después (ver [`docs/decisiones/0014-flujo-github.md`](docs/decisiones/0014-flujo-github.md)).

## Estado actual

Hecho:
- Mapa con el límite de Manila, navegación limitada a 1 km y modo claro/oscuro con mapa nocturno.
- Login con usuario compartido, sesión de 2 h de inactividad y 7 días máximo, y cierre en todos los dispositivos.
- Notificaciones, menú lateral y paneles.
- Categorías (color e ícono) y responsables (avatares).
- Lugares en el mapa (puntos con su categoría y zonas) y ficha básica al tocarlos (`/lugares/:id`).
- Crear puntos con la mira central (`/lugares/nuevo`), con su primer estudio.
- Estudios: crear, editar y archivar, con responsables; histórico en la ficha. Al tocar un estudio se abre un modal de presentación con carrusel de fotos y otras evidencias; desde allí se edita o se abre su página (`/lugares/:id/estudios/:estudioId`) para agregar evidencia.
- Evidencias de archivo: fotos (comprimidas), audios grabados en la app y documentos, con avance de subida y borrado.
- Esquema completo en Supabase.
- Pruebas de punta a punta.
- Documentación navegable en `/docs`, con diagramas hechos con diagram-design.

Siguiente (en orden):
1. **#20** visor de evidencias (fotos, audios y documentos)
2. **#19** evidencias de texto y videos por enlace (los videos esperan la prueba de SharePoint, #22)
3. **#16** ficha del lugar (completar la ficha básica: datos, editar, cerrar y archivar el lugar)
4. **#15** zonas (incluye elegir punto o zona en el "+")
5. **#21** filtros

Ver el milestone MVP en GitHub.
