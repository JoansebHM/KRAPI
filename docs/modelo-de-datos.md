# Modelo de datos

Base de datos PostgreSQL con PostGIS en **Supabase**. Todo el esquema está versionado en [`supabase/migrations/`](../supabase/migrations/) y se aplica con `npm run db:push`. Los tipos de TypeScript están en `src/types/database.ts` (`npm run db:types`).

Para el *porqué* de cada decisión, ver [`decisiones/`](decisiones/).

## Diagrama

![Modelo de datos: categorías, tipos de zona, ubicaciones, estudios, participantes (cuentas), evidencias, comentarios de zona y el bucket](diagramas/modelo-de-datos.svg)

## Tablas

Todas tienen `id uuid` (generado), `created_at` y `updated_at`; el trigger `set_updated_at()` mantiene `updated_at` al día. Las excepciones son `estudio_participantes` y `asignacion_participantes`, que son tablas de unión.

### Autoría

`categorias`, `tipos_zona`, `ubicaciones`, `estudios`, `evidencias`, `comentarios_zona`, `bocetos`, `salidas` y `asignaciones` guardan quién hizo cada cosa. Todas son uuid → `auth.users` con **ON DELETE SET NULL**.

| Columna | Dónde | Qué guarda |
| --- | --- | --- |
| `creado_por` | Esas tablas | Quién creó el registro. No cambia al editar |
| `actualizado_por` | Esas tablas | Quién lo editó por última vez (al crear, quien lo creó) |
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

### `categorias`: tipos de local y de elemento

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | text | Obligatorio, no vacío, **único** sin importar mayúsculas ni espacios (`categorias_nombre_unico`) |
| `color` | text | `#RRGGBB`. Por defecto `#0478FB` |
| `icono` | text | Clave del catálogo `src/features/categorias/iconos.tsx` (`cafe`, `hotel`…). Solo `[a-z0-9-]`. NULL = ícono genérico |
| `aplica_a` | `uso_categoria` | `lugares` (por defecto), `elementos` o `ambos` ([decisión 0028](decisiones/0028-elementos.md)). Solo filtra el selector de la app: no se valida contra el tipo de la ubicación |

### `tipos_zona`: de qué es una zona

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | text | Obligatorio, **único** sin importar mayúsculas ni espacios |
| `color` | text | `#RRGGBB`, con el que se pinta la zona en el mapa. Por defecto lila |

Vienen cinco para empezar (Comercial, Residencial, Mixta, Parque o zona verde, Institucional). Los crea y edita cualquier cuenta activa; solo un admin los borra ([decisión 0024](decisiones/0024-zonas.md)).

### `ubicaciones`: lugares (puntos, zonas y elementos)

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `tipo` | `tipo_ubicacion` | `punto`, `zona` o `elemento`. **No cambia** después de crear el lugar (trigger `tipo_de_ubicacion_fijo()`) |
| `geom` | `geometry(Geometry, 4326)` | POINT si es punto o elemento, POLYGON válido si es zona. **Debe quedar dentro de Manila** |
| `nombre` | text | Obligatorio |
| `descripcion`, `direccion`, `complemento` | text | Opcionales |
| `contacto_nombre`, `contacto_telefono` | text | Opcionales; el teléfono, si se escribe, debe tener formato de teléfono |
| `categoria_id` | uuid → `categorias` | Opcional (puntos y elementos). **ON DELETE SET NULL** |
| `tipo_zona_id` | uuid → `tipos_zona` | Opcional y **solo para zonas**. ON DELETE SET NULL |
| `estado` | `estado_ubicacion` | `activa` (por defecto) o `cerrada` |
| `archivada_en` | timestamptz | NULL = visible. Con fecha = archivada |

Las zonas no usan categoría, dirección ni contacto, y deben tener **al menos 20 m²** (`ubicaciones_zona_area_minima`).

