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
npm run db:funciones   # despliega las Edge Functions de supabase/functions/
npm run db:local       # Supabase local en Docker (para probar migraciones)
npm run db:test        # recrea la base local y corre las pruebas pgTAP de supabase/tests/
npm run usuario:admin  # crea el primer admin o nombra admin una cuenta existente
npm run usuario:clave  # pone una contraseña nueva a una cuenta
```

Los comandos `db:*` (salvo `db:local` y `db:test`, que usan Supabase en Docker) y `usuario:*` se conectan al proyecto real de Supabase (`ggrwybqiqffoxuoojopp`) y los corre una persona del equipo en su computador.

## Reglas de trabajo

- **Todo en español**: código de dominio (nombres de funciones, variables, componentes), comentarios, mensajes de la interfaz, commits, issues y PRs.
- **Una issue por cambio.** Rama `tipo/numero-descripcion` (por ejemplo `feat/13-lugares-en-mapa`), commits pequeños con [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) en español terminados en `Refs #N` o `Closes #N`, y un PR que explique **cada commit**. Detalles en `CONTRIBUTING.md`.
- **Sin coautoría de asistentes.** No agregues `Co-Authored-By`, firmas ni menciones a herramientas de IA en commits, PRs ni issues.
- **Se une con merge commit** (no squash ni rebase) para conservar el historial.
- **Documentación siempre al día.** Todo cambio que haga desactualizar algo de `README.md`, `CONTRIBUTING.md`, este archivo o `docs/` los corrige **en el mismo PR**. Eso incluye los diagramas de `docs/diagramas/`, las secciones de "Estado" y las tablas de comandos, variables o migraciones. Antes de abrir el PR, busca en los `.md` lo que tocaste (`grep`) y revisa la página en `/docs`. Si un documento nuevo debe aparecer en el menú de `/docs`, agrégalo a `SECCIONES` en `scripts/docs/generar.ts`.
- **Antes de pedir revisión:** `npm run lint`, `npm run build` y `npm run test:e2e` sin errores. Toda funcionalidad nueva trae sus pruebas en `e2e/`.
- **Base de datos solo con migraciones nuevas.** Nunca edites una migración ya aplicada ni cambies cosas a mano en el panel de Supabase. Cada tabla nueva lleva sus `grant` a `authenticated`, RLS y política en la misma migración (el proyecto tiene desactivado "Automatically expose new tables"). Actualiza `src/types/database.ts`. Prueba cada migración en Supabase local y, si toca seguridad, triggers o funciones, agrega su prueba en `supabase/tests/` (`npm run db:test`).
- **Pensado para celular.** Revisa cada pantalla a 390 px (y que no se desborde a 320 px), en modo claro y oscuro. Áreas de toque de 44 px o más.
- **Reutiliza los patrones existentes** (ver `docs/arquitectura.md`): `Panel`, `Dialog`, `notificar`, hooks de TanStack Query en `api.ts`, `mensajeErrorDatos`, tokens de `theme.css`.
- **Nada con histórico se borra:** lugares y estudios se archivan. Solo se borra de verdad una evidencia equivocada o un lugar sin estudios.

## Trampas conocidas

- **`supabase/config.toml`:** `[auth.email] enable_signup` debe quedar en `true`. En la CLI ese valor activa o desactiva **todo** el login por correo (y las cuentas por nombre de usuario usan un correo interno). Los registros se controlan con `[auth] enable_signup`, que está en `true` porque cada integrante crea su cuenta: la protección está en RLS, que no deja ver nada a una cuenta que no esté activa. **Nunca** apliques `enable_signup = true` (`npm run db:config`) a un proyecto sin las políticas de `20261025140000_rls_cuentas_activas`. Los *vector buckets* están desactivados porque solo existen en el plan de pago.
- **Cuentas sin correo para entrar:** se entra con el nombre de usuario, que la app convierte en `<usuario>@usuarios.kira.invalid` (`src/features/auth/nombreDeUsuario.ts`). El correo real es opcional, solo para avisos, y vive en la tabla `contactos` (no en `perfiles`, que leen todas las cuentas activas): se escribe con `guardar_correo()`.
- **Realtime no corre en `db:local`:** la presencia (decisión 0036) solo se ve en producción o en las pruebas e2e, que la simulan (`e2e/soporte/realtime-falso.ts`). `supabase/tests/presencia.test.sql` prueba las políticas de `realtime.messages`. Si el canal falla, la lista de en línea queda vacía y la app sigue.
- **Avisos por correo (decisión 0035):** los triggers llaman a la Edge Function `enviar-correo` con `pg_net`. La dirección y el secreto compartido están en **Vault** (`correos_url`, `correos_secreto`) y la clave de Brevo, en los secretos de Supabase (`BREVO_API_KEY`…): ninguno está en el repositorio ni en `.env.local`. Sin Vault no se avisa y nada se rompe. La función no pide JWT (`verify_jwt = false` en `config.toml`) porque la protege el secreto: no la cambies.
- **MapLibre 6 + Vite:** el worker se configura en `src/features/map/maplibre.ts` (`setWorkerUrl`). Importa MapLibre siempre desde ese archivo, no desde `maplibre-gl`.
- **Diálogos:** `Dialog` se dibuja en `<body>` con un portal. No lo reemplaces por un modal dentro del panel, porque la barra superior lo tapaba.
- **Mac no distingue mayúsculas en nombres de archivo:** no crees `avatar.ts` junto a `Avatar.tsx`.
- **Logo KI duplicado a propósito:** los trazos de las letras KI están en `src/components/marcaKi.ts`, en `scripts/docs/plantilla.html` y en `public/favicon.svg`; además, `public/correo/marca-ki.png` (cabecera de los correos) se genera a partir de `marcaKi.ts` con `node scripts/correo/generar-marca-ki.mjs`. Si cambia el logo, actualiza los tres primeros y vuelve a generar el PNG.
- **Polígono de Manila duplicado a propósito:** está en `src/features/map/manila.ts` y en la función SQL `public.limite_manila()`. Si cambia, actualiza ambos.
- **Conexión de GitHub de Claude:** al crear o editar issues, PRs o comentarios desde una sesión de Claude, se agrega al final la línea "Generated by Claude Code". El equipo la quita después (ver [`docs/decisiones/0014-flujo-github.md`](docs/decisiones/0014-flujo-github.md)).

