-- =============================================================================
-- Ícono de cada categoría
--
-- Guarda una clave propia (por ejemplo 'cafe', 'hotel', 'bar'), no el nombre del ícono en la
-- librería: el catálogo que traduce clave → dibujo está en src/features/categorias/iconos.tsx.
-- Si es NULL, la app muestra un ícono genérico.
-- =============================================================================

alter table public.categorias
  add column icono text;

alter table public.categorias
  add constraint categorias_icono_valido
  check (icono is null or icono ~ '^[a-z0-9-]{1,40}$');

comment on column public.categorias.icono is
  'Clave del ícono de la categoría (catálogo en src/features/categorias/iconos.tsx). NULL = ícono genérico.';

-- Los permisos de la tabla (solo authenticated) y su política RLS ya cubren la columna nueva.
