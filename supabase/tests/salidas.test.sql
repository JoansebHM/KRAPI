-- Pruebas de salidas y asignaciones (#106).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'beto@usuarios.kira.invalid');
update public.perfiles set estado = 'activo';
update public.perfiles set rol = 'admin' where usuario = 'admin';

set local role authenticated;

-- Un miembro no arma salidas.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.salidas (nombre, fecha, hora_inicio) values ('Salida', '2026-10-30', '14:00') $$,
  '42501', null, 'un miembro no crea salidas');

-- El admin crea una salida con una zona asignada a Ana y Beto.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
insert into public.salidas (id, nombre, fecha, hora_inicio)
values ('00000000-0000-0000-0000-000000000051', 'Salida de octubre', '2026-10-30', '14:00');
insert into public.asignaciones (id, salida_id, nombre, geom) values
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000051', 'Cuadrante norte',
   'SRID=4326;POLYGON((-75.5745 6.2128, -75.5739 6.2128, -75.5739 6.2134, -75.5745 6.2134, -75.5745 6.2128))');
insert into public.asignacion_participantes (asignacion_id, usuario_id) values
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-0000000000b2');

select is(
  (select forma ->> 'type' from public.asignaciones where id = '00000000-0000-0000-0000-000000000061'),
  'Polygon', 'la forma se lee en GeoJSON');
select throws_ok(
  $$ insert into public.asignaciones (salida_id, nombre, geom) values ('00000000-0000-0000-0000-000000000051', 'Lejos',
     'SRID=4326;POLYGON((-75.60 6.20, -75.59 6.20, -75.59 6.21, -75.60 6.21, -75.60 6.20))') $$,
  '23514', null, 'una zona de asignación debe quedar en Manila');
select is(
  (select count(*)::int from public.bitacora where tabla = 'asignacion_participantes'),
  2, 'la bitácora registra a quién se asignó');

-- Ana reporta lo suyo, pero no lo de Beto.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select isnt_empty($$ select id from public.asignaciones $$, 'un miembro ve las asignaciones');
select isnt_empty(
  $$ update public.asignacion_participantes set hora_fin = '16:30', porcentaje = 75, reportado_en = now()
     where usuario_id = auth.uid() returning asignacion_id $$,
  'cada quien reporta su hora de fin y su porcentaje');
select is_empty(
  $$ update public.asignacion_participantes set hora_fin = '17:00', porcentaje = 100
     where usuario_id = '00000000-0000-0000-0000-0000000000b2' returning asignacion_id $$,
  'no reporta lo de otra persona');
select throws_ok(
  $$ update public.asignacion_participantes set hora_fin = '16:30', porcentaje = 60 where usuario_id = auth.uid() $$,
  '23514', null, 'el porcentaje va en pasos de 25');
select throws_ok(
  $$ update public.asignacion_participantes set hora_fin = null where usuario_id = auth.uid() $$,
  '23514', null, 'el reporte va completo');
select throws_ok(
  $$ update public.asignacion_participantes set usuario_id = '00000000-0000-0000-0000-0000000000b2' where usuario_id = auth.uid() $$,
  '42501', null, 'nadie cambia a quién se asignó, solo el reporte');
select is_empty(
  $$ delete from public.asignacion_participantes returning asignacion_id $$, 'un miembro no quita asignaciones');

-- El admin cancela la salida y corrige un reporte.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
select isnt_empty(
  $$ update public.asignacion_participantes set hora_fin = '17:00', porcentaje = 100
     where usuario_id = '00000000-0000-0000-0000-0000000000b2' returning asignacion_id $$,
  'un admin corrige cualquier reporte');
update public.salidas set cancelada_en = now() where id = '00000000-0000-0000-0000-000000000051';
select is(
  (select accion::text from public.bitacora where tabla = 'salidas' order by id desc limit 1),
  'archivar', 'cancelar una salida queda en la bitácora');

select * from finish();
rollback;
