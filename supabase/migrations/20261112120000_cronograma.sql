-- =============================================================================
-- Cronograma: el calendario partido en fragmentos con su checklist (decisión 0039)
--
-- El equipo parte el calendario en fragmentos de fechas libres (por ejemplo, del 3 al 12 de
-- noviembre) y define en cada uno una lista de cosas por hacer. Cada tarea puede tener un
-- responsable (opcional) y se marca como hecha. Todas las cuentas activas ven y editan todo.
-- =============================================================================

-- 1. Fragmentos: un rango de fechas con un título opcional. Pueden solaparse.
create table public.cronograma_fragmentos (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  fecha_inicio date not null,
  fecha_fin date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null,
  actualizado_por uuid references auth.users (id) on delete set null,

  constraint cronograma_fragmentos_titulo_valido check (titulo is null or length(trim(titulo)) between 1 and 120),
  constraint cronograma_fragmentos_fechas_validas check (fecha_fin >= fecha_inicio)
);

comment on table public.cronograma_fragmentos is 'Fragmentos del calendario (rangos de fechas libres, que pueden solaparse), cada uno con su checklist.';

create index cronograma_fragmentos_inicio_idx on public.cronograma_fragmentos (fecha_inicio, fecha_fin);


-- 2. Tareas del checklist de cada fragmento.
create table public.cronograma_tareas (
  id uuid primary key default gen_random_uuid(),
  fragmento_id uuid not null references public.cronograma_fragmentos (id) on delete cascade,
  texto text not null,
  -- Quién se encarga (opcional). Si la cuenta se borra, la tarea queda sin responsable.
  responsable_id uuid references public.perfiles (id) on delete set null,
  -- Si tiene fecha, la tarea está hecha; hecha_por es quien la marcó.
  hecha_en timestamptz,
  hecha_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null,
  actualizado_por uuid references auth.users (id) on delete set null,

  constraint cronograma_tareas_texto_valido check (length(trim(texto)) between 1 and 300)
);

comment on table public.cronograma_tareas is 'Checklist de un fragmento del cronograma. Al borrar el fragmento se borran sus tareas.';
comment on column public.cronograma_tareas.hecha_en is 'Cuándo se marcó como hecha. NULL = pendiente.';

create index cronograma_tareas_fragmento_idx on public.cronograma_tareas (fragmento_id, created_at);
create index cronograma_tareas_responsable_idx on public.cronograma_tareas (responsable_id);


-- 3. Autoría y bitácora.
create trigger cronograma_fragmentos_set_updated_at before update on public.cronograma_fragmentos
  for each row execute function public.set_updated_at();
create trigger cronograma_fragmentos_autoria before insert or update on public.cronograma_fragmentos
  for each row execute function public.poner_autoria();
create trigger cronograma_fragmentos_bitacora after insert or update or delete on public.cronograma_fragmentos
  for each row execute function public.registrar_bitacora();

create trigger cronograma_tareas_set_updated_at before update on public.cronograma_tareas
  for each row execute function public.set_updated_at();
create trigger cronograma_tareas_autoria before insert or update on public.cronograma_tareas
  for each row execute function public.poner_autoria();
create trigger cronograma_tareas_bitacora after insert or update or delete on public.cronograma_tareas
  for each row execute function public.registrar_bitacora();

-- Quien marca una tarea como hecha queda registrado, y no puede falsear a otra cuenta.
create or replace function public.poner_quien_hizo_tarea()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.hecha_en is null then
    new.hecha_por := null;
  elsif tg_op = 'INSERT' or old.hecha_en is null then
    new.hecha_por := auth.uid();
  else
    -- Ya estaba hecha: se conserva quién y cuándo.
    new.hecha_por := old.hecha_por;
    new.hecha_en := old.hecha_en;
  end if;
  return new;
end;
$$;

comment on function public.poner_quien_hizo_tarea() is
  'Trigger: pone hecha_por con auth.uid() al marcar una tarea como hecha y lo limpia al desmarcarla.';

revoke execute on function public.poner_quien_hizo_tarea() from public, anon, authenticated;

create trigger cronograma_tareas_quien_hizo before insert or update on public.cronograma_tareas
  for each row execute function public.poner_quien_hizo_tarea();


-- 4. Permisos: todas las cuentas activas ven, crean, editan y borran.
revoke all on table public.cronograma_fragmentos, public.cronograma_tareas from anon, authenticated;
grant select, insert, update, delete on table public.cronograma_fragmentos, public.cronograma_tareas to authenticated;

alter table public.cronograma_fragmentos enable row level security;
alter table public.cronograma_tareas enable row level security;

create policy "Activos: todo" on public.cronograma_fragmentos
  for all to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));
create policy "Activos: todo" on public.cronograma_tareas
  for all to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));
