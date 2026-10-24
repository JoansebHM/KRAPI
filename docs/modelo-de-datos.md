# Modelo de datos

Base de datos PostgreSQL con PostGIS en **Supabase**. Todo el esquema está versionado en [`supabase/migrations/`](../supabase/migrations/) y se aplica con `npm run db:push`. Los tipos de TypeScript están en `src/types/database.ts` (`npm run db:types`).

Para el *porqué* de cada decisión, ver [`decisiones/`](decisiones/).

## Diagrama

![Modelo de datos: categorías, ubicaciones, estudios, responsables, evidencias y el bucket](diagramas/modelo-de-datos.svg)

## Tablas

Todas tienen `id uuid` (generado), `created_at` y `updated_at`; el trigger `set_updated_at()` mantiene `updated_at` al día. La excepción es `estudio_responsables`, que es una tabla de unión.

### `categorias`: tipos de local

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | text | Obligatorio, no vacío, **único** sin importar mayúsculas ni espacios (`categorias_nombre_unico`) |
| `color` | text | `#RRGGBB`. Por defecto `#0478FB` |
| `icono` | text | Clave del catálogo `src/features/categorias/iconos.tsx` (`cafe`, `hotel`…). Solo `[a-z0-9-]`. NULL = ícono genérico |

### `responsables`: personas del equipo

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | text | Obligatorio, no vacío, único sin importar mayúsculas ni espacios |
| `avatar_semilla` | text | Semilla del avatar dibujado (1–64 caracteres). NULL = se usa el `id` |

### `ubicaciones`: lugares (puntos y zonas)

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `tipo` | `tipo_ubicacion` | `punto` o `zona` |
| `geom` | `geometry(Geometry, 4326)` | POINT si es punto, POLYGON válido si es zona. **Debe quedar dentro de Manila** |
| `nombre` | text | Obligatorio |
| `descripcion`, `direccion`, `complemento` | text | Opcionales |
| `contacto_nombre`, `contacto_telefono` | text | Opcionales; el teléfono, si se escribe, debe tener formato de teléfono |
| `categoria_id` | uuid → `categorias` | Opcional. **ON DELETE SET NULL** |
| `estado` | `estado_ubicacion` | `activa` (por defecto) o `cerrada` |
| `archivada_en` | timestamptz | NULL = visible. Con fecha = archivada |

Las zonas no usan categoría, dirección ni contacto. Desde la app, la geometría se envía como texto EWKT (`SRID=4326;POINT(-75.574 6.213)`) y se lee en GeoJSON con `lugares_mapa()`. Índices: GiST sobre `geom`, sobre `categoria_id` y uno parcial para lo no archivado.

### `estudios`: visitas

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `ubicacion_id` | uuid → `ubicaciones` | Obligatorio. ON DELETE CASCADE |
| `fecha` | date | Obligatoria |
| `hora_inicio`, `hora_fin` | time | Obligatorias; `hora_fin > hora_inicio` (mismo día) |
| `titulo` | text | Obligatorio |
| `descripcion` | text | Notas, opcional |
| `entrevistado` | text | A quién se entrevistó ("Tendero"…), opcional, máximo 120 caracteres |
| `archivado_en` | timestamptz | NULL = visible |

La app guarda primero el estudio y después sus responsables (`estudio_responsables`). Si la segunda parte falla, borra el estudio recién creado, que todavía no tiene evidencias, para no dejarlo a medias.

### `estudio_responsables`: quién participó

`(estudio_id, responsable_id)` es la clave primaria. Ambas columnas tienen **ON DELETE CASCADE**: si se borra un responsable, sale de sus estudios.

### `evidencias`: material de cada estudio

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `estudio_id` | uuid → `estudios` | ON DELETE CASCADE |
| `tipo` | `tipo_evidencia` | `foto`, `audio`, `documento`, `texto`, `video` |
| `titulo` | text | Opcional |
| `archivo_path`, `archivo_nombre`, `archivo_mime`, `archivo_bytes` | | Archivo en el bucket (ruta única) |
| `texto` | text | Nota escrita en la app |
| `url_externa` | text | Enlace (`http(s)://`), por ejemplo a SharePoint |
| `proveedor` | `proveedor_almacenamiento` | `supabase`, `sharepoint`, `otro`. NULL solo para textos |

Reglas: cada evidencia es **exactamente una** de archivo, texto o enlace. Si es archivo, lleva nombre, tipo MIME y tamaño. Foto, audio y documento siempre son archivo. Un texto puede ser nota escrita o archivo. Un video puede ser enlace o archivo.

## Funciones

