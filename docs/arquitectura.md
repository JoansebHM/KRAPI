# Arquitectura

## Stack

| Pieza | Para qué |
| --- | --- |
| **React 19 + TypeScript (estricto) + Vite** | La app. Es privada y no necesita SEO, así que no hay servidor propio (ver [decisión 0001](decisiones/0001-vite-react-typescript.md)) |
| **MapLibre GL 6** | El mapa. Mapa base provisional: OpenFreeMap (gratis, sin clave) |
| **Supabase** (`@supabase/supabase-js`) | Base de datos PostgreSQL + PostGIS, autenticación y archivos |
| **TanStack Query** | Caché de datos: consultas, recargas y actualización después de guardar |
| **React Router** | Una dirección por sección (`/categorias`), así el "atrás" del celular funciona |
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
                  Notificaciones, PoweredBy
  config/         env.ts (variables), session.ts (tiempos de sesión)
  features/       Una carpeta por funcionalidad
    auth/         Login, AuthProvider, política de sesión, menú de la cuenta
    categorias/   CRUD de categorías, colores e íconos
    map/          Mapa, polígono de Manila, estilo nocturno, worker de MapLibre
    responsables/ CRUD de responsables y avatares
    theme/        Modo claro/oscuro
  lib/            supabase.ts, queryClient.ts, notificar.ts, errores.ts, texto.ts, color.ts
  styles/         theme.css (tokens), ui.css (botones, campos, listas)
  types/          database.ts (tipos generados del esquema)
e2e/              Pruebas Playwright y Supabase simulado (e2e/soporte/)
supabase/         config.toml y migraciones
scripts/          crear-usuario-compartido.mjs
```

Una funcionalidad nueva va en su propia carpeta `src/features/<nombre>/`, con:
- `api.ts`: hooks de datos;
- los componentes;
- sus `.css` junto a cada componente.

## Cómo se arma la app

```
main.tsx
 └ BrowserRouter
    └ QueryClientProvider
       └ AuthProvider          (sesión + política de 2 h / 7 días)
          └ App
             ├ Notificaciones  (siempre montado)
             ├ Login           (si no hay sesión)
             └ AppConSesion
                ├ barra (menú ☰, KRAPI + "powered by KIT", tema, cuenta)
                ├ MapView      (siempre montado: no pierde su posición)
                ├ Routes       → Panel sobre el mapa (/categorias, /responsables…)
                ├ MenuNavegacion
                └ InactivityDialog
```

## Patrones a reutilizar

**Datos (`features/<x>/api.ts`)**
- Un hook por consulta (`useCategorias`) y uno por mutación (`useCrearCategoria`…), con TanStack Query.
- Clave de caché constante (`CLAVE_CATEGORIAS`). Las mutaciones la invalidan en `onSuccess`.
- Las listas de catálogos usan `refetchOnMount: 'always'`: muestran la caché al instante y se actualizan en segundo plano.
- Los conteos se traen embebidos: `select('id, nombre, ubicaciones(count)')`.
- **Eliminar con "Deshacer":** antes de borrar se guarda lo necesario para restaurar (el registro y sus relaciones), y la restauración reinserta con el **mismo id**.

**Errores y avisos**
- `notificar.exito / error / info / aviso / cargando` (`lib/notificar.ts`) es la única forma de mostrar toasts.
- `mensajeErrorDatos(error, { duplicado })` (`lib/errores.ts`) traduce los errores de PostgREST (23505, 23514, 42501…) a español.
- Los errores de formulario van **en el campo** (`.field-error`), y los del servidor, en un toast. El formulario se queda abierto para corregir.

**Pantallas y formularios**
- `Panel`: cada sección se abre sobre el mapa, con un botón para volver. En celular ocupa todo y desde 900 px es un panel lateral de 440 px. Admite un `pie`, por ejemplo el botón flotante `.fab`.
- `Dialog`: modal accesible dibujado en `<body>` con portal. Con `onSubmit` se vuelve formulario. Al abrir enfoca el primer campo, el elemento con `data-autofocus` o el primer botón. **Al editar se enfoca el botón**, para que no salte el teclado. En celular sale desde abajo.
- Si desde un formulario se abre una confirmación, **se cierra el formulario** para que no queden dos diálogos encimados.
- `Buscador`, `EstadoVacio`, `ListaCargando` y `ErrorCarga` para las listas.
- `normalizar`, `compararTexto` y `plural` (`lib/texto.ts`) para buscar y ordenar en español.

**Mapa**
- Importa MapLibre desde `features/map/maplibre.ts`: ahí se configura el worker (`setWorkerUrl`), que de otro modo se rompe con Vite.
- Al cambiar de tema se llama `setStyle` y las capas propias se vuelven a agregar en `style.load`.
- Sin `VITE_MAP_STYLE_URL_DARK`, el modo oscuro se genera con `toNightStyle` (`nightStyle.ts`) a partir de Liberty, para conservar los nombres de los locales.
- La navegación está limitada a 1 km alrededor de Manila (`MANILA_MAX_BOUNDS`).

**Sesión**
- `AuthProvider` aplica `evaluarSesion()` (`politicaSesion.ts`, una función pura) cada segundo y al volver a la pestaña. Los tiempos están en `config/session.ts`.

## Variables de entorno

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env.local` | URL del proyecto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Clave pública (segura en el navegador) |
| `VITE_MAP_STYLE_URL_LIGHT` / `_DARK` | `.env.local` (opcional) | Estilos del mapa; por defecto OpenFreeMap |
| `SUPABASE_SECRET_KEY` | `.env.local` | **Solo scripts**, nunca con prefijo `VITE_` |
| `KRAPI_USUARIO_EMAIL` | `.env.local` | Correo del usuario compartido para `usuario:crear` |

`.env.e2e` (versionado y sin secretos) configura las pruebas con servicios simulados. Si falta una variable obligatoria, la app muestra cuál en lugar de fallar.

## Pruebas

- `npm run test:e2e` corre Playwright en tamaño de celular contra un **Supabase simulado** (`e2e/soporte/supabase-falso.ts`): inicio de sesión y PostgREST en memoria, con las reglas del esquema real.
- Cada prueba arranca con la base vacía y prepara sus datos con el fixture `supabase.db`. Para iniciar sesión se usa `entrar()`.
- Si agregas tablas o funciones que la app consulta, **amplía el Supabase simulado** para que responda igual que el real.
