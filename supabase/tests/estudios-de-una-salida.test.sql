-- Pruebas de ligar un estudio a una salida (#106).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@usuarios.kira.invalid');
update public.perfiles set estado = 'activo';
update public.perfiles set rol = 'admin' where usuario = 'admin';

set local role authenticated;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
insert into public.salidas (id, nombre, fecha, hora_inicio)
values ('00000000-0000-0000-0000-000000000051', 'Salida de octubre', '2026-10-30', '14:00');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
insert into public.ubicaciones (id, tipo, geom, nombre)
values ('00000000-0000-0000-0000-000000000011', 'punto', 'SRID=4326;POINT(-75.5740 6.2130)', 'Tienda');

-- Un miembro (no solo un admin) liga su estudio a una salida.
insert into public.estudios (id, ubicacion_id, fecha, hora_inicio, hora_fin, salida_id)
values ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', '2026-10-30', '14:00', '15:00', '00000000-0000-0000-0000-000000000051');

select is(
  (select salida_id from public.estudios where id = '00000000-0000-0000-0000-000000000021'),
  '00000000-0000-0000-0000-000000000051'::uuid, 'el estudio queda ligado a la salida');

-- Un estudio sin salida sigue siendo válido: nada obliga a ligarlo.
insert into public.estudios (id, ubicacion_id, fecha, hora_inicio, hora_fin)
values ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011', '2026-10-31', '09:00', '10:00');
select is(
  (select salida_id from public.estudios where id = '00000000-0000-0000-0000-000000000022'),
  null, 'un estudio puede no tener salida');

-- Se puede ligar un estudio después, al editarlo.
update public.estudios set salida_id = '00000000-0000-0000-0000-000000000051' where id = '00000000-0000-0000-0000-000000000022';
select is(
  (select salida_id from public.estudios where id = '00000000-0000-0000-0000-000000000022'),
  '00000000-0000-0000-0000-000000000051'::uuid, 'se liga un estudio existente a una salida');

-- La bitácora registra el cambio (solo la leen los admins).
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
select is(
  (select cambios -> 'salida_id' ->> 'despues' from public.bitacora where tabla = 'estudios' and registro_id = '00000000-0000-0000-0000-000000000022' order by id desc limit 1),
  '00000000-0000-0000-0000-000000000051', 'la bitácora registra a qué salida se ligó');

-- Si se borra la salida, el estudio no se pierde: solo queda sin ella.
delete from public.salidas where id = '00000000-0000-0000-0000-000000000051';
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select is(
  (select salida_id from public.estudios where id = '00000000-0000-0000-0000-000000000021'),
  null, 'al borrar la salida, el estudio queda sin ella (no se borra)');

select * from finish();
rollback;
