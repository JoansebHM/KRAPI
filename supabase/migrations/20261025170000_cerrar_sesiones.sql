-- =============================================================================
-- Cerrar las sesiones de una cuenta (#80)
--
-- La usa la Edge Function restablecer-clave después de poner una contraseña
-- temporal: quien tenía la sesión abierta con la contraseña anterior tendrá que
-- volver a entrar. Solo la puede llamar la clave secreta (service_role).
-- =============================================================================

create or replace function public.cerrar_sesiones(usuario_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = cerrar_sesiones.usuario_id
$$;

comment on function public.cerrar_sesiones(uuid) is
  'Borra las sesiones de la cuenta: ya no podrá renovar su token. Solo para service_role (Edge Function restablecer-clave).';

revoke execute on function public.cerrar_sesiones(uuid) from public, anon, authenticated;
grant execute on function public.cerrar_sesiones(uuid) to service_role;
