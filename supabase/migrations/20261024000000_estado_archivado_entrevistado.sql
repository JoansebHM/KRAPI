-- =============================================================================
-- Estado de los lugares, archivado, entrevistado y consultas espaciales
--
-- Modelo: los lugares (puntos y zonas) se crean una vez y acumulan estudios (visitas).
-- Nada que tenga histórico se borra: se archiva.
-- =============================================================================

-- 1. Estado del lugar: un local puede cerrar sin perder su histórico.
create type public.estado_ubicacion as enum ('activa', 'cerrada');

alter table public.ubicaciones
  add column estado public.estado_ubicacion not null default 'activa',
  -- Si tiene fecha, el lugar está archivado: no aparece en el mapa pero se puede recuperar.
  add column archivada_en timestamptz;

comment on column public.ubicaciones.estado is 'activa o cerrada (por ejemplo, un local que cerró).';
comment on column public.ubicaciones.archivada_en is 'Fecha de archivado. NULL = visible. Reemplaza al borrado para no perder el histórico.';

-- 2. Estudios: a quién se entrevistó y archivado.
alter table public.estudios
  add column entrevistado text,
  add column archivado_en timestamptz,
  add constraint estudios_entrevistado_corto check (entrevistado is null or length(entrevistado) <= 120);

comment on column public.estudios.entrevistado is 'A quién se entrevistó, en texto libre (por ejemplo "Tendero", "Administradora").';
comment on column public.estudios.archivado_en is 'Fecha de archivado. NULL = visible.';

-- Índices para las consultas habituales, que solo miran lo no archivado.
create index ubicaciones_visibles_idx on public.ubicaciones (tipo) where archivada_en is null;
create index estudios_visibles_idx on public.estudios (ubicacion_id, fecha desc) where archivado_en is null;

-- 3. Puntos que caen dentro de una zona (para la ficha de la zona).
create or replace function public.ubicaciones_en_zona(zona_id uuid)
returns setof public.ubicaciones
language sql
stable
set search_path = ''
as $$
  select punto.*
  from public.ubicaciones zona
  join public.ubicaciones punto
    on punto.tipo = 'punto'
   and punto.archivada_en is null
   and extensions.st_coveredby(punto.geom, zona.geom)
  where zona.id = zona_id
    and zona.tipo = 'zona'
  order by punto.nombre
$$;

comment on function public.ubicaciones_en_zona(uuid) is 'Puntos no archivados que están dentro de la zona indicada.';

-- 4. Puntos cercanos a una coordenada (para avisar de posibles duplicados al crear).
create or replace function public.ubicaciones_cercanas(lng double precision, lat double precision, metros double precision default 15)
returns table (id uuid, nombre text, estado public.estado_ubicacion, distancia_m double precision)
language sql
stable
set search_path = ''
as $$
  select u.id, u.nombre, u.estado,
         extensions.st_distance(u.geom::extensions.geography, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) as distancia_m
  from public.ubicaciones u
  where u.tipo = 'punto'
    and u.archivada_en is null
    and extensions.st_dwithin(u.geom::extensions.geography, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography, metros)
  order by distancia_m
  limit 5
$$;

comment on function public.ubicaciones_cercanas(double precision, double precision, double precision) is
  'Hasta 5 puntos no archivados a menos de N metros (por defecto 15) de la coordenada, del más cercano al más lejano.';

-- Las funciones corren con los permisos de quien las llama (RLS aplica) y solo las usa quien tiene sesión.
revoke execute on function public.ubicaciones_en_zona(uuid) from public, anon;
revoke execute on function public.ubicaciones_cercanas(double precision, double precision, double precision) from public, anon;
grant execute on function public.ubicaciones_en_zona(uuid) to authenticated;
grant execute on function public.ubicaciones_cercanas(double precision, double precision, double precision) to authenticated;
