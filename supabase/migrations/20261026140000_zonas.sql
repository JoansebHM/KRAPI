-- =============================================================================
-- Zonas: su tipo, comentarios y locales adentro (decisión 0024, #15)
--
-- Una zona dice de qué es un área (su tipo), junta comentarios del equipo y
-- guarda el histórico de recorridos (estudios de la zona, como los de un punto).
-- =============================================================================

-- 1. Tipos de zona: lista administrable, con un color para pintarlas en el mapa.
create table public.tipos_zona (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  color text not null default '#9E7AE1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null,
  actualizado_por uuid references auth.users (id) on delete set null,

  constraint tipos_zona_nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint tipos_zona_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

comment on table public.tipos_zona is 'De qué es una zona: comercial, residencial, etc. Con un color para el mapa.';

create unique index tipos_zona_nombre_unico on public.tipos_zona (lower(trim(nombre)));

create trigger tipos_zona_set_updated_at
  before update on public.tipos_zona
  for each row execute function public.set_updated_at();
create trigger tipos_zona_autoria
  before insert or update on public.tipos_zona
  for each row execute function public.poner_autoria();
create trigger tipos_zona_bitacora
  after insert or update or delete on public.tipos_zona
  for each row execute function public.registrar_bitacora();

-- Algunos tipos para empezar; el equipo los cambia desde la app.
insert into public.tipos_zona (nombre, color) values
  ('Comercial', '#0478FB'),
  ('Residencial', '#16A34A'),
  ('Mixta', '#9E7AE1'),
  ('Parque o zona verde', '#65A30D'),
  ('Institucional', '#EA580C');

revoke all on table public.tipos_zona from anon, authenticated;
grant select, insert, update, delete on table public.tipos_zona to authenticated;
alter table public.tipos_zona enable row level security;

create policy "Activos: leer" on public.tipos_zona
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Activos: crear" on public.tipos_zona
  for insert to authenticated with check ((select public.es_miembro_activo()));
create policy "Activos: editar" on public.tipos_zona
  for update to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));
create policy "Admins: borrar" on public.tipos_zona
  for delete to authenticated using ((select public.es_admin()));


-- 2. Cada zona puede tener un tipo. Una zona tiene al menos 20 m²: más chica es un error al dibujar.
alter table public.ubicaciones
  add column tipo_zona_id uuid references public.tipos_zona (id) on delete set null,
  add constraint ubicaciones_tipo_zona_solo_zonas check (tipo_zona_id is null or tipo = 'zona'),
  add constraint ubicaciones_zona_area_minima check (
    tipo <> 'zona' or extensions.st_area(geom::extensions.geography) >= 20
  );

comment on column public.ubicaciones.tipo_zona_id is 'Solo zonas: de qué es la zona. Si el tipo se borra, queda en NULL.';

create index ubicaciones_tipo_zona_idx on public.ubicaciones (tipo_zona_id);


-- 3. Comentarios de una zona: quién lo escribió (creado_por) y cuándo.
create table public.comentarios_zona (
  id uuid primary key default gen_random_uuid(),
  ubicacion_id uuid not null references public.ubicaciones (id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null,
  actualizado_por uuid references auth.users (id) on delete set null,

  constraint comentarios_zona_texto_valido check (length(trim(texto)) between 1 and 2000)
);

comment on table public.comentarios_zona is 'Comentarios del equipo sobre una zona. Los borra quien los escribió o un admin.';

create index comentarios_zona_ubicacion_idx on public.comentarios_zona (ubicacion_id, created_at desc);

create trigger comentarios_zona_set_updated_at
  before update on public.comentarios_zona
  for each row execute function public.set_updated_at();
create trigger comentarios_zona_autoria
  before insert or update on public.comentarios_zona
  for each row execute function public.poner_autoria();
create trigger comentarios_zona_bitacora
  after insert or update or delete on public.comentarios_zona
  for each row execute function public.registrar_bitacora();

revoke all on table public.comentarios_zona from anon, authenticated;
grant select, insert, update, delete on table public.comentarios_zona to authenticated;
alter table public.comentarios_zona enable row level security;

create policy "Activos: leer" on public.comentarios_zona
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Activos: comentar" on public.comentarios_zona
  for insert to authenticated with check ((select public.es_miembro_activo()));
create policy "Autor o admin: editar" on public.comentarios_zona
  for update to authenticated
  using ((select public.es_admin()) or (creado_por = (select auth.uid()) and (select public.es_miembro_activo())))
  with check ((select public.es_miembro_activo()));
create policy "Autor o admin: borrar" on public.comentarios_zona
  for delete to authenticated
  using ((select public.es_admin()) or (creado_por = (select auth.uid()) and (select public.es_miembro_activo())));


-- 4. lugares_mapa() también devuelve el tipo de cada zona, para pintarla con su color.
--    Cambia lo que devuelve, así que se borra y se vuelve a crear.
drop function public.lugares_mapa();

create function public.lugares_mapa()
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
  order by u.tipo desc, u.nombre
$$;

comment on function public.lugares_mapa() is
  'Lugares no archivados con su geometría en GeoJSON, para dibujarlos en el mapa. Zonas primero y luego puntos.';

revoke execute on function public.lugares_mapa() from public, anon;
grant execute on function public.lugares_mapa() to authenticated;


-- 5. Locales dentro de una zona, con la fecha de su último estudio (para la ficha de la zona).
create function public.locales_en_zona(zona_id uuid)
returns table (
  id uuid,
  nombre text,
  categoria_id uuid,
  estado public.estado_ubicacion,
  ultimo_estudio date
)
language sql
stable
set search_path = ''
as $$
  select punto.id, punto.nombre, punto.categoria_id, punto.estado,
         (select max(e.fecha) from public.estudios e where e.ubicacion_id = punto.id and e.archivado_en is null)
  from public.ubicaciones zona
  join public.ubicaciones punto
    on punto.tipo = 'punto'
   and punto.archivada_en is null
   and extensions.st_coveredby(punto.geom, zona.geom)
  where zona.id = locales_en_zona.zona_id
    and zona.tipo = 'zona'
  order by punto.nombre
$$;

comment on function public.locales_en_zona(uuid) is
  'Puntos no archivados dentro de la zona (o sobre su borde), con la fecha de su último estudio visible.';

revoke execute on function public.locales_en_zona(uuid) from public, anon;
grant execute on function public.locales_en_zona(uuid) to authenticated;
