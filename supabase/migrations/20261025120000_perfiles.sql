-- =============================================================================
-- Perfiles de usuario con rol y estado (decisión 0021)
--
-- Cada cuenta de auth.users tiene un perfil. Las cuentas no tienen correo real:
-- la app convierte el nombre de usuario en un correo interno
-- (<usuario>@usuarios.kira.invalid), y el perfil guarda el nombre de usuario.
--
-- Una cuenta nueva queda "pendiente" hasta que un admin la apruebe. Solo las
-- cuentas "activo" tienen acceso a los datos (eso lo aplican las políticas RLS
-- de cada tabla con es_miembro_activo() y es_admin()).
-- =============================================================================

create type public.rol_usuario as enum ('miembro', 'admin');
create type public.estado_cuenta as enum ('pendiente', 'activo', 'rechazado', 'desactivado');

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  usuario text not null,
  rol public.rol_usuario not null default 'miembro',
  estado public.estado_cuenta not null default 'pendiente',
  -- "Este soy yo": el responsable de los estudios que corresponde a esta cuenta.
  responsable_id uuid references public.responsables (id) on delete set null,
  aprobado_por uuid references auth.users (id) on delete set null,
  aprobado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint perfiles_nombre_valido check (length(trim(nombre)) between 1 and 80),
  -- Minúsculas sin tildes, números, punto, guion bajo y guion: siempre forma un correo válido.
  constraint perfiles_usuario_formato check (usuario ~ '^[a-z0-9._-]{3,30}$')
);

comment on table public.perfiles is 'Una fila por cuenta de auth.users: nombre, nombre de usuario, rol y estado.';
comment on column public.perfiles.usuario is 'Nombre de usuario para entrar. Único y en minúsculas; no cambia después de creado.';
comment on column public.perfiles.estado is 'pendiente, activo, rechazado o desactivado. Solo activo tiene acceso a los datos.';
comment on column public.perfiles.responsable_id is 'Responsable vinculado a la cuenta. Un responsable solo puede estar vinculado a una cuenta.';

-- El formato ya obliga a minúsculas, así que el índice único no distingue mayúsculas.
create unique index perfiles_usuario_unico on public.perfiles (usuario);
create unique index perfiles_responsable_unico on public.perfiles (responsable_id) where responsable_id is not null;
create index perfiles_estado_idx on public.perfiles (estado);

create trigger perfiles_set_updated_at
  before update on public.perfiles
  for each row execute function public.set_updated_at();


-- 1. Funciones para las políticas RLS. Son security definer para poder leer
--    perfiles sin depender de sus propias políticas (evita la recursión).
create or replace function public.es_miembro_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and estado = 'activo'
  )
$$;

comment on function public.es_miembro_activo() is 'true si quien llama tiene una cuenta activa (miembro o admin).';

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and estado = 'activo' and rol = 'admin'
  )
$$;

comment on function public.es_admin() is 'true si quien llama es admin con la cuenta activa.';


-- 2. Al registrarse alguien se crea su perfil en "pendiente".
--    El nombre de usuario sale del correo interno (no de los metadatos), para
--    que coincida siempre con el correo con el que se entra.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dominio constant text := '@usuarios.kira.invalid';
begin
  if new.email is null or right(lower(new.email), length(dominio)) <> dominio then
    raise exception 'Las cuentas de KIRA se crean con un nombre de usuario (correo interno %).', dominio
      using errcode = '22023';
  end if;

  insert into public.perfiles (id, nombre, usuario)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(lower(new.email), '@', 1)),
    split_part(lower(new.email), '@', 1)
  );
  return new;
end;
$$;

comment on function public.crear_perfil() is 'Trigger de auth.users: crea el perfil pendiente de cada cuenta nueva.';

create trigger crear_perfil_al_registrarse
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- El nombre de usuario no cambia, así que tampoco el correo interno.
create or replace function public.impedir_cambio_correo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    raise exception 'El nombre de usuario no se puede cambiar.' using errcode = '22023';
  end if;
  return new;
end;
$$;

comment on function public.impedir_cambio_correo() is 'Trigger de auth.users: el correo interno (nombre de usuario) no cambia.';

create trigger impedir_cambio_correo
  before update of email on auth.users
  for each row execute function public.impedir_cambio_correo();


-- 3. Disponibilidad del nombre de usuario, para avisar en el formulario de registro.
--    Se puede llamar sin sesión (decisión 0021).
create or replace function public.usuario_disponible(usuario text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.perfiles p
    where p.usuario = lower(trim(usuario_disponible.usuario))
  )
$$;

comment on function public.usuario_disponible(text) is 'true si nadie tiene ese nombre de usuario (sin distinguir mayúsculas).';


-- 4. Administración de cuentas. Solo para admins, y nadie cambia su propio rol
--    ni su propio estado. Como quien llama es un admin activo y no puede tocarse
--    a sí mismo, el sistema nunca queda sin admins activos.
create or replace function public.validar_cambio_de_cuenta(usuario_id uuid)
returns public.perfiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  perfil public.perfiles;
begin
  if not public.es_admin() then
    raise exception 'Solo un admin puede administrar cuentas.' using errcode = '42501';
  end if;
  if usuario_id = auth.uid() then
    raise exception 'No puedes cambiar tu propio rol ni tu propio estado.' using errcode = '42501';
  end if;

  select * into perfil from public.perfiles where id = usuario_id;
  if not found then
    raise exception 'La cuenta no existe.' using errcode = 'P0002';
  end if;
  return perfil;
end;
$$;

