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

- El mapa siempre está de fondo. En **celular**, las secciones (Categorías, Usuarios…) se abren desde el menú ☰ y ocupan la pantalla. En **computador**, el menú está siempre a la izquierda (☰ lo oculta o lo muestra) y cada sección se abre en un panel a la derecha, sin cerrar el menú. Tocar el mapa cierra el panel.
- Cada sección tiene su propia dirección (`/categorias`), así que el botón "atrás" del celular funciona como se espera. Al tocar un lugar del mapa se abre su ficha en `/lugares/<id>` (y "Mover" abre la mira en `/lugares/<id>/mover`), y "+ Nuevo lugar" abre la mira para registrar uno en `/lugares/nuevo`.
- En el histórico de un lugar, tocar un estudio abre su presentación con el carrusel de fotos (se pasan con los botones o deslizando el dedo; también a pantalla completa) y el resto de evidencias. Los PDF y los Word (`.docx`) se pueden ver dentro de la app con el botón "Ver". Desde el modal se puede editar o abrir la página del estudio para agregar evidencia.
- "+ Nuevo lugar" pregunta si se registra un **punto** (`/lugares/nuevo`), una **zona** (`/zonas/nueva`, se dibuja con la mira) o un **elemento** (`/elementos/nuevo`: una caneca, un poste… que no se estudia, pero recibe evidencias en su ficha). La forma de una zona se cambia en `/lugares/<id>/redibujar`, y sus tipos se administran en **Tipos de zona** (`/tipos-de-zona`).
- **Pizarra** (`/pizarra`) deja dibujar a mano alzada y escribir textos (que se mueven y se giran) sobre el mapa, y guardarlo como boceto; **Bocetos** (`/bocetos`) es el registro, con miniatura, autor y fecha ([decisión 0029](docs/decisiones/0029-pizarra-y-bocetos.md)).
- **Preguntas** (`/preguntas`) abre las guías de entrevista, una pestaña por tipo de actor, con las preguntas imprescindibles primero y el guion de autorización para grabar ([decisión 0031](docs/decisiones/0031-guias-de-preguntas.md)).
- **Salidas** (`/salidas`) lista las próximas y las anteriores. En cada salida (`/salidas/<id>`) los admins dibujan zonas (`/salidas/<id>/zonas/nueva`) y las asignan, y cada quien reporta lo suyo. Su sección "Qué se registró" lista los estudios ligados a ella. **Mis asignaciones** (`/mis-asignaciones`) muestra las zonas propias, con un contador en el menú de las que faltan por reportar. "Ver en el mapa" (o tocar la zona directamente en el mapa) abre `/salidas/<id>/zonas/<zona>`.
- Desde el menú de la cuenta, **Mi perfil** (`/perfil`) deja cambiar el nombre, el avatar y la contraseña.
- Los admins ven además **Usuarios** (`/usuarios`), con un contador de las cuentas que esperan aprobación. Ahí aprueban, rechazan, desactivan y reactivan cuentas, y nombran o quitan admins. Si un miembro entra a `/usuarios` por la URL, vuelve al mapa.
- El hosting redirige todas las rutas a `index.html`, excepto `/docs`, que es un archivo propio (`dist/docs/index.html`). En Vercel lo resuelve `vercel.json` (en la raíz); con otro proveedor hay que configurar el mismo redireccionamiento.

## Íconos de categorías