Un **elemento** ([decisión 0028](decisiones/0028-elementos.md)) es algo del barrio que se ubica y se documenta pero no se estudia: una caneca, un poste, un árbol. No tiene dirección ni contacto (`ubicaciones_elemento_sin_datos_de_local`), **no tiene estudios** (trigger `validar_ubicacion_de_estudio()` en `estudios`) y sus evidencias cuelgan de él (`evidencias.ubicacion_id`). Desde la app, la geometría se envía como texto EWKT (`SRID=4326;POINT(-75.574 6.213)`) y se lee en GeoJSON con `lugares_mapa()`. Índices: GiST sobre `geom`, sobre `categoria_id` y uno parcial para lo no archivado.

### `estudios`: visitas

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `ubicacion_id` | uuid → `ubicaciones` | Obligatorio. ON DELETE CASCADE |
| `fecha` | date | Obligatoria |
| `hora_inicio`, `hora_fin` | time | Obligatorias; `hora_fin > hora_inicio` (mismo día) |
| `notas` | text[] | Apuntes de la visita, en orden. Lista vacía = sin notas. Hasta 50, cada una de 1 a 2000 caracteres (`notas_validas()`) |
| `entrevistado` | text | A quién se entrevistó ("Tendero"…), opcional, máximo 120 caracteres |
| `participantes_anteriores` | text[] | Nombres de quienes participaron antes de las cuentas individuales y no tenían cuenta ([decisión 0023](decisiones/0023-participantes-son-cuentas.md)). Solo histórico |
| `salida_id` | uuid → `salidas` | Opcional. En qué salida se hizo ([decisión 0025](decisiones/0025-salidas-y-asignaciones.md)). ON DELETE SET NULL: si se borra la salida, el estudio no se pierde |
| `archivado_en` | timestamptz | NULL = visible |

Sin título: un estudio se identifica por su fecha y hora ("30 oct 2026 · 2:00 p. m."), no por un nombre que alguien tendría que inventar (decisión 0027).

La app guarda primero el estudio y después sus participantes (`estudio_participantes`). Si la segunda parte falla, borra el estudio recién creado, que todavía no tiene evidencias, para no dejarlo a medias.

La evidencia de una salida no es un sistema aparte: es la de siempre. Si la cuenta tiene una zona asignada en una salida que ya empezó y no está cancelada, el formulario del estudio ofrece ligarlo a ella.

### `estudio_participantes`: quién participó

Las cuentas que participaron en cada estudio ([decisión 0023](decisiones/0023-participantes-son-cuentas.md)). `(estudio_id, usuario_id)` es la clave primaria; `usuario_id` → `perfiles`. Ambas columnas tienen **ON DELETE CASCADE**. La app solo deja elegir cuentas activas.

### `bocetos`: dibujos sobre el mapa

Lo que se dibuja en la pizarra, guardado como pantallazo ([decisión 0029](decisiones/0029-pizarra-y-bocetos.md)).

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `titulo` | text | Obligatorio, de 1 a 120 caracteres sin contar los espacios de los extremos |
| `descripcion` | text | Opcional, hasta 1000 caracteres |
| `trazos` | jsonb | FeatureCollection de GeoJSON: un LineString por trazo, con sus propiedades `color` y `grosor` (px) y coordenadas reales. Hasta 1 MB. Hoy la app no la lee: sirve para editar los dibujos más adelante |
| `imagen_path` | text | El pantallazo (PNG) en el bucket `evidencias`, en `bocetos/<id>/imagen.png`. Único |
| `miniatura_path` | text | La miniatura (JPEG de 480 px) para las listas, en `bocetos/<id>/miniatura.jpg`. Único |
| `ancho`, `alto` | integer | Medidas de la imagen en píxeles, mayores que 0 |

Un boceto **no se edita**: la tabla no tiene permiso de `update`. Se crea, se consulta y se borra. Al borrar la fila, la app borra sus dos archivos del bucket.

### `comentarios_zona`: lo que el equipo dice de una zona

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `ubicacion_id` | uuid → `ubicaciones` | La zona. ON DELETE CASCADE |
| `texto` | text | De 1 a 2000 caracteres |
| `creado_por`, `created_at` | | Quién lo escribió y cuándo (autoría) |

Lo lee y lo escribe cualquier cuenta activa; lo borra quien lo escribió o un admin.

### `salidas`: salidas de campo

