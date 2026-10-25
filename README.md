# KIRA · Geovisor Kratos

KIRA es el geovisor del barrio Manila (El Poblado, Medellín) para registrar ubicaciones, estudios y evidencias de campo.

> **Documentación completa:** [`docs/`](docs/README.md) (producto, modelo de datos, arquitectura, diseño y decisiones). Para asistentes de código: [`CLAUDE.md`](CLAUDE.md). Con la app corriendo, toda la documentación se puede leer en **`/docs`** (por ejemplo http://localhost:5173/docs).

## Stack

- React + TypeScript + Vite
- MapLibre GL (mapa)
- Supabase con PostGIS (base de datos, autenticación y archivos)

## Correr en local

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # opcional: configura el estilo del mapa
npm run dev
```

Abre http://localhost:5173. Para probar desde el celular en la misma red Wi‑Fi:

```bash
npm run dev -- --host
```

## Identidad visual

Colores y tipografía siguen el Manual de marca Kratos 2026 (identidad Kratos Innovation Lab). Están en `src/styles/theme.css`.

- **Poppins** (texto) se carga desde Google Fonts.
- **Good Times** (nombre de la app) se usa si está instalada en el dispositivo; si no, se muestra Poppins Black. Para que todos la vean, agrega el archivo web en `public/fonts/good-times.woff2` (revisa que la licencia permita uso web) y añade `url('/fonts/good-times.woff2') format('woff2')` al `@font-face` de `theme.css`.

## Pruebas

Las pruebas de punta a punta (`e2e/`) usan [Playwright](https://playwright.dev) y corren en tamaño de celular contra un **Supabase simulado** en memoria (`e2e/soporte/supabase-falso.ts`) y un mapa base vacío. No tocan datos reales ni necesitan internet.

```bash
npx playwright install chromium   # solo la primera vez
npm run test:e2e
```

Si una prueba falla, `npx playwright show-report` muestra el paso exacto con captura y traza. Cada funcionalidad nueva debe venir con sus pruebas.

Las **pruebas de la base de datos** (`supabase/tests/`, con [pgTAP](https://pgtap.org)) corren sobre un Supabase local en Docker y revisan las reglas que el simulador no puede probar: políticas RLS, triggers y funciones.

```bash
npm run db:local   # levanta Supabase en Docker (la primera vez descarga las imágenes)
npm run db:test    # recrea la base local con todas las migraciones y corre las pruebas
npx supabase stop  # apaga Supabase local
```

## Navegación

- El mapa siempre está de fondo. Las secciones (Categorías, Responsables…) se abren encima desde el menú ☰: en celular ocupan la pantalla y en computador son un panel lateral.
- Cada sección tiene su propia dirección (`/categorias`), así que el botón "atrás" del celular funciona como se espera. Al tocar un lugar del mapa se abre su ficha en `/lugares/<id>`, y "+ Nuevo lugar" abre la mira para registrar uno en `/lugares/nuevo`.
- En el histórico de un lugar, tocar un estudio abre su presentación con el carrusel de fotos y el resto de evidencias. Desde el modal se puede editar o abrir la página del estudio para agregar evidencia.
- Al desplegar (#24) el hosting debe redirigir todas las rutas a `index.html`, excepto `/docs`, que es un archivo propio (`dist/docs/index.html`).

## Íconos de categorías

Cada categoría tiene un ícono de [Lucide](https://lucide.dev) (licencia ISC) dentro de un círculo de su color, como se verá en el mapa. En la base de datos se guarda una clave propia (`cafe`, `hotel`…); el catálogo que la traduce a su dibujo está en `src/features/categorias/iconos.tsx`. Para agregar un ícono, añade una entrada con una clave nueva y nunca cambies claves existentes.

## Avatares

Cada responsable tiene un avatar dibujado en blanco y negro (estilo Croodles de [DiceBear](https://www.dicebear.com/styles/croodles), licencia CC0). El dibujo se genera en el dispositivo a partir de una semilla guardada en `responsables.avatar_semilla`: no se guardan imágenes y funciona sin internet. Se elige desde el formulario del responsable.

## Base de datos (Supabase)

La base de datos se maneja como código: todo el esquema vive en `supabase/migrations/` y se aplica con la CLI de Supabase, que viene incluida como dependencia del proyecto.

### Primera vez (enlazar con el proyecto)

```bash
npx supabase login     # abre el navegador para iniciar sesión en Supabase
npm run db:link        # enlaza con el proyecto; pide la contraseña de la base de datos
npm run db:push        # aplica las migraciones que falten
npm run db:config      # aplica supabase/config.toml (por ejemplo, registro público desactivado)
npm run db:types       # genera src/types/database.ts a partir del esquema
```

La contraseña de la base de datos y las claves del proyecto **nunca** se suben al repositorio.

### Usuario compartido

KIRA no permite registrarse: hay un solo usuario para todo el equipo, que crea un administrador.

1. En `.env.local` completa `VITE_SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `KIRA_USUARIO_EMAIL` (ver `.env.example`). Se acepta `KRAPI_USUARIO_EMAIL` como alias temporal para instalaciones existentes.
2. Ejecuta `npm run usuario:crear`. Pide la contraseña sin mostrarla en pantalla. Si el usuario ya existe, le cambia la contraseña.

### Sesión en la app

- Para entrar se usa el usuario compartido (correo y contraseña). En `.env.local` deben estar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- El token de Supabase se renueva solo mientras la app esté abierta.
- La sesión se cierra tras **2 horas sin usar la app** (con un aviso un minuto antes) y, en todo caso, a los **7 días**. Los tiempos están en `src/config/session.ts`.
- Desde el menú de la cuenta se puede cerrar la sesión en **todos los dispositivos**: úsalo si cambia la contraseña o alguien deja el grupo. En los demás dispositivos tarda hasta una hora en aplicarse.
- El plan gratuito de Supabase no permite limitar sesiones desde el servidor, así que estos límites los aplica la app.

### Seguridad

- Sin sesión no se puede leer ni modificar nada: todas las tablas tienen Row Level Security y solo el rol `authenticated` tiene permisos.
- Los archivos van en el bucket privado `evidencias` (máximo 50 MB por archivo, solo fotos, audios y documentos) y se leen con URLs firmadas.
- Cada tabla nueva necesita sus permisos y su política en la misma migración que la crea.

### Cambiar el esquema

1. `npm run db:new nombre_del_cambio` crea un archivo nuevo en `supabase/migrations/`.
2. Escribe el SQL del cambio. No edites migraciones que ya se aplicaron: siempre agrega una nueva.
3. `npm run db:push` para aplicarla y `npm run db:types` para actualizar los tipos.
4. Si cambia una regla de seguridad, un trigger o una función, agrega o ajusta su prueba en `supabase/tests/` y córrela con `npm run db:test`.
5. Sube la migración, los tipos y las pruebas en el mismo PR.

### Modelo de datos

| Tabla | Qué guarda |
| --- | --- |
| `perfiles` | Una fila por cuenta: nombre, nombre de usuario, rol (miembro o admin), estado (pendiente, activo, rechazado o desactivado) y responsable vinculado |
| `categorias` | Tipos de lugar (comercio, café...) con un color y un ícono para el mapa |
| `responsables` | Personas que pueden figurar en los estudios, con la semilla de su avatar dibujado |
| `ubicaciones` | Lugares dentro de Manila: puntos (locales) y zonas (lo que se cubrió, por ejemplo una manzana). Con estado (activa/cerrada) |
| `estudios` | Cada visita a un lugar: fecha, horas, responsables, a quién se entrevistó, título y notas |
| `estudio_responsables` | Qué responsables participaron en cada estudio |
| `evidencias` | Archivos, textos o enlaces de video de cada estudio |

**Cómo se usa:** un lugar se crea una sola vez y acumula su histórico. Cada vez que alguien vuelve a ese lugar, se le **agrega un estudio nuevo**. Los estudios de zonas y de puntos tienen la misma estructura. La ficha de una zona muestra los locales que caen dentro (calculado por la geometría con `ubicaciones_en_zona`), y al crear un punto se avisa si hay otro a menos de 15 m (`ubicaciones_cercanas`) para no duplicarlo.

Reglas principales:

- Ninguna ubicación puede quedar fuera del barrio.
- Lugares y estudios **se archivan, no se borran** (`archivada_en` / `archivado_en`), para no perder el histórico. Solo se borra de verdad un lugar sin estudios creado por error, o una evidencia equivocada.
- Al borrar una categoría, sus ubicaciones quedan sin categoría.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve la versión de producción localmente |
| `npm run docs` | Genera la documentación navegable en `dist/docs/index.html` (un solo archivo que funciona sin internet) |
| `npm run lint` | Revisa el código con oxlint (falla también con advertencias) |
| `npm run test:e2e` | Corre las pruebas de punta a punta en un navegador |
| `npm run test:e2e:ui` | Abre las pruebas en la interfaz de Playwright para verlas paso a paso |
| `npm run db:link` | Enlaza la CLI con el proyecto de Supabase |
| `npm run db:new <nombre>` | Crea una migración nueva |
| `npm run db:push` | Aplica las migraciones pendientes |
| `npm run db:types` | Genera los tipos de TypeScript del esquema |
| `npm run db:config` | Aplica `supabase/config.toml` al proyecto |
| `npm run db:local` | Levanta Supabase en Docker para probar migraciones |
| `npm run db:test` | Recrea la base local y corre las pruebas de `supabase/tests/` |
| `npm run usuario:crear` | Crea o actualiza el usuario compartido |

## Estructura

```
src/
  app/          # Shell de la aplicación (layout, rutas)
  components/   # Piezas compartidas: diálogos, panel, menú, buscador, notificaciones
  config/       # Variables de entorno y configuración (sesión, mapa)
  features/     # Una carpeta por funcionalidad
    auth/       # Inicio de sesión, política de sesión y menú de la cuenta
    categorias/ # Administración de categorías
    responsables/ # Administración de responsables
    estudios/   # Estudios de cada lugar (visitas), su histórico y la página de cada estudio
    evidencias/ # Subir fotos, audios y documentos de un estudio
    lugares/    # Lugares en el mapa, su ficha y crear puntos
    map/        # Mapa base y límite del barrio
    theme/      # Modo claro y oscuro
  lib/          # Supabase, archivos (almacenamiento.ts), caché de datos, notificaciones y utilidades
  types/        # Tipos generados del esquema de la base de datos
  styles/       # Tema (colores, tipografía, espaciado)
e2e/            # Pruebas de punta a punta (Playwright)
  soporte/      # Supabase simulado y utilidades de las pruebas
scripts/
  docs/         # Generador de la documentación navegable (/docs)
supabase/
  config.toml   # Configuración del proyecto de Supabase
  migrations/   # Esquema de la base de datos, en orden
  tests/        # Pruebas de la base de datos (pgTAP)
```

## Cómo contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de empezar: explica el flujo de issues, ramas, commits y pull requests.
