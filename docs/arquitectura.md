# Arquitectura

## Stack

| Pieza | Para qué |
| --- | --- |
| **React 19 + TypeScript (estricto) + Vite** | La app. Es privada y no necesita SEO, así que no hay servidor propio (ver [decisión 0001](decisiones/0001-vite-react-typescript.md)) |
| **MapLibre GL 6** | El mapa. Mapa base provisional: OpenFreeMap (gratis, sin clave) |
| **Supabase** (`@supabase/supabase-js`) | Base de datos PostgreSQL + PostGIS, autenticación y archivos |
| **TanStack Query** | Caché de datos: consultas, recargas y actualización después de guardar |
| **React Router** | Una dirección por sección (`/categorias`, `/lugares/:id`), así el "atrás" del celular funciona |
| **Sonner** | Notificaciones (toasts) |
| **Lucide** | Íconos de categorías e interfaz |
| **DiceBear (Croodles)** | Avatares dibujados de los responsables |
| **Playwright** | Pruebas de punta a punta |
| **oxlint** | Revisión de código (`--deny-warnings`) |

## Estructura

```
src/
  app/            Shell: barra superior, rutas, pantalla de configuración incompleta
  components/     Piezas compartidas: Dialog, Panel, MenuNavegacion, Buscador, Estados,
                  FlechaLista, Notificaciones, PoweredBy
  config/         env.ts (variables), session.ts (tiempos de sesión)
  features/       Una carpeta por funcionalidad
    auth/         Login, AuthProvider, política de sesión, menú de la cuenta
    categorias/   CRUD de categorías, colores e íconos
    estudios/     Estudios de un lugar: formulario, selector de responsables, histórico y página del estudio
    evidencias/   Subir, grabar, listar y borrar evidencias; cola de subidas y compresión de fotos
    lugares/      Lugares en el mapa (marcadores y zonas), su ficha y crear puntos
    map/          Mapa, contexto del mapa, polígono de Manila, estilo nocturno, worker de MapLibre
    responsables/ CRUD de responsables y avatares
    theme/        Modo claro/oscuro
  lib/            supabase.ts, almacenamiento.ts (archivos), queryClient.ts, notificar.ts,
                  errores.ts, texto.ts, color.ts
  styles/         theme.css (tokens), ui.css (botones, campos, listas)
  types/          database.ts (tipos generados del esquema)
e2e/              Pruebas Playwright y Supabase simulado (e2e/soporte/)
supabase/         config.toml, migraciones y pruebas de la base de datos (tests/)
scripts/          crear-usuario-compartido.mjs
  docs/           Generador de la documentación navegable (/docs)
```

## Documentación navegable (`/docs`)

`scripts/docs/generar.ts` convierte los `.md` del repositorio (README, CONTRIBUTING, CLAUDE.md y `docs/`) en **un solo HTML** sin dependencias externas: `markdown.ts` traduce el Markdown y colorea el código con Monokai, y `plantilla.html` tiene los estilos, el menú, el índice y el buscador.

