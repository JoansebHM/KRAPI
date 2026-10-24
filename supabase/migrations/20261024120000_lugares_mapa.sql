-- =============================================================================
-- Lugares para el mapa
--
-- PostgREST devuelve las columnas geometry en formato binario (WKB), que el mapa no entiende.
-- Esta función entrega los lugares visibles (no archivados) con su forma en GeoJSON.
-- =============================================================================

create or replace function public.lugares_mapa()
returns table (
  id uuid,
  tipo public.tipo_ubicacion,
  nombre text,
  estado public.estado_ubicacion,
  categoria_id uuid,
  geojson jsonb
)
language sql
stable
set search_path = ''
as $$
  select u.id, u.tipo, u.nombre, u.estado, u.categoria_id,
         -- 6 decimales ≈ 10 cm: suficiente precisión y respuestas más livianas.
         extensions.st_asgeojson(u.geom, 6)::jsonb as geojson
  from public.ubicaciones u
  where u.archivada_en is null
  order by u.tipo desc, u.nombre
$$;

comment on function public.lugares_mapa() is
  'Lugares no archivados con su geometría en GeoJSON, para dibujarlos en el mapa. Zonas primero y luego puntos.';

-- Corre con los permisos de quien la llama (RLS aplica) y solo la usa quien tiene sesión.
revoke execute on function public.lugares_mapa() from public, anon;
grant execute on function public.lugares_mapa() to authenticated;
