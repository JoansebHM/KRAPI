# Modelo de datos

Base de datos PostgreSQL con PostGIS en **Supabase**. Todo el esquema está versionado en [`supabase/migrations/`](../supabase/migrations/) y se aplica con `npm run db:push`. Los tipos de TypeScript están en `src/types/database.ts` (`npm run db:types`).

Para el *porqué* de cada decisión, ver [`decisiones/`](decisiones/).

## Diagrama

![Modelo de datos: categorías, ubicaciones, estudios, participantes (cuentas), evidencias y el bucket](diagramas/modelo-de-datos.svg)

## Tablas

Todas tienen `id uuid` (generado), `created_at` y `updated_at`; el trigger `set_updated_at()` mantiene `updated_at` al día. La excepción es `estudio_participantes`, que es una tabla de unión.

### Autoría

`categorias`, `ubicaciones`, `estudios` y `evidencias` guardan quién hizo cada cosa. Todas son uuid → `auth.users` con **ON DELETE SET NULL**.

| Columna | Dónde | Qué guarda |
| --- | --- | --- |
| `creado_por` | Las cuatro tablas | Quién creó el registro. No cambia al editar |
| `actualizado_por` | Las cuatro tablas | Quién lo editó por última vez (al crear, quien lo creó) |
| `archivada_por` / `archivado_por` | `ubicaciones` / `estudios` | Quién lo archivó. Se llena al archivar, se conserva si se edita archivado y se limpia al recuperar |

- **Las llena la base de datos**, no la app: el trigger `poner_autoria()` usa `auth.uid()` y reemplaza cualquier valor que mande la app, así que no se pueden falsear.
- Los cambios en cascada de las claves foráneas (por ejemplo, al borrar una cuenta) pasan sin tocar.
- Los registros anteriores a las cuentas individuales quedan en NULL y se muestran como **"Cuenta compartida"**.

### `perfiles`: cuentas del equipo

Una fila por cada cuenta de `auth.users` ([decisión 0021](decisiones/0021-usuarios-individuales.md)). Su `id` es el mismo de `auth.users` (**ON DELETE CASCADE**).

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | text | Obligatorio, de 1 a 80 caracteres. Lo elige cada quien |
| `usuario` | text | Nombre de usuario para entrar. **Único**, de 3 a 30 caracteres `[a-z0-9._-]` (siempre en minúsculas). No cambia |
| `rol` | `rol_usuario` | `miembro` (por defecto) o `admin` |
| `estado` | `estado_cuenta` | `pendiente` (por defecto), `activo`, `rechazado` o `desactivado`. Solo `activo` tiene acceso a los datos |
| `avatar_semilla` | text | Semilla del avatar dibujado (1–64 caracteres). NULL = se usa el `id`. Se elige al registrarse y se cambia en Mi perfil |
| `aprobado_por`, `aprobado_en` | uuid → `auth.users`, timestamptz | Quién aprobó la cuenta y cuándo |

- **Sin correos.** Supabase Auth exige un correo, así que la app entra con `<usuario>@usuarios.kira.invalid`. Nadie lo ve y nunca recibe nada.
- **El perfil lo crea la base de datos.** El trigger `crear_perfil_al_registrarse` (sobre `auth.users`) crea el perfil en `pendiente`. Toma el nombre de usuario del correo interno y el nombre y el avatar de los metadatos del registro (`nombre`, `avatar_semilla`). Rechaza las cuentas con un correo que no sea interno.
- **El correo interno no cambia** (trigger `impedir_cambio_correo`), porque el nombre de usuario no cambia.

### `categorias`: tipos de local

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | text | Obligatorio, no vacío, **único** sin importar mayúsculas ni espacios (`categorias_nombre_unico`) |
| `color` | text | `#RRGGBB`. Por defecto `#0478FB` |
| `icono` | text | Clave del catálogo `src/features/categorias/iconos.tsx` (`cafe`, `hotel`…). Solo `[a-z0-9-]`. NULL = ícono genérico |

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
| `notas` | text[] | Apuntes de la visita, en orden. Lista vacía = sin notas. Hasta 50, cada una de 1 a 2000 caracteres (`notas_validas()`) |
| `entrevistado` | text | A quién se entrevistó ("Tendero"…), opcional, máximo 120 caracteres |
| `participantes_anteriores` | text[] | Nombres de quienes participaron antes de las cuentas individuales y no tenían cuenta ([decisión 0023](decisiones/0023-participantes-son-cuentas.md)). Solo histórico |
| `archivado_en` | timestamptz | NULL = visible |

La app guarda primero el estudio y después sus participantes (`estudio_participantes`). Si la segunda parte falla, borra el estudio recién creado, que todavía no tiene evidencias, para no dejarlo a medias.

### `estudio_participantes`: quién participó

Las cuentas que participaron en cada estudio ([decisión 0023](decisiones/0023-participantes-son-cuentas.md)). `(estudio_id, usuario_id)` es la clave primaria; `usuario_id` → `perfiles`. Ambas columnas tienen **ON DELETE CASCADE**. La app solo deja elegir cuentas activas.

