-- =============================================================================
-- Los participantes de un estudio son cuentas (decisión 0023, #104)
--
-- Una persona existía dos veces: como cuenta (para entrar) y como responsable
-- (para los estudios). Ahora todo es por cuenta:
--   - perfiles.avatar_semilla: el avatar dibujado pasa a la cuenta.
--   - estudio_participantes reemplaza a estudio_responsables, con cuentas.
--   - estudios.participantes_anteriores guarda el nombre de los responsables que
--     no tenían cuenta, para no perder el histórico.
--   - Se quitan responsables, estudio_responsables y perfiles.responsable_id.
-- =============================================================================

-- 1. Avatar de cada cuenta. NULL = se usa el id como semilla (igual que con los responsables).
alter table public.perfiles
  add column avatar_semilla text,
  add constraint perfiles_avatar_semilla_valida check (avatar_semilla is null or length(avatar_semilla) between 1 and 64);

comment on column public.perfiles.avatar_semilla is 'Semilla del avatar dibujado (DiceBear Croodles). NULL = se usa el id.';

-- Cada quien cambia su avatar desde Mi perfil.
grant update (avatar_semilla) on table public.perfiles to authenticated;


-- 2. Participantes de cada estudio.
create table public.estudio_participantes (
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  primary key (estudio_id, usuario_id)
);

comment on table public.estudio_participantes is 'Cuentas que participaron en cada estudio.';

create index estudio_participantes_usuario_idx on public.estudio_participantes (usuario_id);

alter table public.estudios
  add column participantes_anteriores text[] not null default '{}';

comment on column public.estudios.participantes_anteriores is
  'Nombres de quienes participaron antes de las cuentas individuales y no tenían cuenta. Solo histórico.';

revoke all on table public.estudio_participantes from anon, authenticated;
grant select, insert, update, delete on table public.estudio_participantes to authenticated;
alter table public.estudio_participantes enable row level security;

-- Los participantes de un estudio se cambian al editarlo (se borran y se vuelven a crear).
create policy "Activos: acceso total" on public.estudio_participantes
  for all to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));

create trigger estudio_participantes_bitacora
  after insert or update or delete on public.estudio_participantes
  for each row execute function public.registrar_bitacora();


-- 3. Pasar lo que había, sin que cuente como una edición ni llene la bitácora.
alter table public.perfiles disable trigger user;
alter table public.estudios disable trigger user;
alter table public.estudio_participantes disable trigger user;

-- El avatar del responsable vinculado ("Este soy yo") pasa a su cuenta.
update public.perfiles p
   set avatar_semilla = coalesce(r.avatar_semilla, r.id::text)
  from public.responsables r
 where p.responsable_id = r.id;

-- Los responsables con cuenta pasan a ser participantes de sus estudios.
insert into public.estudio_participantes (estudio_id, usuario_id)
select er.estudio_id, p.id
  from public.estudio_responsables er
  join public.perfiles p on p.responsable_id = er.responsable_id
on conflict do nothing;

-- El nombre de los que no tenían cuenta queda en el estudio.
update public.estudios e
   set participantes_anteriores = sin_cuenta.nombres
  from (
    select er.estudio_id, array_agg(r.nombre order by r.nombre) as nombres
      from public.estudio_responsables er
      join public.responsables r on r.id = er.responsable_id
     where not exists (select 1 from public.perfiles p where p.responsable_id = r.id)
     group by er.estudio_id
  ) sin_cuenta
 where e.id = sin_cuenta.estudio_id;

alter table public.perfiles enable trigger user;
alter table public.estudios enable trigger user;
alter table public.estudio_participantes enable trigger user;


-- 4. Quitar el catálogo de responsables. La bitácora conserva sus registros (no tiene clave foránea).
alter table public.perfiles drop column responsable_id;
drop table public.estudio_responsables;
drop table public.responsables;


-- 5. Al registrarse, el perfil también toma el avatar elegido (si viene y es válido).
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dominio constant text := '@usuarios.kira.invalid';
  avatar text := nullif(trim(new.raw_user_meta_data ->> 'avatar_semilla'), '');
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
  return new;
end;
$$;