## Estado actual

Hecho:
- Mapa con el límite de Manila, navegación limitada a 1 km y modo claro/oscuro con mapa nocturno.
- Cuentas individuales sin correo para entrar (decisión 0021): registro con nombre de usuario, aprobación de un admin, pantalla de espera, sesión de 2 h de inactividad y 7 días máximo, y cierre en todos los dispositivos.
- Exportar un lugar (decisión 0038): en la ficha de un punto o una zona, "Exportar lugar (.zip)" baja todos sus estudios visibles en un ZIP ordenado en carpetas lugar → estudio (fecha, hora y entrevistado) → tipo (Fotos, Audios, Documentos), con `Lugar.txt`, un `Resumen.txt` por estudio y `Textos y enlaces.txt`, para subirlo a SharePoint. Todo en el navegador: confirma desde 200 MB y no lo intenta sobre 800 MB. Exportar varios lugares o todo queda para después.
- Último ingreso (decisión 0037): en Usuarios, solo para admins, cada cuenta muestra cuándo inició sesión por última vez ("ingresó hace 3 h", y la fecha y hora completas en su ficha). Sale de `ultimos_accesos()`, que lee `auth.users.last_sign_in_at`; es el último *inicio de sesión*, no la última actividad.
- Usuarios en línea (decisión 0036): presencia de Supabase Realtime, sin tablas. En la barra superior se ven los avatares de las otras cuentas con la app abierta y visible (2 en celular, 1 en menos de 360 px, 4 en computador y +N) y, al tocarlos, un modal con quiénes son. Canal privado `presencia`, solo cuentas activas (RLS sobre `realtime.messages`).
- Avisos por correo con Brevo (decisión 0035): correo opcional en el registro y en Mi perfil (sin verificar, tabla `contactos`); se avisa a los admins con correo cuando alguien se registra y a quien se registró cuando su solicitud llega y cuando aprueban o rechazan su cuenta (plantilla HTML con los colores de KIRA en la Edge Function). Falta configurar los secretos y Vault en el proyecto (ver README, "Avisos por correo").
- Usuarios (`/usuarios`, solo admins): aprobar, rechazar, desactivar, reactivar, roles y contraseña temporal (Edge Function `restablecer-clave`, decisión 0022). Mi perfil (`/perfil`): nombre, avatar y contraseña.
- Permisos en RLS según el estado y el rol, autoría (`creado_por`…) y bitácora de cada acción. Se muestra quién registró cada estudio y evidencia.
- Notificaciones, menú lateral y paneles.
- Categorías (color e ícono). Cada cuenta tiene su avatar dibujado (se elige al registrarse).
- Lugares en el mapa (puntos con su categoría y zonas con el color de su tipo). Zonas (`/zonas/nueva`, decisión 0024): dibujarlas con la mira, tipo, comentarios, locales adentro, recorridos (estudios sin entrevistado), redibujarlas y archivarlas. Ficha completa del punto al tocarlo (`/lugares/:id`): datos, teléfono para llamar o WhatsApp, editar, mover con la mira (`/lugares/:id/mover`), cerrar, archivar o recuperar, y borrar si no tiene estudios.
- Crear puntos con la mira central (`/lugares/nuevo`), con su primer estudio y, si se quiere, con "Usar mi ubicación": el navegador pide permiso y el punto queda donde está la persona (si está dentro de Manila).
- Elementos (`/elementos/nuevo`, decisión 0028): canecas, postes, árboles… con nombre (opcional: sin él se muestra el de su categoría), categoría y descripción, que no tienen estudios: sus evidencias (`evidencias.ubicacion_id`) van directo en su ficha. En el mapa son gotas invertidas (los locales, círculos). Aviso de otro de la misma categoría a menos de 3 m. Las categorías dicen si se usan en lugares, elementos o ambos (`categorias.aplica_a`).
- Analítica (`/analitica`, decisión 0034): cifras y gráficos de cómo va el levantamiento (locales, estudios, entrevistas, evidencias, cobertura, ritmo por semana y por día, categorías, tipos de evidencia, estado de los estudios y equipo), calculadas en el cliente (`calcularAnalitica()`) y dibujadas con HTML y CSS. No cuentan zonas ni salidas.
- Pizarra (`/pizarra`) y Bocetos (`/bocetos`, decisiones 0029 y 0030): se dibuja a mano alzada y se escribe sobre el mapa (Mano mueve el mapa, Lápiz lo congela, Texto pone cajas de texto que se mueven, se giran, se editan y se pegan al mapa; 5 colores, 2 grosores, 2 tamaños de texto, deshacer cualquier acción, borrar todo) y se guarda un boceto: título, descripción, el pantallazo del mapa con los trazos y los textos (PNG, con miniatura) y todo en GeoJSON. El registro muestra miniatura, autor y fecha, y cada boceto se ve entero y se descarga. No se editan; los borra su autor o un admin. Los marcadores de los lugares se ocultan en la pizarra porque son HTML y no salen en la captura.
- Preguntas (`/preguntas`, decisión 0031): diálogo con una pestaña por guía de entrevista (6), las imprescindibles ★ primero y luego las complementarias, cada una como desplegable con por qué se hace, repreguntas, registro técnico, ejercicio y lentes; módulos para Instituciones y Visitantes; botón fijo "Autorización para grabar" con el guion de la guía activa y el nombre de la cuenta; y el cierre de la entrevista. El contenido es estático, en `src/features/preguntas/guias.ts`.
- Salidas (`/salidas`, decisión 0025): los admins crean salidas, dibujan sus zonas de asignación y las asignan a cuentas; cada persona reporta su hora de fin y el porcentaje cubierto (Mis asignaciones, `/mis-asignaciones`, con contador en el menú). Las zonas de las salidas de hoy se ven en el mapa en rosado, y se tocan para ver su información. La evidencia de una salida son los estudios de siempre: un estudio puede ligarse a la salida en la que se hizo (`estudios.salida_id`), y la página de la salida lista lo que se registró en ella. Un recorrido también se puede registrar como zona del mapa, aparte; si otra salida vuelve a cubrir el mismo cuadrante, puede reusar esa forma y ese vínculo (`asignaciones.zona_id`) en vez de crear una zona duplicada.
- Vistas del mapa (decisión 0033): botón de capas con Calles, Topográfico y Calles simplificado (MapTiler, necesita `VITE_MAPTILER_API_KEY`, restringida por dominio). Los locales del mapa base se ocultan por defecto y se muestran con un interruptor en Filtros, que no cuenta como filtro.
- Estudios: crear, editar y archivar, con participantes (cuentas, decisión 0023) y varias notas (`estudios.notas`); histórico en la ficha. Al tocar un estudio se abre un modal de presentación con carrusel de fotos (se pasan con botones o deslizando el dedo, con loader mientras cargan, y también a pantalla completa) y otras evidencias; desde allí se edita o se abre su página (`/lugares/:id/estudios/:estudioId`) para agregar evidencia.
- Filtros del mapa (decisión 0026): mostrar u ocultar los elementos, categoría, rango de fechas, días de la semana, rango de horas, tipo de evidencia y responsables, calculados en el cliente. El botón "Filtros" abre un panel (`HojaInferior`) que no tapa el mapa.
- Evidencias de archivo: fotos (comprimidas), audios grabados en la app y documentos (los PDF y Word `.docx` se previsualizan dentro de la app con "Ver", decisión 0032), con avance de subida y borrado. Videos de SharePoint por enlace (solo `*.sharepoint.com`; se abren en otra pestaña hasta #22).
- Esquema completo en Supabase.
- Pruebas de punta a punta.
- Documentación navegable en `/docs`, con diagramas hechos con diagram-design.

Siguiente (en orden):
1. **#5** revisión automática de build, lint y pruebas en cada PR
2. **#22** prueba de SharePoint, para ver los videos dentro de la app

Ver el milestone *MVP* en GitHub.