Cada categoría tiene un ícono de [Lucide](https://lucide.dev) (licencia ISC) dentro de un círculo de su color, como se verá en el mapa. En la base de datos se guarda una clave propia (`cafe`, `hotel`…); el catálogo que la traduce a su dibujo está en `src/features/categorias/iconos.tsx`. Para agregar un ícono, añade una entrada con una clave nueva y nunca cambies claves existentes.

## Avatares

Cada cuenta tiene un avatar dibujado en blanco y negro (estilo Croodles de [DiceBear](https://www.dicebear.com/styles/croodles), licencia CC0). El dibujo se genera en el dispositivo a partir de una semilla guardada en `perfiles.avatar_semilla`: no se guardan imágenes y funciona sin internet. Se elige al registrarse y se cambia en Mi perfil.

## Base de datos (Supabase)

La base de datos se maneja como código: todo el esquema vive en `supabase/migrations/` y se aplica con la CLI de Supabase, que viene incluida como dependencia del proyecto.

### Primera vez (enlazar con el proyecto)

```bash
npx supabase login     # abre el navegador para iniciar sesión en Supabase
npm run db:link        # enlaza con el proyecto; pide la contraseña de la base de datos
npm run db:push        # aplica las migraciones que falten
npm run db:config      # aplica supabase/config.toml (por ejemplo, el registro de cuentas)
npm run db:types       # genera src/types/database.ts a partir del esquema
npm run db:funciones   # despliega las Edge Functions (restablecer-clave)
```

La contraseña de la base de datos y las claves del proyecto **nunca** se suben al repositorio.

### Cuentas y admins

Cada integrante crea su cuenta desde la app y un admin la aprueba en **Usuarios**. Para lo que no se puede hacer desde la app hay dos scripts. Necesitan `VITE_SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `.env.local` (ver `.env.example`) y piden las contraseñas sin mostrarlas en pantalla.

- `npm run usuario:admin` crea una cuenta de admin activa o, si el nombre de usuario ya existe, la nombra admin y la activa. Sirve para el **primer admin**, que no tiene quién lo apruebe.
- `npm run usuario:clave` pone una contraseña nueva a una cuenta. Como las cuentas no tienen correo, así se ayuda a quien olvidó la suya. Desde la app, un admin hace lo mismo en **Usuarios** → la cuenta → "Poner contraseña temporal" (Edge Function `restablecer-clave`, [decisión 0022](docs/decisiones/0022-edge-function-restablecer-clave.md)).

Los dos aceptan el nombre de usuario como argumento (`npm run usuario:clave -- ana.gomez`) o lo preguntan.

### Sesión en la app

- Cada integrante crea su cuenta en "Crear una cuenta" (nombre, nombre de usuario y contraseña, sin correo) y entra con su nombre de usuario cuando un admin la apruebe. En `.env.local` deben estar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- El token de Supabase se renueva solo mientras la app esté abierta.
- La sesión se cierra tras **2 horas sin usar la app** (con un aviso un minuto antes) y, en todo caso, a los **7 días**. Los tiempos están en `src/config/session.ts`.
- Desde el menú de la cuenta se puede cerrar la sesión propia en **todos los dispositivos**: úsalo si perdiste un celular o alguien más conoce tu contraseña. En los demás dispositivos tarda hasta una hora en aplicarse. Para sacar a alguien del equipo, un admin desactiva su cuenta.
- El plan gratuito de Supabase no permite limitar sesiones desde el servidor, así que estos límites los aplica la app.

### Seguridad

- Sin sesión no se puede leer ni modificar nada, y tampoco con una cuenta que no esté activa: todas las tablas tienen Row Level Security según el estado y el rol de la cuenta (ver [`docs/modelo-de-datos.md`](docs/modelo-de-datos.md#seguridad)).
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
| `perfiles` | Una fila por cuenta: nombre, nombre de usuario, rol (miembro o admin), estado (pendiente, activo, rechazado o desactivado) y la semilla de su avatar dibujado |
| `categorias` | Tipos de lugar (comercio, café...) o de elemento (caneca, poste...) con un color y un ícono para el mapa, y si se usan en lugares, elementos o ambos |
| `tipos_zona` | De qué es una zona (comercial, residencial...) con un color para el mapa |
| `ubicaciones` | Lugares dentro de Manila: puntos (locales, con estado activa/cerrada), zonas (áreas, con su tipo) y elementos (canecas, postes…: sin estudios) |
| `comentarios_zona` | Comentarios del equipo sobre cada zona, con su autor |
| `salidas` | Salidas de campo (solo admins): nombre, fecha, hora de inicio y si se canceló |
| `asignaciones` | Zonas que se reparten en cada salida (no son zonas del mapa, aunque pueden quedar ligadas a una) |
| `asignacion_participantes` | A quién se asignó cada zona y su reporte: hora de fin y porcentaje cubierto |
| `estudios` | Cada visita a un lugar: fecha, horas, a quién se entrevistó, sus notas (una lista) y, si aplica, en qué salida se hizo. Sin título: se identifica por su fecha y hora |
| `estudio_participantes` | Qué cuentas participaron en cada estudio |
| `evidencias` | Archivos, textos o enlaces de video de cada estudio (o de cada elemento, que no tiene estudios) |
| `bocetos` | Dibujos hechos sobre el mapa en la pizarra: título, descripción, trazos (GeoJSON) y la imagen guardada (no se editan) |
| `bitacora` | Cada acción sobre los datos, con quién la hizo (solo la leen los admins) |

**Cómo se usa:** un lugar se crea una sola vez y acumula su histórico. Cada vez que alguien vuelve a ese lugar, se le **agrega un estudio nuevo**. Los estudios de zonas y de puntos tienen la misma estructura. La ficha de una zona muestra los locales que caen dentro (calculado por la geometría con `locales_en_zona`), y al crear un punto se avisa si hay otro a menos de 15 m (`ubicaciones_cercanas`) para no duplicarlo.

Reglas principales:

- Ninguna ubicación puede quedar fuera del barrio.
- Lugares y estudios **se archivan, no se borran** (`archivada_en` / `archivado_en`), para no perder el histórico. Solo se borra de verdad un lugar sin estudios (o un elemento sin evidencias) creado por error, o una evidencia equivocada.
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
| `npm run db:funciones` | Despliega las Edge Functions de `supabase/functions/` |
| `npm run db:local` | Levanta Supabase en Docker para probar migraciones |
| `npm run db:test` | Recrea la base local y corre las pruebas de `supabase/tests/` |
| `npm run usuario:admin` | Crea el primer admin o nombra admin una cuenta existente |
| `npm run usuario:clave` | Pone una contraseña nueva a una cuenta |

## Estructura

```
src/
  app/          # Shell de la aplicación (layout, rutas)
  components/   # Piezas compartidas: diálogos, panel, hoja inferior, menú, buscador, notificaciones
  config/       # Variables de entorno y configuración (sesión, mapa)
  features/     # Una carpeta por funcionalidad
    auth/       # Inicio de sesión, registro, política de sesión y menú de la cuenta
    bocetos/      # Pizarra (dibujar sobre el mapa), captura del mapa y registro de bocetos
    categorias/ # Administración de categorías
    elementos/    # Elementos (canecas, postes…): crearlos, su ficha y editarlos
    filtros/      # Filtros del mapa (elementos, categoría, fechas, horas, evidencia, responsables)
    preguntas/    # Guías de preguntas para las entrevistas (contenido estático)
    perfil/       # Mi perfil: nombre, avatar y contraseña
    salidas/      # Salidas, zonas asignadas, reportes y Mis asignaciones
    tiposZona/    # Tipos de zona (lista con color)
    usuarios/     # Cuentas: administración (solo admins), avatares y quién hizo qué
    zonas/        # Dibujar, crear, redibujar zonas; locales adentro y comentarios
    estudios/   # Estudios de cada lugar (visitas), su histórico y la página de cada estudio
    evidencias/ # Subir fotos, audios y documentos de un estudio o de un elemento
    lugares/    # Lugares en el mapa, su ficha, crear y mover puntos
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
  functions/    # Edge Functions (restablecer-clave)
```

## Cómo contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de empezar: explica el flujo de issues, ramas, commits y pull requests.
