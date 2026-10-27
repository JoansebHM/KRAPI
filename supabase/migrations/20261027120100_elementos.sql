-- =============================================================================
-- Elementos: puntos sin estudios que reciben evidencias (decisión 0028, #127)
--
-- Un elemento es algo del barrio que vale la pena ubicar y documentar, pero que no
-- se estudia: una caneca, un poste, un árbol, una alcantarilla, un parqueadero…
-- Tiene nombre, categoría y descripción, y sus evidencias cuelgan de él directamente.
-- =============================================================================

-- 1. Categorías: a qué se aplican. Las que ya existen son de lugares (locales).
create type public.uso_categoria as enum ('lugares', 'elementos', 'ambos');

alter table public.categorias
  add column aplica_a public.uso_categoria not null default 'lugares';

comment on column public.categorias.aplica_a is
  'A qué se aplica: lugares (locales), elementos (canecas, postes…) o ambos. Solo filtra el selector de la app.';


-- 2. Ubicaciones: un elemento es un POINT, sin dirección ni contacto.
alter table public.ubicaciones
  drop constraint ubicaciones_geom_segun_tipo,
  add constraint ubicaciones_geom_segun_tipo check (
    (tipo in ('punto', 'elemento') and extensions.geometrytype(geom) = 'POINT')
    or (tipo = 'zona' and extensions.geometrytype(geom) = 'POLYGON')
  ),
  add constraint ubicaciones_elemento_sin_datos_de_local check (
    tipo <> 'elemento'
    or (direccion is null and complemento is null and contacto_nombre is null and contacto_telefono is null)
  );

-- El tipo de un lugar no cambia: un punto con estudios no puede volverse un elemento.
create function public.tipo_de_ubicacion_fijo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo is distinct from old.tipo then
    raise exception 'El tipo de un lugar no se puede cambiar';
  end if;
  return new;
end;
$$;

create trigger ubicaciones_tipo_fijo
  before update of tipo on public.ubicaciones
  for each row execute function public.tipo_de_ubicacion_fijo();


-- 3. Un elemento no tiene estudios.
create function public.validar_ubicacion_de_estudio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.ubicaciones where id = new.ubicacion_id and tipo = 'elemento') then
    raise exception 'Un elemento no tiene estudios: sus evidencias se agregan directamente';
  end if;
  return new;
end;
$$;

create trigger estudios_validar_ubicacion
  before insert or update of ubicacion_id on public.estudios
  for each row execute function public.validar_ubicacion_de_estudio();


-- 4. Evidencias: de un estudio o de un elemento (exactamente uno de los dos).
alter table public.evidencias
  alter column estudio_id drop not null,
  add column ubicacion_id uuid references public.ubicaciones (id) on delete cascade,
  add constraint evidencias_de_estudio_o_elemento check (num_nonnulls(estudio_id, ubicacion_id) = 1);

comment on column public.evidencias.ubicacion_id is
  'Solo para elementos: la evidencia cuelga del elemento y no de un estudio. Exactamente uno de estudio_id o ubicacion_id.';
comment on table public.evidencias is
  'Evidencias de un estudio o de un elemento. Al borrar su dueño se borran sus filas; los archivos del bucket los borra la app.';

create index evidencias_ubicacion_idx on public.evidencias (ubicacion_id) where ubicacion_id is not null;

create function public.validar_elemento_de_evidencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ubicacion_id is not null and not exists (
    select 1 from public.ubicaciones where id = new.ubicacion_id and tipo = 'elemento'
  ) then
    raise exception 'evidencias.ubicacion_id debe apuntar a un elemento (ubicaciones.tipo = ''elemento'')';
  end if;
  return new;
end;
$$;

create trigger evidencias_validar_elemento
  before insert or update of ubicacion_id on public.evidencias
  for each row execute function public.validar_elemento_de_evidencia();


-- 5. Borrar de verdad: un lugar sin estudios y, si es un elemento, sin evidencias.
--    Así nunca se pierden archivos sin que alguien los borre uno por uno.
drop policy "Autor o admin: borrar si no tiene estudios" on public.ubicaciones;

create policy "Autor o admin: borrar si no tiene estudios ni evidencias" on public.ubicaciones
  for delete to authenticated
  using (
    ((select public.es_admin()) or (creado_por = (select auth.uid()) and (select public.es_miembro_activo())))
    and not exists (select 1 from public.estudios e where e.ubicacion_id = ubicaciones.id)
    and not exists (select 1 from public.evidencias ev where ev.ubicacion_id = ubicaciones.id)
  );


-- 6. lugares_mapa(): zonas primero (debajo), luego puntos y elementos.
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
  select u.id, u.tipo, u.nombre, u.estado, u.categoria_id, u.tipo_zona_id,
         -- 6 decimales ≈ 10 cm: suficiente precisión y respuestas más livianas.
         extensions.st_asgeojson(u.geom, 6)::jsonb as geojson
  from public.ubicaciones u
  where u.archivada_en is null
  order by u.tipo = 'zona' desc, u.nombre
$$;

comment on function public.lugares_mapa() is
  'Lugares no archivados con su geometría en GeoJSON, para dibujarlos en el mapa. Zonas primero y luego puntos y elementos.';


-- 7. Elementos de la misma categoría muy cerca (para avisar de un posible duplicado al crear).
--    Los elementos suelen estar juntos (dos canecas en una esquina), así que el radio es pequeño.
create function public.elementos_cercanos(
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
  select u.id, u.nombre,
         extensions.st_distance(u.geom::extensions.geography, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) as distancia_m
  from public.ubicaciones u
  where u.tipo = 'elemento'
    and u.archivada_en is null
    and u.categoria_id is not distinct from elementos_cercanos.categoria_id
    and extensions.st_dwithin(u.geom::extensions.geography, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography, metros)
  order by distancia_m
  limit 5
$$;

comment on function public.elementos_cercanos(double precision, double precision, uuid, double precision) is
  'Hasta 5 elementos no archivados de la misma categoría a menos de N metros (por defecto 3), del más cercano al más lejano.';

revoke execute on function public.elementos_cercanos(double precision, double precision, uuid, double precision) from public, anon;
grant execute on function public.elementos_cercanos(double precision, double precision, uuid, double precision) to authenticated;
