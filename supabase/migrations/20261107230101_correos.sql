-- =============================================================================
-- Correo de contacto opcional y avisos por correo (decisión 0035)
--
-- Las cuentas entran con nombre de usuario y no tienen un correo real. Cada persona puede
-- guardar uno, opcional, para recibir avisos:
--   - Los admins: cuando alguien se registra y queda esperando aprobación.
--   - Quien se registró: cuando su cuenta es aprobada o rechazada.
--
-- El correo vive en una tabla aparte (`contactos`) y no en `perfiles`, porque cualquier cuenta
-- activa lee todos los perfiles y el correo solo debe verlo su dueño.
--
-- Los avisos los envía la Edge Function `enviar-correo` (con Brevo). Los triggers la llaman con
-- pg_net, de forma asíncrona y después del commit: si el envío falla, el registro o la
-- aprobación no se ven afectados. La dirección de la función y el secreto compartido están en
-- Vault (`correos_url` y `correos_secreto`); si faltan, simplemente no se avisa.
-- =============================================================================

create extension if not exists pg_net;


-- 1. Tabla de contactos: a lo sumo un correo por cuenta.
create table public.contactos (
  perfil_id uuid primary key references public.perfiles (id) on delete cascade,
  correo text not null,
  updated_at timestamptz not null default now(),

  -- Siempre en minúsculas y sin espacios. El formato es el básico: algo@dominio.ext.
  constraint contactos_correo_valido check (
    length(correo) <= 254 and correo = lower(trim(correo)) and correo ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

comment on table public.contactos is 'Correo de contacto opcional de cada cuenta, para los avisos. Solo lo lee su dueño.';
comment on column public.contactos.correo is 'Correo en minúsculas. No se verifica (decisión 0035).';

create trigger contactos_set_updated_at
  before update on public.contactos
  for each row execute function public.set_updated_at();


-- 2. Normaliza un correo: minúsculas y sin espacios; null si está vacío o no tiene formato válido.
create or replace function public.correo_o_nulo(texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when length(lower(trim(texto))) <= 254
     and lower(trim(texto)) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    then lower(trim(texto))
  end
$$;

comment on function public.correo_o_nulo(text) is 'Uso interno: correo normalizado, o null si está vacío o no es válido.';


-- 3. Guardar o quitar mi correo. Es la única forma de escribir en contactos desde la app.
create or replace function public.guardar_correo(correo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  limpio text := public.correo_o_nulo(correo);
begin
  if not public.es_miembro_activo() then
    raise exception 'Solo una cuenta activa puede guardar su correo.' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(correo, '')), '') is null then
    delete from public.contactos where perfil_id = auth.uid();
  elsif limpio is null then
    raise exception 'Escribe un correo válido.' using errcode = '22023';
  else
    insert into public.contactos (perfil_id, correo) values (auth.uid(), limpio)
    on conflict (perfil_id) do update set correo = excluded.correo;
  end if;
end;
$$;

comment on function public.guardar_correo(text) is 'Guarda el correo de la cuenta que llama; vacío lo quita.';


-- 4. Al registrarse, el correo (si viene y es válido) se guarda en contactos. Un correo mal
--    escrito no impide crear la cuenta: simplemente no se guarda.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dominio constant text := '@usuarios.kira.invalid';
  avatar text := nullif(trim(new.raw_user_meta_data ->> 'avatar_semilla'), '');
  contacto text := public.correo_o_nulo(new.raw_user_meta_data ->> 'correo_contacto');
begin
  if new.email is null or right(lower(new.email), length(dominio)) <> dominio then
    raise exception 'Las cuentas de KIRA se crean con un nombre de usuario (correo interno %).', dominio
      using errcode = '22023';
  end if;

  insert into public.perfiles (id, nombre, usuario, avatar_semilla)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(lower(new.email), '@', 1)),
    split_part(lower(new.email), '@', 1),
    case when length(avatar) <= 64 then avatar end
  );

  if contacto is not null then
    insert into public.contactos (perfil_id, correo) values (new.id, contacto);
  end if;
  return new;
end;
$$;


-- 5. Avisar a la Edge Function. Asíncrono: pg_net envía la petición después del commit y
--    cualquier error se queda en un warning, nunca rompe la operación que lo disparó.
create or replace function public.avisar_por_correo(evento text, perfil_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  secreto text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'correos_url';
  select decrypted_secret into secreto from vault.decrypted_secrets where name = 'correos_secreto';
  if url is null or secreto is null then
    return;
  end if;

  perform net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-kira-secreto', secreto),
    body := jsonb_build_object('evento', evento, 'perfil_id', perfil_id),
    timeout_milliseconds := 5000
  );
exception when others then
  raise warning 'No se pudo avisar por correo (%): %', evento, sqlerrm;
end;
$$;

comment on function public.avisar_por_correo(text, uuid) is 'Uso interno: pide a la Edge Function enviar-correo un aviso. No hace nada si falta la configuración en Vault.';

-- Registro nuevo: avisa a los admins. Si llegan más de 10 registros en una hora (alguien
-- probando o un abuso), deja de avisar para no llenar los correos ni gastar el cupo de Brevo.
create or replace function public.avisar_registro_nuevo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado = 'pendiente'
     and (select count(*) from public.perfiles where created_at > now() - interval '1 hour') <= 10 then
    perform public.avisar_por_correo('registro_pendiente', new.id);
  end if;
  return new;
end;
$$;

-- Aprobada o rechazada. Reactivar una cuenta desactivada no es una aprobación nueva.
create or replace function public.avisar_cambio_de_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado = 'activo' and old.estado in ('pendiente', 'rechazado') then
    perform public.avisar_por_correo('cuenta_aprobada', new.id);
  elsif new.estado = 'rechazado' and old.estado = 'pendiente' then
    perform public.avisar_por_correo('cuenta_rechazada', new.id);
  end if;
  return new;
end;
$$;

create trigger avisar_registro_nuevo
  after insert on public.perfiles
  for each row execute function public.avisar_registro_nuevo();

create trigger avisar_cambio_de_estado
  after update of estado on public.perfiles
  for each row when (old.estado is distinct from new.estado)
  execute function public.avisar_cambio_de_estado();


-- 6. Permisos. Solo el dueño lee su correo; escribir es solo con guardar_correo().
revoke all on table public.contactos from anon, authenticated;
grant select on table public.contactos to authenticated;

alter table public.contactos enable row level security;

create policy "Contactos: leer el propio" on public.contactos
  for select to authenticated
  using (perfil_id = (select auth.uid()));

revoke execute on function
  public.correo_o_nulo(text),
  public.guardar_correo(text),
  public.avisar_por_correo(text, uuid),
  public.avisar_registro_nuevo(),
  public.avisar_cambio_de_estado()
from public, anon, authenticated;

grant execute on function public.guardar_correo(text) to authenticated;
