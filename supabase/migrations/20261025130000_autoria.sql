-- =============================================================================
-- Autoría: quién creó, editó y archivó cada registro (decisión 0021)
--
-- Las columnas las llena la base de datos con auth.uid() mediante triggers, no
-- la app, para que no se puedan falsear: cualquier valor que mande la app se
-- reemplaza. Los registros anteriores a esta migración quedan en NULL y la app
-- los muestra como "Cuenta compartida".
-- =============================================================================

alter table public.categorias
  add column creado_por uuid references auth.users (id) on delete set null,
  add column actualizado_por uuid references auth.users (id) on delete set null;

alter table public.responsables
  add column creado_por uuid references auth.users (id) on delete set null,
  add column actualizado_por uuid references auth.users (id) on delete set null;

alter table public.ubicaciones
  add column creado_por uuid references auth.users (id) on delete set null,
  add column actualizado_por uuid references auth.users (id) on delete set null,
  add column archivada_por uuid references auth.users (id) on delete set null;

alter table public.estudios
  add column creado_por uuid references auth.users (id) on delete set null,
  add column actualizado_por uuid references auth.users (id) on delete set null,
  add column archivado_por uuid references auth.users (id) on delete set null;

alter table public.evidencias
  add column creado_por uuid references auth.users (id) on delete set null,
  add column actualizado_por uuid references auth.users (id) on delete set null;

comment on column public.ubicaciones.creado_por is 'Cuenta que creó el lugar. NULL = antes de las cuentas individuales.';
comment on column public.ubicaciones.archivada_por is 'Cuenta que archivó el lugar. Se limpia al recuperarlo.';
comment on column public.estudios.creado_por is 'Cuenta que registró el estudio. NULL = antes de las cuentas individuales.';
comment on column public.estudios.archivado_por is 'Cuenta que archivó el estudio. Se limpia al recuperarlo.';
comment on column public.evidencias.creado_por is 'Cuenta que subió la evidencia. Solo ella o un admin la pueden borrar.';

-- Para "borrar solo lo propio" y para mostrar lo que registró cada persona.
create index ubicaciones_creado_por_idx on public.ubicaciones (creado_por);
create index estudios_creado_por_idx on public.estudios (creado_por);
create index evidencias_creado_por_idx on public.evidencias (creado_por);


-- Trigger de autoría. Si se le pasan dos argumentos (columna de fecha de
-- archivado y columna de quién archivó), también lleva la cuenta del archivado.
create or replace function public.poner_autoria()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  columna_fecha text := tg_argv[0];
  columna_quien text := tg_argv[1];
  archivada_antes boolean;
  archivada_ahora boolean;
  quien uuid;
begin
  -- Cambios en cascada de las claves foráneas (por ejemplo, ON DELETE SET NULL al
  -- borrar una cuenta): se dejan pasar tal cual.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.creado_por := auth.uid();
    new.actualizado_por := auth.uid();
  else
    new.creado_por := old.creado_por;
    new.actualizado_por := auth.uid();
  end if;

  if columna_fecha is not null then
    archivada_ahora := (to_jsonb(new) ->> columna_fecha) is not null;
    archivada_antes := tg_op = 'UPDATE' and (to_jsonb(old) ->> columna_fecha) is not null;

    if not archivada_ahora then
      quien := null;
    elsif archivada_antes then
      quien := (to_jsonb(old) ->> columna_quien)::uuid;
    else
      quien := auth.uid();
    end if;

    new := jsonb_populate_record(new, jsonb_build_object(columna_quien, quien));
  end if;

  return new;
end;
$$;

comment on function public.poner_autoria() is
  'Trigger: llena creado_por y actualizado_por con auth.uid(). Con argumentos (columna de fecha, columna de quién), también quién archivó.';

revoke execute on function public.poner_autoria() from public, anon, authenticated;

create trigger categorias_autoria
  before insert or update on public.categorias
  for each row execute function public.poner_autoria();

create trigger responsables_autoria
  before insert or update on public.responsables
  for each row execute function public.poner_autoria();

create trigger ubicaciones_autoria
  before insert or update on public.ubicaciones
  for each row execute function public.poner_autoria('archivada_en', 'archivada_por');

create trigger estudios_autoria
  before insert or update on public.estudios
  for each row execute function public.poner_autoria('archivado_en', 'archivado_por');

create trigger evidencias_autoria
  before insert or update on public.evidencias
  for each row execute function public.poner_autoria();

-- Los permisos de las tablas (solo authenticated) y sus políticas RLS ya cubren las columnas nuevas.
