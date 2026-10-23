-- =============================================================================
-- Avatar dibujado de cada responsable
--
-- La app dibuja el avatar en el dispositivo (DiceBear, estilo Croodles) a partir de
-- esta semilla: la misma semilla siempre produce el mismo dibujo. No se guardan imágenes.
-- Si es NULL, la app usa el id del responsable como semilla.
-- =============================================================================

alter table public.responsables
  add column avatar_semilla text;

alter table public.responsables
  add constraint responsables_avatar_semilla_valida
  check (avatar_semilla is null or length(avatar_semilla) between 1 and 64);

comment on column public.responsables.avatar_semilla is
  'Semilla del avatar dibujado (DiceBear Croodles). NULL = se usa el id.';

-- Los permisos de la tabla (solo authenticated) y su política RLS ya cubren la columna nueva.
