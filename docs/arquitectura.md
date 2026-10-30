# Arquitectura

## Stack

| Pieza | Para qué |
| --- | --- |
| **React 19 + TypeScript (estricto) + Vite** | La app. Es privada y no necesita SEO, así que no hay servidor propio (ver [decisión 0001](decisiones/0001-vite-react-typescript.md)) |
| **MapLibre GL 6** | El mapa. Mapa base provisional: OpenFreeMap (gratis, sin clave) |
| **Supabase** (`@supabase/supabase-js`) | Base de datos PostgreSQL + PostGIS, autenticación y archivos. Una sola Edge Function (`restablecer-clave`, Deno) para lo que exige la clave secreta ([decisión 0022](decisiones/0022-edge-function-restablecer-clave.md)) |
| **TanStack Query** | Caché de datos: consultas, recargas y actualización después de guardar |
| **React Router** | Una dirección por sección (`/categorias`, `/lugares/:id`), así el "atrás" del celular funciona |
| **Sonner** | Notificaciones (toasts) |
| **Lucide** | Íconos de categorías e interfaz |
| **DiceBear (Croodles)** | Avatares dibujados de las cuentas |
| **Playwright** | Pruebas de punta a punta |
| **oxlint** | Revisión de código (`--deny-warnings`) |

## Estructura

