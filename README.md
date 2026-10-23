# KRAPI · Geovisor Kratos

Geovisor del barrio Manila (El Poblado, Medellín) para registrar ubicaciones, estudios y evidencias de campo.

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

## Base de datos (Supabase)

La base de datos se maneja como código: todo el esquema vive en `supabase/migrations/` y se aplica con la CLI de Supabase, que viene incluida como dependencia del proyecto.

### Primera vez (enlazar con el proyecto)

```bash
npx supabase login     # abre el navegador para iniciar sesión en Supabase
npm run db:link        # enlaza con el proyecto; pide la contraseña de la base de datos
npm run db:push        # aplica las migraciones que falten
npm run db:types       # genera src/types/database.ts a partir del esquema
```

La contraseña de la base de datos y las claves del proyecto **nunca** se suben al repositorio.

### Cambiar el esquema

1. `npm run db:new nombre_del_cambio` crea un archivo nuevo en `supabase/migrations/`.
2. Escribe el SQL del cambio. No edites migraciones que ya se aplicaron: siempre agrega una nueva.
3. `npm run db:push` para aplicarla y `npm run db:types` para actualizar los tipos.
4. Sube la migración y los tipos en el mismo PR.

### Modelo de datos

| Tabla | Qué guarda |
| --- | --- |
| `categorias` | Tipos de lugar (comercio, café...) con un color para el mapa |
| `responsables` | Personas que pueden figurar en los estudios |
| `ubicaciones` | Puntos y zonas dentro de Manila, con dirección, contacto y categoría |
| `estudios` | Lo que se hizo en una ubicación: fecha, hora de inicio y fin, título |
| `estudio_responsables` | Qué responsables participaron en cada estudio |
| `evidencias` | Archivos, textos o enlaces de video de cada estudio |

Reglas principales: ninguna ubicación puede quedar fuera del barrio; al borrar una categoría sus ubicaciones quedan sin categoría; al borrar una ubicación se borran sus estudios y evidencias.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve la versión de producción localmente |
| `npm run lint` | Revisa el código con oxlint |
| `npm run db:link` | Enlaza la CLI con el proyecto de Supabase |
| `npm run db:new <nombre>` | Crea una migración nueva |
| `npm run db:push` | Aplica las migraciones pendientes |
| `npm run db:types` | Genera los tipos de TypeScript del esquema |

## Estructura

```
src/
  app/          # Shell de la aplicación (layout, rutas)
  config/       # Variables de entorno y configuración
  features/     # Una carpeta por funcionalidad
    map/        # Mapa base y límite del barrio
  styles/       # Tema (colores, tipografía, espaciado)
supabase/
  config.toml   # Configuración del proyecto de Supabase
  migrations/   # Esquema de la base de datos, en orden
```

## Cómo contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de empezar: explica el flujo de issues, ramas, commits y pull requests.
