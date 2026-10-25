-- =============================================================================
-- Permisos de los scripts de administración sobre perfiles (#79)
--
-- `npm run usuario:admin` y `npm run usuario:clave` usan la clave secreta (rol
-- service_role) para buscar cuentas por nombre de usuario y nombrar al primer
-- admin. El proyecto tiene desactivado "Automatically expose new tables", así
-- que el permiso se da aquí de forma explícita. service_role ignora RLS.
-- =============================================================================

grant select, update on table public.perfiles to service_role;
