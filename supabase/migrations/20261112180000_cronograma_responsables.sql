-- =============================================================================
-- Cronograma: varios responsables por tarea (decisión 0039)
--
-- Una tarea puede tener varias cuentas responsables, igual que un estudio tiene varios
-- participantes. Reemplaza a `cronograma_tareas.responsable_id` (una sola cuenta): los
-- responsables que ya estaban puestos pasan a la tabla nueva.
-- =============================================================================

-- 1. La tabla de unión: quiénes se encargan de cada tarea.
create table public.cronograma_tarea_responsables (
  tarea_id uuid not null references public.cronograma_tareas (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  primary key (tarea_id, usuario_id)
);

comment on table public.cronograma_tarea_responsables is
  'Cuentas responsables de cada tarea del cronograma (opcional: una tarea puede no tener ninguna).';

create index cronograma_tarea_responsables_usuario_idx on public.cronograma_tarea_responsables (usuario_id);

-- 2. Pasar los responsables que ya había y quitar la columna vieja.
insert into public.cronograma_tarea_responsables (tarea_id, usuario_id)
select id, responsable_id from public.cronograma_tareas where responsable_id is not null;

drop index public.cronograma_tareas_responsable_idx;
alter table public.cronograma_tareas drop column responsable_id;

-- 3. La bitácora registra esta tabla con el id de la tarea (no tiene id propio).
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
    coalesce(fila ->> 'id', fila ->> 'estudio_id', fila ->> 'asignacion_id', fila ->> 'tarea_id')::uuid,
    accion,
    cambios,
    case when tg_op = 'DELETE' then fila end
  );
  return null;
end;
$$;

create trigger cronograma_tarea_responsables_bitacora after insert or update or delete on public.cronograma_tarea_responsables
  for each row execute function public.registrar_bitacora();

-- 4. Permisos: todas las cuentas activas, como el resto del cronograma.
revoke all on table public.cronograma_tarea_responsables from anon, authenticated;
grant select, insert, update, delete on table public.cronograma_tarea_responsables to authenticated;
alter table public.cronograma_tarea_responsables enable row level security;

create policy "Activos: todo" on public.cronograma_tarea_responsables
  for all to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));
