# 0022 · Edge Function para restablecer contraseñas

**Estado:** aceptada · 2026-10 · Refs #80

## Contexto

Las cuentas no tienen correo ([decisión 0021](0021-usuarios-individuales.md)), así que nadie puede recuperar su contraseña solo. `npm run usuario:clave` lo resuelve, pero exige una terminal con la clave secreta. Hace falta que un admin lo pueda hacer desde la app. Cambiar la contraseña de **otra** cuenta exige la clave secreta de Supabase, que nunca puede llegar al navegador ([decisión 0001](0001-vite-react-typescript.md): sin servidor propio y la seguridad en RLS).

## Decisión

- Una **Edge Function** de Supabase, `restablecer-clave` (`supabase/functions/`), es la única pieza que corre en el servidor. Es una excepción acotada a la 0001: no hay un servidor propio que mantener, la despliega la CLI y solo hace esto.
- La función revisa con la sesión de quien llama que sea **admin activo** (`es_admin()`), no deja cambiar la propia (para eso está Mi perfil), valida el mínimo de 10 caracteres, cambia la contraseña con la clave secreta y **cierra las sesiones** de esa cuenta (`cerrar_sesiones()`, solo para `service_role`).
- En `/usuarios`, la ficha de una cuenta activa tiene "Poner contraseña temporal" (pedida dos veces). El admin se la pasa a la persona por un medio seguro.
- **No se obliga a cambiarla al entrar.** El aviso le pide al admin que le diga a la persona que la cambie en Mi perfil. Obligarlo exigiría marcar la cuenta y otra pantalla, y para un equipo pequeño basta con el aviso.

## Descartado

- **Recuperación por correo:** las cuentas no tienen correo (0021).
- **Solo el script `usuario:clave`:** se mantiene para quien tenga la terminal, pero no sirve en campo.
- **Una función SQL que cambie `auth.users`:** escribir el hash de la contraseña a mano salta las reglas de Supabase Auth y es frágil ante sus cambios.

## Consecuencias

- La función se despliega con `npm run db:funciones` (además de `db:push`). En local, `npm run db:local` la sirve sola.
- Las pruebas e2e simulan la función. Su lógica real se probó contra Supabase local.
