-- Pruebas de las zonas: tipos, área mínima, comentarios y locales adentro (#15).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'beto@usuarios.kira.invalid');
update public.perfiles set estado = 'activo';
update public.perfiles set rol = 'admin' where usuario = 'admin';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

select ok((select count(*) from public.tipos_zona) >= 5, 'vienen tipos de zona para empezar');

insert into public.tipos_zona (id, nombre, color) values ('00000000-0000-0000-0000-000000000071', 'Bodegas', '#123456');

-- Una manzana de unos 60 x 60 m dentro de Manila, con un local adentro y otro afuera.
insert into public.ubicaciones (id, tipo, geom, nombre, tipo_zona_id) values
  ('00000000-0000-0000-0000-000000000011', 'zona',
   'SRID=4326;POLYGON((-75.5745 6.2128, -75.5739 6.2128, -75.5739 6.2134, -75.5745 6.2134, -75.5745 6.2128))',
   'Manzana del parque', '00000000-0000-0000-0000-000000000071');
insert into public.ubicaciones (id, tipo, geom, nombre) values
  ('00000000-0000-0000-0000-000000000012', 'punto', 'SRID=4326;POINT(-75.5742 6.2131)', 'Tienda adentro'),
  ('00000000-0000-0000-0000-000000000013', 'punto', 'SRID=4326;POINT(-75.5760 6.2140)', 'Tienda afuera');
insert into public.estudios (ubicacion_id, fecha, hora_inicio, hora_fin, titulo) values
  ('00000000-0000-0000-0000-000000000012', '2026-10-20', '09:00', '10:00', 'Primera'),
  ('00000000-0000-0000-0000-000000000012', '2026-10-28', '09:00', '10:00', 'Segunda');

select results_eq(
  $$ select nombre, ultimo_estudio from public.locales_en_zona('00000000-0000-0000-0000-000000000011') $$,
  $$ values ('Tienda adentro'::text, '2026-10-28'::date) $$,
  'locales_en_zona: solo los de adentro, con su último estudio');
select is(
  (select tipo_zona_id from public.lugares_mapa() where id = '00000000-0000-0000-0000-000000000011'),
  '00000000-0000-0000-0000-000000000071'::uuid, 'lugares_mapa: trae el tipo de la zona');

select throws_ok(
  $$ insert into public.ubicaciones (tipo, geom, nombre) values ('zona',
     'SRID=4326;POLYGON((-75.5745 6.2128, -75.57449 6.2128, -75.57449 6.21281, -75.5745 6.2128))', 'Diminuta') $$,
  '23514', null, 'no acepta zonas de menos de 20 m²');
select throws_ok(
  $$ update public.ubicaciones set tipo_zona_id = '00000000-0000-0000-0000-000000000071' where id = '00000000-0000-0000-0000-000000000012' $$,
  '23514', null, 'un punto no tiene tipo de zona');

-- Comentarios.
insert into public.comentarios_zona (id, ubicacion_id, texto)
values ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000011', 'Mucho comercio informal.');
select is(
  (select creado_por from public.comentarios_zona where id = '00000000-0000-0000-0000-000000000081'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'el comentario guarda quién lo escribió');
select throws_ok(
  $$ insert into public.comentarios_zona (ubicacion_id, texto) values ('00000000-0000-0000-0000-000000000011', '   ') $$,
  '23514', null, 'no acepta comentarios vacíos');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select isnt_empty($$ select id from public.comentarios_zona $$, 'otro miembro ve los comentarios');
select is_empty(
  $$ delete from public.comentarios_zona returning id $$, 'otro miembro no borra comentarios ajenos');
select is_empty(
  $$ delete from public.tipos_zona where nombre = 'Bodegas' returning id $$, 'un miembro no borra tipos de zona');
select isnt_empty(
  $$ update public.tipos_zona set color = '#654321' where nombre = 'Bodegas' returning id $$, 'un miembro edita tipos de zona');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select isnt_empty(
  $$ delete from public.comentarios_zona returning id $$, 'quien escribió el comentario lo borra');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
select isnt_empty(
  $$ delete from public.tipos_zona where nombre = 'Bodegas' returning id $$, 'un admin borra tipos de zona');
select is(
  (select tipo_zona_id from public.ubicaciones where id = '00000000-0000-0000-0000-000000000011'),
  null, 'al borrar el tipo, la zona queda sin tipo');

select * from finish();
rollback;
