-- =============================================================================
-- La Edge Function enviar-correo lee contactos con la clave secreta (#159)
--
-- Corrige 20261107230101_correos: el proyecto tiene desactivado "Automatically expose new
-- tables", así que service_role (el rol de la clave secreta) no podía leer `contactos`. La
-- función recibía un error, lo trataba como "sin destinatarios" y respondía 200 sin enviar
-- nada. En Supabase local el permiso se da solo, por eso no se vio en las pruebas.
-- service_role ignora RLS, solo necesita el permiso de lectura.
-- =============================================================================

grant select on table public.contactos to service_role;