### `evidencias`: material de cada estudio

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `estudio_id` | uuid → `estudios` | ON DELETE CASCADE |
| `tipo` | `tipo_evidencia` | `foto`, `audio`, `documento`, `texto`, `video` |
| `titulo` | text | Opcional |
| `archivo_path`, `archivo_nombre`, `archivo_mime`, `archivo_bytes` | | Archivo en el bucket (ruta única) |
| `texto` | text | Texto escrito en la app (hoy no se usa: los apuntes van en `estudios.notas`) |
| `url_externa` | text | Enlace (`http(s)://`). Hoy la app solo acepta videos de SharePoint (`https://*.sharepoint.com`), con `proveedor = 'sharepoint'` |
| `proveedor` | `proveedor_almacenamiento` | `supabase`, `sharepoint`, `otro`. NULL solo para textos |

Reglas: cada evidencia es **exactamente una** de archivo, texto o enlace. Si es archivo, lleva nombre, tipo MIME y tamaño. Foto, audio y documento siempre son archivo. Un texto puede ser nota escrita o archivo. Un video puede ser enlace o archivo.

### `bitacora`: todo lo que pasó

Las columnas de autoría solo dicen quién creó y quién editó por última vez. La bitácora guarda **cada acción**, incluida una copia de lo que se borró.

| Columna | Tipo | Qué guarda |
| --- | --- | --- |
| `id` | bigint | Consecutivo |
| `ocurrio_en` | timestamptz | Cuándo |
| `usuario_id` | uuid | Quién (`auth.uid()`). **Sin clave foránea**, para no perderlo si se borra la cuenta. NULL = script o sistema |
| `tabla`, `registro_id` | text, uuid | Qué registro. En `estudio_participantes`, el id del estudio |
| `accion` | `accion_bitacora` | `crear`, `editar`, `archivar`, `recuperar` o `borrar` |
| `cambios` | jsonb | Al crear, los campos del registro. Al editar, archivar o recuperar, solo los que cambiaron: `{"titulo": {"antes": "…", "despues": "…"}}` |
| `registro_borrado` | jsonb | Al borrar, una copia completa del registro |

- La llena el trigger `registrar_bitacora()` en `categorias`, `ubicaciones`, `estudios`, `estudio_participantes` y `evidencias`, y en los cambios de `rol` y `estado` de `perfiles`.
- No registra las columnas que mantiene la base de datos (`created_at`, `updated_at`, `creado_por`, `actualizado_por`, `archivada_por`, `archivado_por`). Si solo cambió una de ellas, no se agrega nada.
- **Solo se agregan filas:** nadie la edita, la borra ni la vacía, ni siquiera con la clave secreta (trigger `impedir_cambios_bitacora()`). Solo los admins la leen.
- Índices por `registro_id` (con la fecha) y por `ocurrio_en`. La vista de la bitácora en la app queda para una issue posterior.

## Funciones

| Función | Qué devuelve | Uso |
| --- | --- | --- |
| `limite_manila()` | El polígono del barrio (SRID 4326). **Copia** de `src/features/map/manila.ts` | Regla `ubicaciones_dentro_de_manila` |
| `lugares_mapa()` | Lugares no archivados (`id`, `tipo`, `nombre`, `estado`, `categoria_id`) con su forma en GeoJSON (`geojson`); zonas primero | Dibujar los lugares en el mapa. PostgREST devuelve `geom` en binario (WKB), que el mapa no entiende |
| `ubicaciones_en_zona(zona_id)` | Puntos no archivados dentro de la zona | Ficha de la zona |
| `ubicaciones_cercanas(lng, lat, metros = 15)` | Hasta 5 puntos no archivados a menos de N metros, con su distancia | Aviso de posible duplicado al crear un punto |

Se llaman desde la app con `supabase.rpc('nombre', { ... })`. Corren con los permisos de quien llama, así que RLS aplica.

### Cuentas y permisos

Estas funciones son `security definer` (corren con permisos de dueño) y tienen `search_path` fijo.

| Función | Quién la usa | Qué hace |
| --- | --- | --- |
| `es_miembro_activo()` | Políticas RLS | `true` si quien llama tiene la cuenta activa |
| `es_admin()` | Políticas RLS | `true` si quien llama es admin con la cuenta activa |
| `usuario_disponible(usuario)` | Formulario de registro, **también sin sesión** | `true` si nadie tiene ese nombre de usuario (sin distinguir mayúsculas) |
| `aprobar_usuario(usuario_id)` | Admin | `pendiente` o `rechazado` → `activo`. Guarda `aprobado_por` y `aprobado_en` |
| `rechazar_usuario(usuario_id)` | Admin | `pendiente` → `rechazado` |
| `desactivar_usuario(usuario_id)` | Admin | `activo` → `desactivado`, y borra sus sesiones (`auth.sessions`) para que no pueda renovar el token |
| `reactivar_usuario(usuario_id)` | Admin | `desactivado` → `activo` |
| `cambiar_rol(usuario_id, rol)` | Admin | Nombra o quita admins entre las cuentas activas |
| `cerrar_sesiones(usuario_id)` | Solo `service_role` (Edge Function `restablecer-clave`) | Borra las sesiones de la cuenta después de ponerle una contraseña temporal |