comment on function public.validar_cambio_de_cuenta(uuid) is 'Uso interno: revisa que quien llama sea admin y no se esté cambiando a sí mismo.';

create or replace function public.aprobar_usuario(usuario_id uuid)
returns public.perfiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  perfil public.perfiles := public.validar_cambio_de_cuenta(usuario_id);
begin
  if perfil.estado not in ('pendiente', 'rechazado') then
    raise exception 'Solo se aprueban cuentas pendientes o rechazadas.' using errcode = '22023';
  end if;

  update public.perfiles
     set estado = 'activo', aprobado_por = auth.uid(), aprobado_en = now()
   where id = usuario_id
  returning * into perfil;
  return perfil;
end;
$$;

create or replace function public.rechazar_usuario(usuario_id uuid)
returns public.perfiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  perfil public.perfiles := public.validar_cambio_de_cuenta(usuario_id);
begin
  if perfil.estado <> 'pendiente' then
    raise exception 'Solo se rechazan cuentas pendientes.' using errcode = '22023';
  end if;

  update public.perfiles set estado = 'rechazado' where id = usuario_id
  returning * into perfil;
  return perfil;
end;
$$;

create or replace function public.desactivar_usuario(usuario_id uuid)
returns public.perfiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  perfil public.perfiles := public.validar_cambio_de_cuenta(usuario_id);
begin
  if perfil.estado <> 'activo' then
    raise exception 'Solo se desactivan cuentas activas.' using errcode = '22023';
  end if;

  update public.perfiles set estado = 'desactivado' where id = usuario_id
  returning * into perfil;
  -- Cierra sus sesiones: ya no podrá renovar el token. Mientras tanto, RLS le
  -- niega los datos porque es_miembro_activo() deja de ser true.
  delete from auth.sessions where user_id = usuario_id;
  return perfil;
end;
$$;

create or replace function public.reactivar_usuario(usuario_id uuid)
returns public.perfiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  perfil public.perfiles := public.validar_cambio_de_cuenta(usuario_id);
begin
  if perfil.estado <> 'desactivado' then
    raise exception 'Solo se reactivan cuentas desactivadas.' using errcode = '22023';
  end if;

  update public.perfiles set estado = 'activo' where id = usuario_id
  returning * into perfil;
  return perfil;
end;
$$;

create or replace function public.cambiar_rol(usuario_id uuid, rol public.rol_usuario)
returns public.perfiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  perfil public.perfiles := public.validar_cambio_de_cuenta(usuario_id);
begin
  if perfil.estado <> 'activo' then
    raise exception 'Solo se cambia el rol de cuentas activas.' using errcode = '22023';
  end if;

  update public.perfiles set rol = cambiar_rol.rol where id = usuario_id
  returning * into perfil;
  return perfil;
end;
$$;

comment on function public.aprobar_usuario(uuid) is 'Admin: pasa una cuenta pendiente o rechazada a activo.';
comment on function public.rechazar_usuario(uuid) is 'Admin: pasa una cuenta pendiente a rechazado.';
comment on function public.desactivar_usuario(uuid) is 'Admin: pasa una cuenta activa a desactivado y cierra sus sesiones.';
comment on function public.reactivar_usuario(uuid) is 'Admin: pasa una cuenta desactivada a activo.';
comment on function public.cambiar_rol(uuid, public.rol_usuario) is 'Admin: nombra o quita admins entre las cuentas activas.';


-- 5. Permisos. Cada quien edita solo su nombre y su responsable vinculado: el
--    rol y el estado solo cambian con las funciones de administración.
revoke all on table public.perfiles from anon, authenticated;
grant select on table public.perfiles to authenticated;
grant update (nombre, responsable_id) on table public.perfiles to authenticated;

revoke execute on function
  public.es_miembro_activo(),
  public.es_admin(),
  public.usuario_disponible(text),
  public.validar_cambio_de_cuenta(uuid),
  public.aprobar_usuario(uuid),
  public.rechazar_usuario(uuid),
  public.desactivar_usuario(uuid),
  public.reactivar_usuario(uuid),
  public.cambiar_rol(uuid, public.rol_usuario),
  public.crear_perfil(),
  public.impedir_cambio_correo()
from public, anon, authenticated;

grant execute on function
  public.es_miembro_activo(),
  public.es_admin(),
  public.aprobar_usuario(uuid),
  public.rechazar_usuario(uuid),
  public.desactivar_usuario(uuid),
  public.reactivar_usuario(uuid),
  public.cambiar_rol(uuid, public.rol_usuario)
to authenticated;

grant execute on function public.usuario_disponible(text) to anon, authenticated;

alter table public.perfiles enable row level security;

-- Cada quien lee su propio perfil (aunque esté pendiente, para saber su estado);
-- un miembro activo ve los de todos (nombres en los registros y página de usuarios).
create policy "Perfiles: leer el propio o, si está activo, todos" on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_miembro_activo()));

create policy "Perfiles: editar el propio si está activo" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()) and (select public.es_miembro_activo()))
  with check (id = (select auth.uid()));


-- 6. Backfill: las cuentas que ya existen (el usuario compartido) quedan como
--    admin activo, para que la app siga funcionando al aplicar esta migración.
--    Se llaman "Cuenta compartida" para que lo que registren se muestre igual
--    que los registros antiguos.
insert into public.perfiles (id, nombre, usuario, rol, estado, aprobado_en)
select
  u.id,
  'Cuenta compartida',
  case when row_number() over (order by u.created_at) = 1 then 'compartido'
       else 'compartido-' || row_number() over (order by u.created_at) end,
  'admin',
  'activo',
  now()
from auth.users u
on conflict (id) do nothing;
