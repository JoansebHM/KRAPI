-- =============================================================================
-- Bitácora: cada acción sobre los datos, con quién la hizo (decisión 0021)
--
-- Las columnas de autoría solo dicen quién creó y quién editó por última vez.
-- La bitácora guarda todo lo que pasó, incluida una copia de lo que se borró.
-- La llenan triggers; nadie puede editarla ni borrarla, y solo los admins la leen.
-- =============================================================================

create type public.accion_bitacora as enum ('crear', 'editar', 'archivar', 'recuperar', 'borrar');

create table public.bitacora (
  id bigint generated always as identity primary key,
  ocurrio_en timestamptz not null default now(),
  -- Sin clave foránea: si la cuenta se borra, la bitácora conserva quién fue.
  usuario_id uuid,
  tabla text not null,
  registro_id uuid not null,
  accion public.accion_bitacora not null,
  -- Al crear: los campos del registro. Al editar, archivar o recuperar: los que
  -- cambiaron, como {"campo": {"antes": ..., "despues": ...}}.
  cambios jsonb,
  -- Al borrar: una copia completa del registro.
  registro_borrado jsonb
);

comment on table public.bitacora is 'Cada acción sobre los datos y quién la hizo. Solo se agregan filas; solo los admins la leen.';
comment on column public.bitacora.usuario_id is 'Cuenta que hizo la acción (auth.uid()). NULL = sistema o script de administración.';
comment on column public.bitacora.registro_id is 'id del registro. En estudio_responsables, el id del estudio.';

create index bitacora_registro_idx on public.bitacora (registro_id, ocurrio_en desc);
create index bitacora_ocurrio_en_idx on public.bitacora (ocurrio_en desc);


-- Trigger que registra las acciones. Argumento opcional: la columna de fecha de
-- archivado, para distinguir archivar y recuperar de editar.
create or replace function public.registrar_bitacora()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Columnas que no se registran como cambios: las mantiene la base de datos.
  ignoradas constant text[] := array[
    'created_at', 'updated_at', 'creado_por', 'actualizado_por', 'archivada_por', 'archivado_por'
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
    coalesce(fila ->> 'id', fila ->> 'estudio_id')::uuid,
    accion,
    cambios,
    case when tg_op = 'DELETE' then fila end
  );
  return null;
end;
$$;

comment on function public.registrar_bitacora() is
  'Trigger: agrega a la bitácora la acción sobre la fila. Con argumento (columna de archivado), distingue archivar y recuperar.';

create trigger categorias_bitacora
  after insert or update or delete on public.categorias
  for each row execute function public.registrar_bitacora();

create trigger responsables_bitacora
  after insert or update or delete on public.responsables
  for each row execute function public.registrar_bitacora();

create trigger ubicaciones_bitacora
  after insert or update or delete on public.ubicaciones
  for each row execute function public.registrar_bitacora('archivada_en');

create trigger estudios_bitacora
  after insert or update or delete on public.estudios
  for each row execute function public.registrar_bitacora('archivado_en');

create trigger estudio_responsables_bitacora
  after insert or update or delete on public.estudio_responsables
  for each row execute function public.registrar_bitacora();

create trigger evidencias_bitacora
  after insert or update or delete on public.evidencias
  for each row execute function public.registrar_bitacora();

-- De los perfiles solo interesan los cambios de rol y de estado.
create trigger perfiles_bitacora
  after update of rol, estado on public.perfiles
  for each row
  when (old.rol is distinct from new.rol or old.estado is distinct from new.estado)
  execute function public.registrar_bitacora();


-- Nadie edita ni borra la bitácora, ni siquiera con la clave secreta.
create or replace function public.impedir_cambios_bitacora()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'La bitácora no se puede editar ni borrar.' using errcode = '42501';
end;
$$;

create trigger bitacora_solo_agregar
  before update or delete on public.bitacora
  for each row execute function public.impedir_cambios_bitacora();

create trigger bitacora_sin_truncar
  before truncate on public.bitacora
  for each statement execute function public.impedir_cambios_bitacora();


-- Permisos: los admins la leen; nadie escribe directamente (lo hacen los triggers).
revoke all on table public.bitacora from anon, authenticated;
grant select on table public.bitacora to authenticated;

revoke execute on function public.registrar_bitacora(), public.impedir_cambios_bitacora()
  from public, anon, authenticated;

alter table public.bitacora enable row level security;

create policy "Admins: leer" on public.bitacora
  for select to authenticated using ((select public.es_admin()));