```
src/
  app/            Shell: barra superior, rutas, pantalla de configuración incompleta
  components/     Piezas compartidas: Dialog, Panel, HojaInferior (como Dialog, pero no tapa el
                  mapa), MenuNavegacion, Buscador, Estados, FlechaLista, Notificaciones, PoweredBy
  config/         env.ts (variables), session.ts (tiempos de sesión)
  features/       Una carpeta por funcionalidad
    auth/         Login, registro, AuthProvider, política de sesión, menú de la cuenta,
                  nombre de usuario → correo interno (nombreDeUsuario.ts)
    bocetos/      Pizarra (PizarraPagina, TextosEnPizarra, EditarTexto, trazos.ts, useTrazosEnMapa),
                  captura del mapa y dibujo de los textos sobre la imagen (capturar.ts, dibujarTextos.ts),
                  registro de bocetos (BocetosPage, VerBoceto) y api.ts
    preguntas/    Guías de entrevista (decisión 0031): contenido estático (guias.ts), orden de las
                  preguntas (ordenar.ts), PreguntasPage (diálogo y pestañas), ListaPreguntas,
                  PreguntaDesplegable, EjercicioTarjetas y VistaAutorizacion
    categorias/   CRUD de categorías, colores, íconos y si se usan en lugares, elementos o ambos
    elementos/    Elementos (decisión 0028): crearlos con la mira (CrearElemento), su ficha
                  (FichaElemento) y editarlos (EditarElemento, CamposDelElemento)
    estudios/     Estudios de un lugar: formulario, participantes, notas, a qué salida se ligan
                  (SelectorSalida), histórico y página del estudio
    filtros/      Filtros del mapa: FiltrosProvider (contexto), BotonFiltros, PanelFiltros y
                  lugaresFiltrados() (api.ts), que cruza lugares y estudios del lado del cliente
    evidencias/   Subir, grabar, listar (ListaEvidencias) y borrar evidencias de un estudio o de un
                  elemento; cola de subidas y compresión de fotos; carrusel de fotos (CarruselFotos);
                  videos de SharePoint por enlace (AgregarVideo, sharepoint.ts)
    perfil/       Mi perfil: nombre, avatar y cambiar la contraseña
    salidas/      Salidas y zonas asignadas: SalidasPage, SalidaPagina, NuevaAsignacion (usa DibujarZona,
                  y deja reusar la forma de una asignación anterior), ReportarAsignacion, MisAsignacionesPage,
                  VerAsignacion y AsignacionesEnMapa (capas del mapa)
    lugares/      Lugares en el mapa (marcadores y zonas), su ficha (FichaLugar, AccionesDelLugar,
                  EditarPunto) y crear y mover puntos y elementos con la mira (MiraCentral, CrearPunto,
                  MoverPunto)
    map/          Mapa, contexto del mapa, polígono de Manila, estilo nocturno, worker de MapLibre
    theme/        Modo claro/oscuro
    tiposZona/    Tipos de zona: lista con color (TiposZonaPage)
    usuarios/     Cuentas: administración (solo admins), avatares (Avatar, SelectorAvatar) y useNombreDeCuenta
    zonas/        Zonas: DibujarZona (mira + vista previa), CrearZona (también desde una zona asignada,
                  ?asignacion=), RedibujarZona, ficha (LocalesEnZona, ComentariosZona, EditarZona) y
                  geometria.ts (área, lados cruzados, EWKT)
  lib/            supabase.ts, almacenamiento.ts (archivos), queryClient.ts, notificar.ts,
                  errores.ts, texto.ts, color.ts
  styles/         theme.css (tokens), ui.css (botones, campos, listas)
  types/          database.ts (tipos generados del esquema)
e2e/              Pruebas Playwright y Supabase simulado (e2e/soporte/)
supabase/         config.toml, migraciones, pruebas de la base de datos (tests/) y Edge Functions (functions/)
scripts/
  cuentas/        crear-admin.mjs y restablecer-clave.mjs (usuario:admin y usuario:clave), comun.mjs
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

Sin sesión, `App` tiene sus propias rutas: `/registro` muestra el registro y cualquier otra, el login. Los dos usan `PantallaAcceso` (marca y tema) y `CampoContrasena` (contraseña con "Mostrar").

Con sesión, `AuthProvider` carga el **perfil** de la cuenta (`usePerfil`) y lo expone en `useAuth()` junto con `esAdmin`. Si la cuenta no está activa, `App` muestra `CuentaNoActiva` (esperando aprobación, rechazada o desactivada) en lugar del mapa. El perfil se revisa cada 15 s mientras espera aprobación, cada minuto con la cuenta activa y siempre al volver a la pestaña: así la persona entra apenas la aprueban, y si un admin la desactiva se le cierra la sesión explicando por qué. `esAdmin` solo decide qué se muestra; la seguridad real está en RLS. Al cerrar sesión se vacía la caché de TanStack Query, para que otra cuenta en el mismo dispositivo no vea datos de la anterior.

Dentro de `AppConSesion`, `MapaProvider` envuelve a `MapView` y `Routes`, para que las pantallas que se abren encima puedan usar el mapa.

## Patrones a reutilizar

**Datos (`features/<x>/api.ts`)**
- **Autoría:** `creado_por` y `actualizado_por` los pone la base de datos. Para mostrar el nombre se usa `useNombreDeCuenta()` (`usuarios/api.ts`), que devuelve "Cuenta compartida" si no hay autor.
- Un hook por consulta (`useCategorias`) y uno por mutación (`useCrearCategoria`…), con TanStack Query.
- Clave de caché constante (`CLAVE_CATEGORIAS`). Las mutaciones la invalidan en `onSuccess`.
- Las listas de catálogos usan `refetchOnMount: 'always'`: muestran la caché al instante y se actualizan en segundo plano.
- Los conteos se traen embebidos: `select('id, nombre, ubicaciones(count)')`.
- **Escrituras en varias tablas:** Supabase no ofrece transacciones desde el navegador. Si la segunda escritura falla, se deshace la primera cuando todavía no tiene histórico. Por ejemplo, `useGuardarEstudio` borra el estudio recién creado si no pudo guardar sus participantes. Si la primera ya quedó y es un registro con valor (un lugar), se avisa en vez de borrarlo.
- **Eliminar con "Deshacer":** antes de borrar se guarda lo necesario para restaurar (el registro y sus relaciones), y la restauración reinserta con el **mismo id**.

**Errores y avisos**
- `notificar.exito / error / info / aviso / cargando` (`lib/notificar.ts`) es la única forma de mostrar toasts.
- `mensajeErrorDatos(error, { duplicado, sinPermiso })` (`lib/errores.ts`) traduce los errores de PostgREST (23505, 23514, 42501…) a español.
- **Borrados:** RLS no da error cuando no deja borrar, solo borra 0 filas. Por eso se borra con `.delete().eq(…).select('id')` y, si no vuelve ninguna fila, se lanza `SIN_PERMISO` para que `mensajeErrorDatos` muestre el mensaje de `sinPermiso`.
- Los errores de formulario van **en el campo** (`.field-error`), y los del servidor, en un toast. El formulario se queda abierto para corregir.

**Pantallas y formularios**
- `Panel`: cada sección se abre sobre el mapa, con un botón para volver. En celular ocupa todo y desde 900 px es un panel lateral de 440 px a la derecha. Admite un `pie`, por ejemplo el botón flotante `.fab`.
- **Menú:** `useEsEscritorio()` (`lib/`) decide. En celular, `MenuNavegacion` se abre encima con ☰ y se cierra al elegir. En computador, `MenuFijo` queda a la izquierda dentro de `.app-cuerpo` (el mapa se acomoda solo al espacio) y ☰ lo oculta o lo muestra (`krapi-menu-lateral` en `localStorage`). `CerrarPanelAlTocarElMapa` cierra el panel con un clic en el mapa, salvo que se toque un lugar (`tocoUnLugar`, en `lugares/tocarLugar.ts`).
- `Dialog`: modal accesible dibujado en `<body>` con portal. El encabezado siempre tiene título y botón X arriba a la derecha; el botón cierra mediante `onCerrar` y queda deshabilitado cuando el flujo no admite cierre. Con `onSubmit` se vuelve formulario. Al abrir enfoca el primer campo, el elemento con `data-autofocus` o el primer botón. **Al editar se enfoca el botón**, para que no salte el teclado. En celular sale desde abajo.
- Si desde un formulario se abre una confirmación, **se cierra el formulario** para que no queden dos diálogos encimados.
- Dentro del diálogo, los campos van en `.formulario` (`ui.css`). Los opcionales llevan `.field-opcional` en la etiqueta.
- Si un flujo tiene varios pasos (por ejemplo, ubicar → duplicados → lugar → estudio), los datos viven en la pantalla del flujo y no en cada diálogo, para no perderlos al volver atrás. Por eso `FormularioPunto` y `FormularioEstudio` son controlados (`campos` y `onCambiar`).
- **Dibujar zonas:** `DibujarZona` usa la misma `MiraCentral` que crear un punto, con "Agregar esquina", "Deshacer" y "Terminar", y una vista previa en el mapa (fuente `dibujo-zona`, en naranja). `problemaDeZona()` revisa antes de guardar: 3 esquinas o más, dentro de Manila, sin lados cruzados y al menos 20 m² (la base de datos lo exige también). La reutilizan crear y redibujar una zona.
- **Ficha del lugar:** `useLugar(id)` trae todo el lugar de `ubicaciones` (también si está archivado, a diferencia de `lugares_mapa()`), con `estudios(count)` y `evidencias(count)` para saber si se puede borrar. `CamposDelPunto` son los campos del punto, que comparten crear (`FormularioPunto`) y editar (`EditarPunto`). Si el lugar es un elemento, `FichaLugar` muestra `FichaElemento`; las dos usan `AccionesDelLugar` (editar, mover, cerrar, archivar y borrar).
- Para elegir uno o varios elementos con ícono o avatar (categoría, participantes) se usan botones `.chip` con `aria-pressed` dentro de `.chips`.
- `Panel` acepta `volver` para que el botón de atrás lleve a otra pantalla, por ejemplo de un estudio a la ficha de su lugar.
- **Estudios:** tocar uno del histórico abre `EstudioPresentacion`, un diálogo con sus datos, carrusel de fotos y otras evidencias (audio, documentos, texto y enlaces externos). Desde allí se edita con el mismo `FormularioEstudio`; "Agregar evidencia" abre la página `EstudioPagina` (`/lugares/:id/estudios/:estudioId`). Al guardar un estudio nuevo se navega a esa página. `useCamposEstudioNuevo()` prepara uno nuevo al abrir el formulario: hoy, de ahora a una hora después, con la cuenta propia y los participantes del último estudio de ese dispositivo (`krapi-ultimos-participantes` en `localStorage`, filtrados a las cuentas activas). Los estudios se archivan (`archivado_en`) con "Deshacer", nunca se borran.
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
  - **elementos** con el mismo marcador (`.marcador-elemento`), pero como una gota invertida de 26 px: el círculo se gira con la propiedad `rotate` y el `Marker` se sube con `offset` para que la punta, y no el centro, quede sobre la coordenada;
  - **zonas** como capas `fill` y `line` de una fuente GeoJSON, que se vuelven a agregar en `style.load`. Si hay zonas superpuestas, al tocar se abre la más pequeña.
- Los datos salen de `useLugares()` (función `lugares_mapa()`), y el color y el ícono, de `useCategorias()`. Por eso, al editar una categoría, el mapa se actualiza solo.
- Tocar un lugar navega a `/lugares/:id` (`FichaLugar`). En `/lugares/nuevo` (`CrearPunto`) y `/elementos/nuevo` (`CrearElemento`), los lugares existentes no se pueden tocar.
- **Crear un punto** (`CrearPunto`): una mira fija sobre el centro del mapa (se actualiza con el evento `move`), "Mi ubicación" con `navigator.geolocation` y, solo al crear un punto, "Usar mi ubicación" (`MiraCentral` con `onUsarUbicacion`: si la posición está dentro de Manila llama a `continuar` con ella, sin pasar por la mira), `buscarCercanos()` (`ubicaciones_cercanas`, 15 m) y `FormularioPunto`. La geometría se envía como texto EWKT (`SRID=4326;POINT(lng lat)`) y PostGIS la convierte. Ver [decisión 0018](decisiones/0018-lugares-en-el-mapa.md).
- **Crear un elemento** (`CrearElemento`): la misma mira, sin aviso de 15 m. Primero se llenan los datos y, al guardar, `buscarElementosCercanos()` (`elementos_cercanos`, 3 m, misma categoría) pregunta si es el mismo. Al guardar se abre su ficha.
- Sin `VITE_MAP_STYLE_URL_DARK`, el modo oscuro se genera con `toNightStyle` (`nightStyle.ts`) a partir de Liberty, para conservar los nombres de los locales.
- La navegación está limitada a 1 km alrededor de Manila (`MANILA_MAX_BOUNDS`).

**Pizarra y bocetos** (ver [decisión 0029](decisiones/0029-pizarra-y-bocetos.md))
- `PizarraPagina` pone una capa transparente (`.pizarra-lienzo`, `touch-action: none`) sobre el mapa. Con **Lápiz** recibe los toques (pointer events, un solo puntero) y el mapa no se entera; con **Mano** tiene `pointer-events: none` y el mapa se mueve. Cada trazo se guarda en píxeles mientras se dibuja, se simplifica al soltar (`simplificar()`, Douglas-Peucker) y se pasa a coordenadas con `map.unproject()`.
- Los trazos son capas del mapa (`useTrazosEnMapa`: fuente `pizarra-trazos`, con una capa de borde blanco y otra de color, que se vuelven a agregar en `style.load`). Por eso salen en la captura y siguen pegados al mapa.
- `capturarMapa()` copia el lienzo del mapa dentro del evento `render` (`toBlob`), sin `preserveDrawingBuffer`, y genera la miniatura con `createImageBitmap`. Solo sale lo que dibuja el lienzo: los marcadores son HTML, así que `.app-main:has(.pizarra)` los oculta.
- `useGuardarBoceto()` sube la imagen y la miniatura con `subirArchivo()` (`bocetos/<id>/…`) y después crea la fila; `useBorrarBoceto()` borra la fila y luego los archivos, como las evidencias.
- **Textos** ([decisión 0030](decisiones/0030-textos-en-la-pizarra.md)): `TextosEnPizarra` los dibuja como cajas HTML (`.pizarra-texto`) dentro de `.pizarra-textos`, posicionadas con `map.project()` y vueltas a calcular en el evento `move` (con `requestAnimationFrame`). Con la herramienta Texto reciben el puntero: arrastrar mueve (`map.unproject()`), la manija gira (el ángulo del puntero respecto al centro, acomodado a múltiplos de 15°, más el rumbo del mapa) y las flechas del teclado mueven. Lo que se está moviendo o girando es un estado local (`vivo`) y solo se guarda al soltar. Tocar el mapa vacío es el evento `click` del mapa (no se dispara si se arrastró).
- **Estado y Deshacer:** `PizarraPagina` guarda una lista de `Elemento` (`{ tipo: 'trazo' | 'texto' }`, en orden) y una pila de versiones anteriores (`cambiar()`, hasta 50): cada acción confirmada guarda la versión anterior. `elementosAGeoJSON()` los pasa a GeoJSON al guardar.
- **Captura con textos:** `capturarMapa(mapa, textos)` copia el lienzo y dibuja encima cada texto con `dibujarTextos()` (lienzo 2D): `translate` a la posición proyectada, `rotate(giro − rumbo)`, `strokeText` blanco y `fillText` del color, con la misma tipografía, interlineado y borde que el CSS (constantes en `trazos.ts`). La escala es `lienzo.width / lienzo.clientWidth`, por las pantallas de alta densidad.
- Mientras se está en `/pizarra`, `LugaresEnMapa` (`creando`), `AsignacionesEnMapa` (`dibujando`) y `CerrarPanelAlTocarElMapa` no navegan al tocar un lugar o una zona.

**Preguntas de entrevista** (ver [decisión 0031](decisiones/0031-guias-de-preguntas.md))
- El contenido es estático y versionado en `features/preguntas/guias.ts`; no hay tabla ni migración. `ordenarPreguntas(guia, moduloId)` (pura) devuelve las imprescindibles y las complementarias, con el tronco antes que el módulo.
- `PreguntasPage` usa `Dialog` y lee la guía, el módulo y la vista de `useSearchParams` (`?guia=&modulo=&vista=autorizacion`): pestaña y módulo con `replace`; la vista de autorización con `push` (y `state.vistaPropia`, para que cerrar sepa cuántos pasos volver). Es una vista interna del mismo diálogo, no un diálogo encima de otro. Se recuerdan en `localStorage` `krapi-preguntas-guia` y `krapi-preguntas-modulo-<guia>`.
- Las pestañas (`.pestanas`, ahora en `ui.css`) tienen la variante `.pestanas-desplazables` para filas que no caben.

**Evidencias y archivos** (ver [decisión 0019](decisiones/0019-subida-de-evidencias.md))
- Todo acceso a archivos pasa por `lib/almacenamiento.ts`: `subirArchivo` (con avance, por `XMLHttpRequest`), `borrarArchivos` y `enlacesTemporales`. Para cambiar de proveedor solo se toca ese archivo.
- **Dueño de una evidencia:** un estudio o un elemento (`DuenoEvidencia`, `{ tipo: 'estudio' | 'elemento', id }`). `useEvidencias`, la cola de subidas, `ListaEvidencias` y `AgregarVideo` lo reciben en vez de un `estudioId`, y la base de datos guarda `estudio_id` o `ubicacion_id` según el caso ([decisión 0028](decisiones/0028-elementos.md)).
- `features/evidencias/archivos.ts` decide el tipo de evidencia por el tipo MIME o, si falta, por la extensión, valida los 50 MB y arma la ruta `<estudio_id>/<uuid>-<nombre-seguro>` (o `elementos/<ubicacion_id>/…`).
- `subidas.ts` es una cola fuera de React (`useSyncExternalStore`): sube de a uno, permite cancelar, reintentar y descartar, y sigue aunque se cierre la página. Al terminar, `alCambiarEvidencias()` recarga las evidencias de su dueño y, si es un elemento, su ficha.
- Las fotos pasan por `comprimirFoto()` antes de subir. Los audios se graban con `GrabadorAudio` (`MediaRecorder`).
- `EstudioPresentacion` agrupa las evidencias por tipo y pone el ícono en el encabezado, no en cada tarjeta. El menú de acciones de cada evidencia (`AccionesEvidencia`) permite descargar archivos, copiar enlaces (los firmados duran una hora) o copiar notas. Las fotos van en `CarruselFotos`, con acciones para la foto seleccionada; se pasan con los botones, deslizando (`useDeslizar` en `src/lib/`, con `touch-action: pan-y` para no estorbar el desplazamiento vertical) y, a pantalla completa, con flechas y teclado. `ImagenConCarga` (`src/components/`) muestra un loader hasta que la imagen termina de cargar y precarga las vecinas; la ficha de un elemento usa el mismo carrusel. El audio usa controles propios (play/pausa, barra de avance táctil de 44 px, tiempos y velocidades 1×, 2× y 3×). Para medios que deban manipularse en móvil, evita `controls` nativos: su distribución varía entre navegadores y dispositivos. Las URLs firmadas se renuevan desde `useEvidencias()` cada 50 minutos.

**Sesión**
- `AuthProvider` aplica `evaluarSesion()` (`politicaSesion.ts`, una función pura) cada segundo y al volver a la pestaña. Los tiempos están en `config/session.ts`.

## Variables de entorno

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env.local` | URL del proyecto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Clave pública (segura en el navegador) |
| `VITE_MAP_STYLE_URL_LIGHT` / `_DARK` | `.env.local` (opcional) | Estilos del mapa; por defecto OpenFreeMap |
| `SUPABASE_SECRET_KEY` | `.env.local` | **Solo scripts** (`usuario:admin`, `usuario:clave`), nunca con prefijo `VITE_` |