| Función | Qué devuelve | Uso |
| --- | --- | --- |
| `limite_manila()` | El polígono del barrio (SRID 4326). **Copia** de `src/features/map/manila.ts` | Regla `ubicaciones_dentro_de_manila` |
| `lugares_mapa()` | Lugares no archivados (`id`, `tipo`, `nombre`, `estado`, `categoria_id`) con su forma en GeoJSON (`geojson`); zonas primero | Dibujar los lugares en el mapa. PostgREST devuelve `geom` en binario (WKB), que el mapa no entiende |
| `ubicaciones_en_zona(zona_id)` | Puntos no archivados dentro de la zona | Ficha de la zona |
| `ubicaciones_cercanas(lng, lat, metros = 15)` | Hasta 5 puntos no archivados a menos de N metros, con su distancia | Aviso de posible duplicado al crear un punto |

Se llaman desde la app con `supabase.rpc('nombre', { ... })`. Corren con los permisos de quien llama, así que RLS aplica.

## Archivar en vez de borrar

- La app **archiva** lugares y estudios (`archivada_en` / `archivado_en = now()`) y los filtra con `archivada_en is null`. Recuperar es volver a poner NULL.
- Borrar de verdad está permitido solo para **un lugar sin estudios** creado por error, y para **evidencias** equivocadas.
- Las cascadas (`ON DELETE CASCADE`) existen como red de seguridad, pero la app no debería usarlas para lugares o estudios con histórico.
- **Los archivos del bucket no se borran solos** al borrar una evidencia, porque Supabase no permite borrarlos desde SQL. La app debe borrar el archivo con la API de Storage.

## Storage: bucket `evidencias`

- **Privado.** Los archivos se leen con **URLs firmadas** que expiran.
- **Hasta 50 MB por archivo** (el máximo del plan gratuito).
- **Tipos permitidos:**
  - fotos: JPEG, PNG, WebP, HEIC/HEIF
  - audios: MP3, M4A/MP4, AAC, WAV, WebM, OGG
  - documentos: PDF, Word, Excel, texto plano
- **Ruta:** `<estudio_id>/<uuid>-<nombre>`, con el nombre sin tildes, espacios ni símbolos (`Fachada día 1.jpg` → `Fachada-dia-1.jpg`). El nombre original queda en `archivo_nombre`.
- **Orden al guardar:** primero se sube el archivo y después se crea la fila en `evidencias` (con `proveedor = 'supabase'`). Si la fila falla, la app borra el archivo.
- **Orden al borrar:** primero la fila y después el archivo. Si falla el archivo, queda un archivo sin uso, pero nunca una evidencia sin su archivo.
- Las fotos llegan ya reducidas a 2048 px y en JPEG. Los audios grabados en la app son WebM (Chrome, Android) o MP4 (iPhone).

## Seguridad

- **Usuario compartido.** Hay un solo usuario, que crea un administrador con `npm run usuario:crear`. El **registro público está desactivado** (`[auth] enable_signup = false`).
- **RLS en todas las tablas.** El rol `authenticated` tiene acceso total y el rol `anon` no tiene ningún permiso. Lo mismo para el bucket.
- **Permisos explícitos.** El proyecto tiene desactivado "Automatically expose new tables" y activado "automatic RLS": cada tabla nueva debe traer en su migración los `grant` a `authenticated`, `enable row level security` y su política.
- **Claves.** La clave pública (`VITE_SUPABASE_PUBLISHABLE_KEY`) es segura en el navegador gracias a RLS. La clave secreta (`SUPABASE_SECRET_KEY`) **solo** va en `.env.local`, sin prefijo `VITE_`, y la usan los scripts de administración.

## Cómo cambiar el esquema

1. `npm run db:new nombre_del_cambio`.
2. Escribir el SQL, con comentarios, sus permisos y RLS si es una tabla nueva.
3. `npm run db:push` y `npm run db:types`.
4. Actualizar **este documento** en el mismo PR.

## Migraciones

| Archivo | Qué hace |
| --- | --- |
| `20261023180000_extensiones_y_tipos` | PostGIS, `set_updated_at`, enums `tipo_ubicacion`, `tipo_evidencia`, `proveedor_almacenamiento` |
| `20261023180100_catalogos` | `categorias` y `responsables` |
| `20261023180200_ubicaciones` | `limite_manila()` y `ubicaciones` |
| `20261023180300_estudios` | `estudios` y `estudio_responsables` |
| `20261023180400_evidencias` | `evidencias` |
| `20261023190000_permisos_y_rls` | Permisos solo para `authenticated` y RLS |
| `20261023190100_bucket_evidencias` | Bucket privado y sus políticas |
| `20261023210000_avatar_responsables` | `responsables.avatar_semilla` |
| `20261023220000_icono_categorias` | `categorias.icono` |
| `20261024000000_estado_archivado_entrevistado` | Estado, archivado, entrevistado, `ubicaciones_en_zona`, `ubicaciones_cercanas` |
| `20261024120000_lugares_mapa` | `lugares_mapa()` |