Todas las de admin devuelven el perfil actualizado y fallan si quien llama no es admin (`42501`), si intenta cambiarse a sí mismo (`42501`) o si el cambio de estado no aplica (`22023`). Como nadie se cambia a sí mismo y quien llama es un admin activo, **nunca se queda el sistema sin admins**.

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

- **Cuentas.** El **registro está abierto** (`[auth] enable_signup = true`): cada integrante crea su cuenta desde la app y queda pendiente. La protección está en RLS, no en el registro. El primer admin se crea con `npm run usuario:admin` y las contraseñas olvidadas se restablecen con `npm run usuario:clave` (los scripts usan la clave secreta, con `select` y `update` sobre `perfiles` para `service_role`). El usuario compartido de antes (perfil "Cuenta compartida") quedó desactivado al pasar a las cuentas individuales (#81).
- **`perfiles`.** Cada quien lee su propio perfil aunque esté pendiente, y un miembro activo lee todos. Un miembro activo solo puede editar su `nombre` y su `avatar_semilla` (`grant update (nombre, avatar_semilla)`). El rol y el estado solo cambian con las funciones de administración, y nadie cambia los suyos.
- **RLS en todas las tablas, según el estado y el rol de la cuenta** ([decisión 0021](decisiones/0021-usuarios-individuales.md)). El rol `anon` no tiene ningún permiso.

  | Tabla | Leer, crear y editar | Borrar |
  | --- | --- | --- |
  | `categorias` | Cuenta activa | Solo admin |
  | `ubicaciones` | Cuenta activa | Quien la creó o un admin, y solo si **no tiene estudios** |
  | `estudios` | Cuenta activa | Quien lo creó o un admin (la app solo lo usa para deshacer un estudio recién creado) |
  | `estudio_participantes` | Cuenta activa | Cuenta activa |
  | `evidencias` | Cuenta activa | Quien la subió o un admin |
  | Bucket `evidencias` | Cuenta activa | Quien subió el archivo (`owner_id`, lo llena Storage) o un admin |

  Una cuenta pendiente, rechazada o desactivada recibe listas vacías y no puede crear nada, y las funciones del mapa no le devuelven nada. Como `es_miembro_activo()` se revisa en cada consulta, al desactivar a alguien pierde el acceso de inmediato, aunque su token siga vigente.
- **Un borrado sin permiso no da error.** RLS simplemente borra 0 filas, así que la app pide las filas borradas (`.delete().select('id')`) y, si no vuelve ninguna, lanza `SIN_PERMISO` (`lib/errores.ts`).
- **Las políticas llaman a las funciones como `(select es_miembro_activo())`**, para que Postgres las evalúe una vez por consulta y no una vez por fila.
- **Permisos explícitos.** El proyecto tiene desactivado "Automatically expose new tables" y activado "automatic RLS": cada tabla nueva debe traer en su migración los `grant` a `authenticated`, `enable row level security` y su política.
- **Claves.** La clave pública (`VITE_SUPABASE_PUBLISHABLE_KEY`) es segura en el navegador gracias a RLS. La clave secreta (`SUPABASE_SECRET_KEY`) **solo** va en `.env.local`, sin prefijo `VITE_`, y la usan los scripts de administración.

## Cómo cambiar el esquema

1. `npm run db:new nombre_del_cambio`.
2. Escribir el SQL, con comentarios, sus permisos y RLS si es una tabla nueva.
3. Probarla en Supabase local (`npm run db:local`). Si toca seguridad, triggers o funciones, agregar su prueba en `supabase/tests/` y correr `npm run db:test`.
4. `npm run db:push` y `npm run db:types`.
5. Actualizar **este documento** en el mismo PR.

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
| `20261025120000_perfiles` | `perfiles`, enums `rol_usuario` y `estado_cuenta`, triggers sobre `auth.users`, funciones de cuentas y backfill del usuario compartido |
| `20261025130000_autoria` | `creado_por`, `actualizado_por`, `archivada_por` y `archivado_por` con el trigger `poner_autoria()` |
| `20261025140000_rls_cuentas_activas` | Reemplaza el acceso total por políticas según el estado y el rol de la cuenta, también en el bucket |
| `20261025150000_bitacora` | `bitacora`, enum `accion_bitacora` y sus triggers |
| `20261025160000_permisos_scripts_admin` | `select` y `update` sobre `perfiles` para `service_role` (scripts de administración) |
| `20261025170000_cerrar_sesiones` | `cerrar_sesiones()` para la Edge Function `restablecer-clave` |
| `20261026120000_notas_del_estudio` | `estudios.notas` (lista) reemplaza a `descripcion`; la nota que había pasa a ser la primera |
| `20261026130000_participantes_son_cuentas` | `perfiles.avatar_semilla`, `estudio_participantes` y `estudios.participantes_anteriores`; pasa los responsables a sus cuentas y quita `responsables`, `estudio_responsables` y `perfiles.responsable_id` |