`.env.e2e` (versionado y sin secretos) configura las pruebas con servicios simulados. Si falta una variable obligatoria, la app muestra cuál en lugar de fallar. El identificador del proyecto Supabase y las claves `krapi-*` de `localStorage` se mantienen por compatibilidad; no son nombres visibles de la app.

## Pruebas

- `npm run test:e2e` corre Playwright en tamaño de celular contra un **Supabase simulado** (`e2e/soporte/supabase-falso.ts`): cuentas, inicio de sesión y PostgREST en memoria, con las reglas del esquema real.
- Cada prueba arranca con la base vacía y prepara sus datos con el fixture `supabase.db`.
- **Cuentas:** cada prueba trae las de `CUENTAS`: `admin` (admin activo), `miembro` (Ana, miembro activo) y `pendiente` (Pepe). Todas usan la contraseña `CLAVE`. Para iniciar sesión se usa `entrar()` (como admin) o `entrar('miembro')` / `entrar('pendiente')`. Con `supabase.agregarCuenta({ usuario, estado, rol… })` se crean otras, y con `supabase.cuenta('ana')` se revisa o cambia una (por ejemplo, su `estado`).
- **Permisos:** el simulador aplica las reglas de RLS según la cuenta del token. Una cuenta que no está activa recibe listas vacías y no puede crear. Categorías solo las borra un admin; lugares (sin estudios ni evidencias), estudios, evidencias y archivos, quien los creó (`creado_por`, o `dueno` en `supabase.archivos`) o un admin. Un borrado sin permiso no da error y borra 0 filas, igual que en Supabase. También pone `creado_por` y `actualizado_por` y responde `usuario_disponible` y las funciones de admin.
- Si agregas tablas o funciones que la app consulta, **amplía el Supabase simulado** para que responda igual que el real.
- El Supabase simulado también imita Storage (`supabase.archivos`): subir con las reglas del bucket, borrar y firmar enlaces. Con `supabase.fallarSubidas = true` las subidas fallan.
- `npm run db:test` corre las **pruebas de la base de datos** (`supabase/tests/*.test.sql`, pgTAP) sobre Supabase local en Docker (`npm run db:local`). Cubren lo que el simulador no puede probar: RLS, triggers y funciones. Para actuar como una cuenta se usa `set local role authenticated` y `set local request.jwt.claims = '{"sub": "<id>"}'`. Cada archivo corre dentro de una transacción que se deshace al final.
- Chromium corre con micrófono y cámara simulados (`playwright.config.ts`), así se prueba la grabación de audio.
