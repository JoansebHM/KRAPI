-- =============================================================================
-- Último ingreso de cada cuenta, solo para admins (#163, decisión 0037)
--
-- Supabase guarda en auth.users.last_sign_in_at cuándo inició sesión cada cuenta por última vez,
-- pero el navegador no puede leer ese esquema. Esta función lo expone y solo responde a un admin
-- activo. Se hace con una función y no con una columna en `perfiles` porque cualquier cuenta
-- activa lee todos los perfiles, y este dato solo debe verlo un admin.
--
-- last_sign_in_at cambia cuando la persona inicia sesión con su contraseña, no cuando la app
-- renueva el token: con sesiones de hasta 7 días es el último *inicio de sesión*, no la última
-- actividad.
-- =============================================================================

create or replace function public.ultimos_accesos()
returns table (usuario_id uuid, ultimo_acceso timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un admin puede ver los últimos ingresos.' using errcode = '42501';
  end if;

  return query
    select u.id, u.last_sign_in_at
      from auth.users u
      join public.perfiles p on p.id = u.id;
end;
$$;

comment on function public.ultimos_accesos() is 'Admin: cuándo inició sesión por última vez cada cuenta (NULL si nunca). Lee auth.users.last_sign_in_at.';

revoke execute on function public.ultimos_accesos() from public, anon, authenticated;
grant execute on function public.ultimos_accesos() to authenticated;