Las arman los admins para repartir zonas ([decisión 0025](decisiones/0025-salidas-y-asignaciones.md)). No agrupan estudios.

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `nombre` | text | De 1 a 120 caracteres |
| `fecha`, `hora_inicio` | date, time | Cuándo empieza |
| `cancelada_en` | timestamptz | Si tiene fecha, la salida se canceló. Se puede reactivar (NULL) |

### `asignaciones`: zonas de una salida

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `salida_id` | uuid → `salidas` | ON DELETE CASCADE |
| `nombre` | text | De 1 a 120 caracteres |
| `geom` | geometry(Polygon, 4326) | Válida, dentro de Manila y de al menos 20 m² |
| `forma` | jsonb | **Calculada** (`generated always`): `geom` en GeoJSON, para leerla sin una función |
| `zona_id` | uuid → `ubicaciones` | Opcional. La zona del mapa a la que corresponde este cuadrante, si ya se registró como tal. ON DELETE SET NULL. Debe apuntar a una zona (`tipo = 'zona'`), lo exige el trigger `validar_zona_de_asignacion()` |

No son zonas del mapa (`ubicaciones`): cambian de una salida a otra. Si el mismo cuadrante se vuelve a asignar en otra salida, esa nueva asignación puede quedar ligada a la **misma** zona del mapa (`zona_id`), para no crear una duplicada ([decisión 0025](decisiones/0025-salidas-y-asignaciones.md)).

### `asignacion_participantes`: quién cubre cada zona y su reporte

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `asignacion_id`, `usuario_id` | uuid → `asignaciones`, `perfiles` | Clave primaria. ON DELETE CASCADE |
| `hora_fin` | time | A qué hora terminó |
| `porcentaje` | smallint | Cuánto cubrió: 0, 25, 50, 75 o 100 |
| `reportado_en` | timestamptz | Cuándo reportó |

El reporte va completo: `hora_fin` y `porcentaje` los dos o ninguno.

### `evidencias`: material de cada estudio o elemento

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `estudio_id` | uuid → `estudios` | El estudio de la evidencia. ON DELETE CASCADE |
| `ubicacion_id` | uuid → `ubicaciones` | Solo para **elementos**, que no tienen estudios. Debe apuntar a un elemento (trigger `validar_elemento_de_evidencia()`). ON DELETE CASCADE |
| `tipo` | `tipo_evidencia` | `foto`, `audio`, `documento`, `texto`, `video` |
| `titulo` | text | Opcional |
| `archivo_path`, `archivo_nombre`, `archivo_mime`, `archivo_bytes` | | Archivo en el bucket (ruta única) |
| `texto` | text | Texto escrito en la app (hoy no se usa: los apuntes van en `estudios.notas`) |
| `url_externa` | text | Enlace (`http(s)://`). Hoy la app solo acepta videos de SharePoint (`https://*.sharepoint.com`), con `proveedor = 'sharepoint'` |
| `proveedor` | `proveedor_almacenamiento` | `supabase`, `sharepoint`, `otro`. NULL solo para textos |

Reglas: cada evidencia es de **exactamente uno** de estudio o elemento (`evidencias_de_estudio_o_elemento`), y es **exactamente una** de archivo, texto o enlace. Si es archivo, lleva nombre, tipo MIME y tamaño. Foto, audio y documento siempre son archivo. Un texto puede ser nota escrita o archivo. Un video puede ser enlace o archivo.

### `bitacora`: todo lo que pasó

Las columnas de autoría solo dicen quién creó y quién editó por última vez. La bitácora guarda **cada acción**, incluida una copia de lo que se borró.

| Columna | Tipo | Qué guarda |
| --- | --- | --- |
| `id` | bigint | Consecutivo |
| `ocurrio_en` | timestamptz | Cuándo |
| `usuario_id` | uuid | Quién (`auth.uid()`). **Sin clave foránea**, para no perderlo si se borra la cuenta. NULL = script o sistema |
| `tabla`, `registro_id` | text, uuid | Qué registro. En `estudio_participantes`, el id del estudio; en `asignacion_participantes`, el de la zona asignada |
| `accion` | `accion_bitacora` | `crear`, `editar`, `archivar`, `recuperar` o `borrar` |
| `cambios` | jsonb | Al crear, los campos del registro. Al editar, archivar o recuperar, solo los que cambiaron: `{"nombre": {"antes": "…", "despues": "…"}}` |
| `registro_borrado` | jsonb | Al borrar, una copia completa del registro |

