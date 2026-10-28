-- =============================================================================
-- Bocetos: dibujos sobre el mapa, guardados como pantallazo (decisión 0029, #129)
--
-- Para explicar cosas en las reuniones (la ruta de un bus, por dónde se mueve la gente) se
-- dibuja a mano alzada sobre el mapa y se guarda el resultado. Lo que se ve es la imagen
-- (imagen_path, y una miniatura para las listas), pero también se guardan los trazos con
-- coordenadas reales, para poder editarlos más adelante sin perder los de hoy.
-- Un boceto no se edita: si algo cambia, se hace otro.
--
-- Las imágenes van en el bucket privado `evidencias`, en bocetos/<id>/. Sus políticas ya
-- cubren cualquier ruta del bucket (leer, subir: cuenta activa; borrar: quien lo subió o un admin).
-- =============================================================================

create table public.bocetos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  -- FeatureCollection de LineString, cada una con sus propiedades `color` y `grosor` (en px).
  trazos jsonb not null default '{"type": "FeatureCollection", "features": []}',
  imagen_path text not null unique,
  miniatura_path text not null unique,
  -- Medidas de la imagen, en píxeles.
  ancho integer not null,
  alto integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null,
  actualizado_por uuid references auth.users (id) on delete set null,

  constraint bocetos_titulo_valido check (length(trim(titulo)) between 1 and 120),
  constraint bocetos_descripcion_corta check (descripcion is null or length(descripcion) <= 1000),
  constraint bocetos_trazos_validos check (
    jsonb_typeof(trazos) = 'object'
    and trazos ->> 'type' = 'FeatureCollection'
    and jsonb_typeof(trazos -> 'features') = 'array'
  ),
  constraint bocetos_trazos_livianos check (octet_length(trazos::text) <= 1000000),
  constraint bocetos_medidas_validas check (ancho > 0 and alto > 0)
);

comment on table public.bocetos is
  'Dibujos sobre el mapa. Se guardan como imagen y con sus trazos. No se editan. Al borrar la fila, la app borra sus archivos del bucket.';

create index bocetos_creado_idx on public.bocetos (created_at desc);
create index bocetos_creado_por_idx on public.bocetos (creado_por);

create trigger bocetos_set_updated_at
  before update on public.bocetos
  for each row execute function public.set_updated_at();
create trigger bocetos_autoria
  before insert or update on public.bocetos
  for each row execute function public.poner_autoria();
create trigger bocetos_bitacora
  after insert or update or delete on public.bocetos
  for each row execute function public.registrar_bitacora();

-- Sin permiso de editar (update): un boceto se crea, se consulta y se borra.
revoke all on table public.bocetos from anon, authenticated;
grant select, insert, delete on table public.bocetos to authenticated;
alter table public.bocetos enable row level security;

create policy "Activos: leer" on public.bocetos
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Activos: crear" on public.bocetos
  for insert to authenticated with check ((select public.es_miembro_activo()));
create policy "Autor o admin: borrar" on public.bocetos
  for delete to authenticated
  using ((select public.es_admin()) or (creado_por = (select auth.uid()) and (select public.es_miembro_activo())));
