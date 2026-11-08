# 0037 · Último ingreso de cada cuenta, solo para admins

**Estado:** aceptada · 2026-11 · Refs #163

## Contexto

Los admins querían saber cuándo ingresó por última vez cada cuenta, para ver quién no ha entrado a KIRA o quién dejó de usarla. Supabase ya guarda ese dato en `auth.users.last_sign_in_at`, pero el navegador no puede leer el esquema `auth`. Es un dato sobre las personas del equipo: lo deben ver los admins y nadie más.

## Decisión

- **Una función `ultimos_accesos()`** (`security definer`, con `search_path` fijo) que lee `auth.users.last_sign_in_at` y devuelve `(usuario_id, ultimo_acceso)` de cada cuenta. Dentro revisa `es_admin()` y, si quien llama no es un admin activo, falla con `42501`. Se le quita el permiso de ejecución a `public` y `anon`: solo `authenticated` puede llamarla, y la propia función filtra.
- **En Usuarios** (página que ya es solo de admins), la lista dice debajo de cada cuenta "ingresó hace 3 h", "ingresó hace 2 días" (pasada una semana, la fecha) o "nunca ha ingresado". La ficha de la cuenta muestra la fecha y la hora completas.
- **El dato es de apoyo**: si no se puede cargar, la página de Usuarios sigue funcionando sin él.

## Descartado

- **Una columna `perfiles.ultimo_ingreso`** copiada con un trigger: cualquier cuenta activa lee todas las filas de `perfiles`, así que todos verían el dato. Habría que reorganizar los permisos por columna de toda la tabla.
- **Una tabla aparte** con su propia RLS: más piezas para un solo dato que Supabase ya guarda.
- **Mostrarlo a todas las cuentas:** no se pidió, y saber cuándo entró cada persona es información que conviene limitar.

## Consecuencias

- **Es el último *inicio de sesión*, no la última actividad.** `last_sign_in_at` cambia cuando la persona escribe su contraseña, no cuando la app renueva el token. Con sesiones de hasta 7 días ([decisión 0007](0007-usuario-compartido-y-sesion.md)), alguien que usa KIRA a diario puede figurar con un último ingreso de hace días. Para saber quién está usando la app ahora está la presencia ([decisión 0036](0036-usuarios-en-linea.md)).
- Las cuentas que nunca iniciaron sesión salen con `NULL` ("nunca ha ingresado").
- Las pruebas e2e simulan la función (`ultimo_acceso` en el Supabase simulado, que no forma parte del perfil). Su regla de seguridad se prueba con pgTAP (`supabase/tests/ultimo-ingreso.test.sql`).