- La llena el trigger `registrar_bitacora()` en `categorias`, `tipos_zona`, `ubicaciones`, `estudios`, `estudio_participantes`, `evidencias`, `comentarios_zona`, `bocetos`, `salidas`, `asignaciones` y `asignacion_participantes`, y en los cambios de `rol` y `estado` de `perfiles`. Cancelar o reactivar una salida queda como `archivar` o `recuperar`.
- No registra las columnas que mantiene la base de datos (`created_at`, `updated_at`, `creado_por`, `actualizado_por`, `archivada_por`, `archivado_por`, y `forma`, que se calcula). Si solo cambió una de ellas, no se agrega nada.
- **Solo se agregan filas:** nadie la edita, la borra ni la vacía, ni siquiera con la clave secreta (trigger `impedir_cambios_bitacora()`). Solo los admins la leen.
- Índices por `registro_id` (con la fecha) y por `ocurrio_en`. La vista de la bitácora en la app queda para una issue posterior.

## Funciones

| Función | Qué devuelve | Uso |
| --- | --- | --- |
| `limite_manila()` | El polígono del barrio (SRID 4326). **Copia** de `src/features/map/manila.ts` | Regla `ubicaciones_dentro_de_manila` |
| `lugares_mapa()` | Lugares no archivados (`id`, `tipo`, `nombre`, `estado`, `categoria_id`, `tipo_zona_id`) con su forma en GeoJSON (`geojson`); zonas primero y luego puntos y elementos por nombre | Dibujar los lugares en el mapa. PostgREST devuelve `geom` en binario (WKB), que el mapa no entiende |
| `ubicaciones_en_zona(zona_id)` | Puntos no archivados dentro de la zona | (Reemplazada en la app por `locales_en_zona`) |
| `locales_en_zona(zona_id)` | Puntos no archivados dentro de la zona o sobre su borde (`id`, `nombre`, `categoria_id`, `estado`) con la fecha de su último estudio (`ultimo_estudio`) | Ficha de la zona |
| `ubicaciones_cercanas(lng, lat, metros = 15)` | Hasta 5 puntos no archivados a menos de N metros, con su distancia | Aviso de posible duplicado al crear un punto |
| `elementos_cercanos(lng, lat, categoria_id, metros = 3)` | Hasta 5 elementos no archivados **de la misma categoría** (NULL = sin categoría) a menos de N metros, con su distancia | Aviso de posible duplicado al crear un elemento |

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
- Borrar de verdad está permitido solo para **un lugar sin estudios** (o **un elemento sin evidencias**) creado por error, y para **evidencias** equivocadas.
- Las cascadas (`ON DELETE CASCADE`) existen como red de seguridad, pero la app no debería usarlas para lugares o estudios con histórico.
- **Los archivos del bucket no se borran solos** al borrar una evidencia, porque Supabase no permite borrarlos desde SQL. La app debe borrar el archivo con la API de Storage.

## Storage: bucket `evidencias`

- **Privado.** Los archivos se leen con **URLs firmadas** que expiran.
- **Hasta 50 MB por archivo** (el máximo del plan gratuito).
- **Tipos permitidos:**
  - fotos: JPEG, PNG, WebP, HEIC/HEIF
  - audios: MP3, M4A/MP4, AAC, WAV, WebM, OGG
  - documentos: PDF, Word, Excel, texto plano
- **Ruta:** `<estudio_id>/<uuid>-<nombre>`, `elementos/<ubicacion_id>/<uuid>-<nombre>` para un elemento, o `bocetos/<id>/imagen.png` y `bocetos/<id>/miniatura.jpg` para un boceto, con el nombre sin tildes, espacios ni símbolos (`Fachada día 1.jpg` → `Fachada-dia-1.jpg`). El nombre original queda en `archivo_nombre`.
- **Orden al guardar:** primero se sube el archivo y después se crea la fila en `evidencias` (con `proveedor = 'supabase'`). Si la fila falla, la app borra el archivo.
- **Orden al borrar:** primero la fila y después el archivo. Si falla el archivo, queda un archivo sin uso, pero nunca una evidencia sin su archivo.
- Las fotos llegan ya reducidas a 2048 px y en JPEG. Los audios grabados en la app son WebM (Chrome, Android) o MP4 (iPhone).

