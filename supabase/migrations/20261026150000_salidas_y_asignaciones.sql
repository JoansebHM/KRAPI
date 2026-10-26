-- =============================================================================
-- Salidas y asignaciones de zonas a cuentas (decisión 0025, #106)
--
-- Antes de una salida de campo, un admin dibuja zonas de asignación (propias de
-- esa salida: cambian entre temporadas) y les asigna cuentas. Cada persona
-- reporta a qué hora terminó y qué porcentaje alcanzó a cubrir.
-- =============================================================================

-- 1. Salidas.
create table public.salidas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha date not null,
  hora_inicio time not null,
  -- Si tiene fecha, la salida se canceló. Se puede reactivar.
  cancelada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null,
  actualizado_por uuid references auth.users (id) on delete set null,

  constraint salidas_nombre_valido check (length(trim(nombre)) between 1 and 120)
);

comment on table public.salidas is 'Salidas de campo: un día y una hora de inicio, con sus zonas asignadas.';

create index salidas_fecha_idx on public.salidas (fecha desc);


-- 2. Zonas de asignación de cada salida. La forma se lee en GeoJSON (forma), porque
--    PostgREST devuelve geometry en binario.
create table public.asignaciones (
  id uuid primary key default gen_random_uuid(),
  salida_id uuid not null references public.salidas (id) on delete cascade,
  nombre text not null,
  geom extensions.geometry(Polygon, 4326) not null,
  forma jsonb generated always as (extensions.st_asgeojson(geom, 6)::jsonb) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null,
  actualizado_por uuid references auth.users (id) on delete set null,

  constraint asignaciones_nombre_valido check (length(trim(nombre)) between 1 and 120),
  constraint asignaciones_geom_valida check (extensions.st_isvalid(geom)),
  constraint asignaciones_dentro_de_manila check (extensions.st_coveredby(geom, public.limite_manila())),
  constraint asignaciones_area_minima check (extensions.st_area(geom::extensions.geography) >= 20)
);

comment on table public.asignaciones is 'Zonas que se asignan en una salida. No son las zonas del mapa (ubicaciones).';
comment on column public.asignaciones.forma is 'La forma en GeoJSON, calculada de geom.';

create index asignaciones_salida_idx on public.asignaciones (salida_id);


-- 3. Quiénes cubren cada zona, y su reporte: a qué hora terminó y qué porcentaje cubrió.
create table public.asignacion_participantes (
  asignacion_id uuid not null references public.asignaciones (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  hora_fin time,
  porcentaje smallint,
  reportado_en timestamptz,
  primary key (asignacion_id, usuario_id),

  constraint asignacion_participantes_porcentaje_valido check (porcentaje is null or porcentaje in (0, 25, 50, 75, 100)),
  -- El reporte va completo: hora de fin y porcentaje, o nada.
  constraint asignacion_participantes_reporte_completo check ((hora_fin is null) = (porcentaje is null))
);

comment on table public.asignacion_participantes is
  'Cuentas asignadas a cada zona de una salida, con su reporte (hora de fin y porcentaje cubierto).';

create index asignacion_participantes_usuario_idx on public.asignacion_participantes (usuario_id);


-- 4. Autoría y bitácora.
create trigger salidas_set_updated_at before update on public.salidas
  for each row execute function public.set_updated_at();
create trigger salidas_autoria before insert or update on public.salidas
  for each row execute function public.poner_autoria();
create trigger salidas_bitacora after insert or update or delete on public.salidas
  for each row execute function public.registrar_bitacora('cancelada_en');

create trigger asignaciones_set_updated_at before update on public.asignaciones
  for each row execute function public.set_updated_at();
create trigger asignaciones_autoria before insert or update on public.asignaciones
  for each row execute function public.poner_autoria();
create trigger asignaciones_bitacora after insert or update or delete on public.asignaciones
  for each row execute function public.registrar_bitacora();

create trigger asignacion_participantes_bitacora after insert or update or delete on public.asignacion_participantes
  for each row execute function public.registrar_bitacora();

-- La bitácora registra cada fila con su id o, en las tablas de unión, con el id de lo
-- que unen. asignacion_participantes no tiene id: se registra con el de la asignación.
create or replace function public.registrar_bitacora()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Columnas que no se registran como cambios: las mantiene la base de datos.
  ignoradas constant text[] := array[
    'created_at', 'updated_at', 'creado_por', 'actualizado_por', 'archivada_por', 'archivado_por', 'forma'
  ];
  columna_archivo text := tg_argv[0];
  fila jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  anterior jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  accion public.accion_bitacora;
  cambios jsonb;
begin
  if tg_op = 'INSERT' then
    accion := 'crear';
    cambios := fila - ignoradas;
  elsif tg_op = 'DELETE' then
    accion := 'borrar';
  else
    select jsonb_object_agg(campo, jsonb_build_object('antes', anterior -> campo, 'despues', fila -> campo))
      into cambios
      from jsonb_object_keys(fila) as campo
     where campo <> all (ignoradas)
       and (anterior -> campo) is distinct from (fila -> campo);

    -- Nada que registrar (por ejemplo, solo cambió quién editó al borrar una cuenta).
    if cambios is null then
      return null;
    end if;

    if columna_archivo is not null and cambios ? columna_archivo then
      accion := case when fila ->> columna_archivo is null then 'recuperar' else 'archivar' end;
    else
      accion := 'editar';
    end if;
  end if;

  insert into public.bitacora (usuario_id, tabla, registro_id, accion, cambios, registro_borrado)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(fila ->> 'id', fila ->> 'estudio_id', fila ->> 'asignacion_id')::uuid,
    accion,
    cambios,
    case when tg_op = 'DELETE' then fila end
  );
  return null;
end;
$$;


-- 5. Permisos: todos los activos ven las salidas; solo los admins las arman. Cada
--    persona reporta lo suyo (hora de fin y porcentaje); un admin puede corregirlo.
revoke all on table public.salidas, public.asignaciones, public.asignacion_participantes from anon, authenticated;
grant select, insert, update, delete on table public.salidas, public.asignaciones to authenticated;
grant select, insert, delete on table public.asignacion_participantes to authenticated;
grant update (hora_fin, porcentaje, reportado_en) on table public.asignacion_participantes to authenticated;

alter table public.salidas enable row level security;
alter table public.asignaciones enable row level security;
alter table public.asignacion_participantes enable row level security;

create policy "Activos: leer" on public.salidas
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Admins: crear, editar y borrar" on public.salidas
  for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy "Activos: leer" on public.asignaciones
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Admins: crear, editar y borrar" on public.asignaciones
  for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy "Activos: leer" on public.asignacion_participantes
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Admins: asignar" on public.asignacion_participantes
  for insert to authenticated with check ((select public.es_admin()));
create policy "Admins: quitar" on public.asignacion_participantes
  for delete to authenticated using ((select public.es_admin()));
create policy "Cada quien reporta lo suyo; un admin corrige" on public.asignacion_participantes
  for update to authenticated
  using ((select public.es_admin()) or (usuario_id = (select auth.uid()) and (select public.es_miembro_activo())))
  with check ((select public.es_admin()) or (usuario_id = (select auth.uid()) and (select public.es_miembro_activo())));