- En desarrollo, el plugin `kira-docs` de `vite.config.ts` la sirve en `/docs` y la regenera en cada visita.
- Al compilar queda en `dist/docs/index.html`. `npm run docs` la genera sin compilar la app.
- Con la sesión iniciada, el menú lateral de KIRA incluye un acceso directo a `/docs`.
- Para agregar un documento nuevo a la navegación, súmalo a `SECCIONES` en `generar.ts`. Las decisiones se agregan solas.
- **Diagramas:** son archivos `.svg` en `docs/diagramas/`, enlazados desde el Markdown como imagen en su propia línea (`![…](diagramas/x.svg)`). GitHub los muestra como imagen y `/docs` los incrusta. Traen sus colores de claro y oscuro y siguen el tema elegido. Se hacen con la skill [diagram-design](https://github.com/cathrynlavery/diagram-design) y el perfil `kratos` (ver `.diagram-design` y la [decisión 0017](decisiones/0017-diagramas-diagram-design.md)).

Una funcionalidad nueva va en su propia carpeta `src/features/<nombre>/`, con:
- `api.ts`: hooks de datos;
- los componentes;
- sus `.css` junto a cada componente.

## Cómo se arma la app

`main.tsx` envuelve la app en `BrowserRouter` → `QueryClientProvider` → `AuthProvider` (sesión y política de 2 h / 7 días). Dentro, `App` decide qué mostrar:

![Árbol de componentes: App, Notificaciones, Login, AppConSesion y sus hijos](diagramas/como-se-arma-la-app.svg)

Dentro de `AppConSesion`, `MapaProvider` envuelve a `MapView` y `Routes`, para que las pantallas que se abren encima puedan usar el mapa.

## Patrones a reutilizar

**Datos (`features/<x>/api.ts`)**
- Un hook por consulta (`useCategorias`) y uno por mutación (`useCrearCategoria`…), con TanStack Query.
- Clave de caché constante (`CLAVE_CATEGORIAS`). Las mutaciones la invalidan en `onSuccess`.
- Las listas de catálogos usan `refetchOnMount: 'always'`: muestran la caché al instante y se actualizan en segundo plano.
- Los conteos se traen embebidos: `select('id, nombre, ubicaciones(count)')`.
- **Escrituras en varias tablas:** Supabase no ofrece transacciones desde el navegador. Si la segunda escritura falla, se deshace la primera cuando todavía no tiene histórico. Por ejemplo, `useGuardarEstudio` borra el estudio recién creado si no pudo guardar sus responsables. Si la primera ya quedó y es un registro con valor (un lugar), se avisa en vez de borrarlo.
- **Eliminar con "Deshacer":** antes de borrar se guarda lo necesario para restaurar (el registro y sus relaciones), y la restauración reinserta con el **mismo id**.

**Errores y avisos**
- `notificar.exito / error / info / aviso / cargando` (`lib/notificar.ts`) es la única forma de mostrar toasts.
- `mensajeErrorDatos(error, { duplicado, sinPermiso })` (`lib/errores.ts`) traduce los errores de PostgREST (23505, 23514, 42501…) a español.
- **Borrados:** RLS no da error cuando no deja borrar, solo borra 0 filas. Por eso se borra con `.delete().eq(…).select('id')` y, si no vuelve ninguna fila, se lanza `SIN_PERMISO` para que `mensajeErrorDatos` muestre el mensaje de `sinPermiso`.
- Los errores de formulario van **en el campo** (`.field-error`), y los del servidor, en un toast. El formulario se queda abierto para corregir.

**Pantallas y formularios**
- `Panel`: cada sección se abre sobre el mapa, con un botón para volver. En celular ocupa todo y desde 900 px es un panel lateral de 440 px. Admite un `pie`, por ejemplo el botón flotante `.fab`.
- `Dialog`: modal accesible dibujado en `<body>` con portal. El encabezado siempre tiene título y botón X arriba a la derecha; el botón cierra mediante `onCerrar` y queda deshabilitado cuando el flujo no admite cierre. Con `onSubmit` se vuelve formulario. Al abrir enfoca el primer campo, el elemento con `data-autofocus` o el primer botón. **Al editar se enfoca el botón**, para que no salte el teclado. En celular sale desde abajo.
- Si desde un formulario se abre una confirmación, **se cierra el formulario** para que no queden dos diálogos encimados.
- Dentro del diálogo, los campos van en `.formulario` (`ui.css`). Los opcionales llevan `.field-opcional` en la etiqueta.
- Si un flujo tiene varios pasos (por ejemplo, ubicar → duplicados → lugar → estudio), los datos viven en la pantalla del flujo y no en cada diálogo, para no perderlos al volver atrás. Por eso `FormularioPunto` y `FormularioEstudio` son controlados (`campos` y `onCambiar`).
- Para elegir uno o varios elementos con ícono o avatar (categoría, responsables) se usan botones `.chip` con `aria-pressed` dentro de `.chips`.
- `Panel` acepta `volver` para que el botón de atrás lleve a otra pantalla, por ejemplo de un estudio a la ficha de su lugar.
- **Estudios:** tocar uno del histórico abre `EstudioPresentacion`, un diálogo con sus datos, carrusel de fotos y otras evidencias (audio, documentos, texto y enlaces externos). Desde allí se edita con el mismo `FormularioEstudio`; "Agregar evidencia" abre la página `EstudioPagina` (`/lugares/:id/estudios/:estudioId`). Al guardar un estudio nuevo se navega a esa página. `useCamposEstudioNuevo()` prepara uno nuevo al abrir el formulario: hoy, de ahora a una hora después, y los responsables del último estudio de ese dispositivo (`krapi-ultimos-responsables` en `localStorage`, filtrados a los que todavía existen). Los estudios se archivan (`archivado_en`) con "Deshacer", nunca se borran.
- `Buscador`, `EstadoVacio`, `ListaCargando` y `ErrorCarga` para las listas.
- `normalizar`, `compararTexto` y `plural` (`lib/texto.ts`) para buscar y ordenar en español.

**Mapa**
- Importa MapLibre desde `features/map/maplibre.ts`: ahí se configura el worker (`setWorkerUrl`), que de otro modo se rompe con Vite.
- Al cambiar de tema se llama `setStyle` y las capas propias se vuelven a agregar en `style.load`.
- `MapaProvider` envuelve el mapa y las rutas. Las pantallas que necesitan el mapa (por ejemplo, crear un punto) lo leen con `useMapa()`, y `MapView` lo registra al crearlo.
- Para saber si una coordenada está en el barrio, usa `dentroDeManila(lng, lat)` (`manila.ts`). La base de datos lo vuelve a validar.
- Los créditos del mapa van abajo a la izquierda, porque abajo a la derecha está el botón flotante.
- `MapView` pasa la instancia del mapa a `LugaresEnMapa` (`features/lugares/`), que dibuja:
  - **puntos** como `Marker` de MapLibre con un elemento HTML propio, donde React dibuja `IconoCategoria` con un portal. Así se ven igual que en las listas, tienen área de toque de 44 px y no hay que volver a crearlos al cambiar de tema;
  - **zonas** como capas `fill` y `line` de una fuente GeoJSON, que se vuelven a agregar en `style.load`. Si hay zonas superpuestas, al tocar se abre la más pequeña.
- Los datos salen de `useLugares()` (función `lugares_mapa()`), y el color y el ícono, de `useCategorias()`. Por eso, al editar una categoría, el mapa se actualiza solo.
- Tocar un lugar navega a `/lugares/:id` (`FichaLugar`). En `/lugares/nuevo` (`CrearPunto`), los lugares existentes no se pueden tocar.
- **Crear un punto** (`CrearPunto`): una mira fija sobre el centro del mapa (se actualiza con el evento `move`), "Mi ubicación" con `navigator.geolocation`, `buscarCercanos()` (`ubicaciones_cercanas`, 15 m) y `FormularioPunto`. La geometría se envía como texto EWKT (`SRID=4326;POINT(lng lat)`) y PostGIS la convierte. Ver [decisión 0018](decisiones/0018-lugares-en-el-mapa.md).
- Sin `VITE_MAP_STYLE_URL_DARK`, el modo oscuro se genera con `toNightStyle` (`nightStyle.ts`) a partir de Liberty, para conservar los nombres de los locales.
- La navegación está limitada a 1 km alrededor de Manila (`MANILA_MAX_BOUNDS`).

**Evidencias y archivos** (ver [decisión 0019](decisiones/0019-subida-de-evidencias.md))
- Todo acceso a archivos pasa por `lib/almacenamiento.ts`: `subirArchivo` (con avance, por `XMLHttpRequest`), `borrarArchivos` y `enlacesTemporales`. Para cambiar de proveedor solo se toca ese archivo.
- `features/evidencias/archivos.ts` decide el tipo de evidencia por el tipo MIME o, si falta, por la extensión, valida los 50 MB y arma la ruta `<estudio_id>/<uuid>-<nombre-seguro>`.
- `subidas.ts` es una cola fuera de React (`useSyncExternalStore`): sube de a uno, permite cancelar, reintentar y descartar, y sigue aunque se cierre la página. Al terminar, recarga `claveEvidencias(estudioId)`.
- Las fotos pasan por `comprimirFoto()` antes de subir. Los audios se graban con `GrabadorAudio` (`MediaRecorder`).
- `EstudioPresentacion` agrupa las evidencias por tipo y pone el ícono en el encabezado, no en cada tarjeta. El menú de acciones de cada evidencia permite descargar archivos, copiar enlaces (los firmados duran una hora) o copiar notas. Las fotos conservan el carrusel y ofrecen acciones para la foto seleccionada. El audio usa controles propios (play/pausa, barra de avance táctil de 44 px, tiempos y velocidades 1×, 2× y 3×). Para medios que deban manipularse en móvil, evita `controls` nativos: su distribución varía entre navegadores y dispositivos. Las URLs firmadas se renuevan desde `useEvidencias()` cada 50 minutos.

**Sesión**
- `AuthProvider` aplica `evaluarSesion()` (`politicaSesion.ts`, una función pura) cada segundo y al volver a la pestaña. Los tiempos están en `config/session.ts`.

## Variables de entorno

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env.local` | URL del proyecto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Clave pública (segura en el navegador) |
| `VITE_MAP_STYLE_URL_LIGHT` / `_DARK` | `.env.local` (opcional) | Estilos del mapa; por defecto OpenFreeMap |
| `SUPABASE_SECRET_KEY` | `.env.local` | **Solo scripts**, nunca con prefijo `VITE_` |
| `KIRA_USUARIO_EMAIL` | `.env.local` | Correo del usuario compartido para `usuario:crear`; admite `KRAPI_USUARIO_EMAIL` como alias temporal |

`.env.e2e` (versionado y sin secretos) configura las pruebas con servicios simulados. Si falta una variable obligatoria, la app muestra cuál en lugar de fallar. El identificador del proyecto Supabase y las claves `krapi-*` de `localStorage` se mantienen por compatibilidad; no son nombres visibles de la app.

## Pruebas

- `npm run test:e2e` corre Playwright en tamaño de celular contra un **Supabase simulado** (`e2e/soporte/supabase-falso.ts`): inicio de sesión y PostgREST en memoria, con las reglas del esquema real.
- Cada prueba arranca con la base vacía y prepara sus datos con el fixture `supabase.db`. Para iniciar sesión se usa `entrar()`.
- Si agregas tablas o funciones que la app consulta, **amplía el Supabase simulado** para que responda igual que el real.
- Para simular que RLS no deja borrar en una tabla: `supabase.borradosNegados.add('evidencias')`.
- El Supabase simulado también imita Storage (`supabase.archivos`): subir con las reglas del bucket, borrar y firmar enlaces. Con `supabase.fallarSubidas = true` las subidas fallan.
- `npm run db:test` corre las **pruebas de la base de datos** (`supabase/tests/*.test.sql`, pgTAP) sobre Supabase local en Docker (`npm run db:local`). Cubren lo que el simulador no puede probar: RLS, triggers y funciones. Para actuar como una cuenta se usa `set local role authenticated` y `set local request.jwt.claims = '{"sub": "<id>"}'`. Cada archivo corre dentro de una transacción que se deshace al final.
- Chromium corre con micrófono y cámara simulados (`playwright.config.ts`), así se prueba la grabación de audio.