## Seguridad

- **Cuentas.** El **registro está abierto** (`[auth] enable_signup = true`): cada integrante crea su cuenta desde la app y queda pendiente. La protección está en RLS, no en el registro. El primer admin se crea con `npm run usuario:admin` y las contraseñas olvidadas se restablecen con `npm run usuario:clave` (los scripts usan la clave secreta, con `select` y `update` sobre `perfiles` para `service_role`). El usuario compartido de antes (perfil "Cuenta compartida") quedó desactivado al pasar a las cuentas individuales (#81).
- **`perfiles`.** Cada quien lee su propio perfil aunque esté pendiente, y un miembro activo lee todos. Un miembro activo solo puede editar su `nombre` y su `avatar_semilla` (`grant update (nombre, avatar_semilla)`). El rol y el estado solo cambian con las funciones de administración, y nadie cambia los suyos.
- **RLS en todas las tablas, según el estado y el rol de la cuenta** ([decisión 0021](decisiones/0021-usuarios-individuales.md)). El rol `anon` no tiene ningún permiso.

  | Tabla | Leer, crear y editar | Borrar |
  | --- | --- | --- |
  | `categorias`, `tipos_zona` | Cuenta activa | Solo admin |
  | `ubicaciones` | Cuenta activa | Quien la creó o un admin, y solo si **no tiene estudios ni evidencias** (las de un elemento) |
  | `estudios` | Cuenta activa | Quien lo creó o un admin (la app solo lo usa para deshacer un estudio recién creado) |
  | `estudio_participantes` | Cuenta activa | Cuenta activa |
  | `evidencias` | Cuenta activa | Quien la subió o un admin |
  | `comentarios_zona` | Cuenta activa (editar: su autor o un admin) | Quien lo escribió o un admin |
  | `bocetos` | Leer y crear: cuenta activa. **No se edita** | Quien lo hizo o un admin |
  | `salidas`, `asignaciones` | Leer: cuenta activa. Crear y editar: solo admin | Solo admin (las salidas se cancelan, no se borran) |
  | `asignacion_participantes` | Leer: cuenta activa. Asignar: solo admin. Reportar (`hora_fin`, `porcentaje`, `reportado_en`): la persona asignada o un admin | Solo admin |
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
| `20261026140000_zonas` | `tipos_zona` (con cinco tipos), `ubicaciones.tipo_zona_id`, área mínima de 20 m², `comentarios_zona`, `lugares_mapa()` con el tipo y `locales_en_zona()` |
| `20261026150000_salidas_y_asignaciones` | `salidas`, `asignaciones` (con `forma` calculada) y `asignacion_participantes`, con sus permisos; `registrar_bitacora()` ignora `forma` y registra las tablas de unión con el id de la asignación |
| `20261026160000_estudios_de_una_salida` | `estudios.salida_id` (opcional, ON DELETE SET NULL) |
| `20261026170000_zona_de_asignacion` | `asignaciones.zona_id` (opcional, ON DELETE SET NULL) y el trigger `validar_zona_de_asignacion()` |
| `20261026180000_quitar_titulo_estudio` | Quita `estudios.titulo` ([decisión 0027](decisiones/0027-quitar-titulo-del-estudio.md)) |
| `20261027120000_tipo_elemento` | Valor `elemento` en `tipo_ubicacion` (va solo: un valor nuevo de un enum no se usa en la misma transacción) |
| `20261027120100_elementos` | Elementos ([decisión 0028](decisiones/0028-elementos.md)): `categorias.aplica_a` (enum `uso_categoria`), reglas de los elementos, `evidencias.ubicacion_id`, borrar sin evidencias, `lugares_mapa()` ordenada y `elementos_cercanos()` |
| `20261027130000_bocetos` | `bocetos` ([decisión 0029](decisiones/0029-pizarra-y-bocetos.md)): sin permiso de editar, con autoría y bitácora; sus archivos van en el bucket `evidencias` |
