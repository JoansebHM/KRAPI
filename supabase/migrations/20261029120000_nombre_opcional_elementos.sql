-- =============================================================================
-- El nombre de un elemento es opcional
--
-- Una caneca más no necesita un nombre propio: se muestra con el de su categoría.
-- Los puntos y las zonas siguen necesitándolo.
-- =============================================================================

alter table public.ubicaciones
  alter column nombre drop not null,
  drop constraint ubicaciones_nombre_no_vacio,
  add constraint ubicaciones_nombre_segun_tipo check (
    case
      when tipo = 'elemento' then nombre is null or length(trim(nombre)) > 0
      else nombre is not null and length(trim(nombre)) > 0
    end
  );

comment on column public.ubicaciones.nombre is
  'Obligatorio en puntos y zonas. Opcional en elementos: sin nombre se muestra el de su categoría.';


-- lugares_mapa() y elementos_cercanos() devuelven siempre un nombre para mostrar:
-- el propio o, si un elemento no tiene, el de su categoría ('Elemento' si tampoco tiene categoría).
create or replace function public.lugares_mapa()
returns table (
  id uuid,
  tipo public.tipo_ubicacion,
  nombre text,
  estado public.estado_ubicacion,
  categoria_id uuid,
  tipo_zona_id uuid,
  geojson jsonb
)
language sql
stable
set search_path = ''
as $$
  select u.id, u.tipo, coalesce(u.nombre, c.nombre, 'Elemento'), u.estado, u.categoria_id, u.tipo_zona_id,
         -- 6 decimales ≈ 10 cm: suficiente precisión y respuestas más livianas.
         extensions.st_asgeojson(u.geom, 6)::jsonb as geojson
  from public.ubicaciones u
  left join public.categorias c on c.id = u.categoria_id
  where u.archivada_en is null
  order by u.tipo = 'zona' desc, coalesce(u.nombre, c.nombre, 'Elemento')
$$;

create or replace function public.elementos_cercanos(
  lng double precision,
  lat double precision,
  categoria_id uuid,
  metros double precision default 3
)
returns table (id uuid, nombre text, distancia_m double precision)
language sql
stable
set search_path = ''
as $$
  select u.id, coalesce(u.nombre, c.nombre, 'Elemento'),
         extensions.st_distance(u.geom::extensions.geography, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) as distancia_m
  from public.ubicaciones u
  left join public.categorias c on c.id = u.categoria_id
  where u.tipo = 'elemento'
    and u.archivada_en is null
    and u.categoria_id is not distinct from elementos_cercanos.categoria_id
    and extensions.st_dwithin(u.geom::extensions.geography, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography, metros)
  order by distancia_m
  limit 5
$$;
