-- Pruebas de las notas de los estudios (#101).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid');
update public.perfiles set estado = 'activo' where usuario = 'ana';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

insert into public.ubicaciones (id, tipo, geom, nombre)
values ('00000000-0000-0000-0000-000000000011', 'punto', 'SRID=4326;POINT(-75.5740 6.2130)', 'Tienda');
insert into public.estudios (id, ubicacion_id, fecha, hora_inicio, hora_fin)
values ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', '2026-10-30', '14:00', '15:00');

select is(
  (select notas from public.estudios where id = '00000000-0000-0000-0000-000000000021'),
  '{}'::text[], 'un estudio nuevo no tiene notas');

update public.estudios set notas = array['El distribuidor pasa los martes.', 'La nevera está llena.']
 where id = '00000000-0000-0000-0000-000000000021';
select is(
  (select cardinality(notas) from public.estudios where id = '00000000-0000-0000-0000-000000000021'),
  2, 'guarda varias notas en orden');

select throws_ok(
  $$ update public.estudios set notas = array['Bien', '   '] $$,
  '23514', null, 'no acepta notas vacías');
select throws_ok(
  $$ update public.estudios set notas = array[repeat('a', 2001)] $$,
  '23514', null, 'no acepta notas de más de 2000 caracteres');
select throws_ok(
  $$ update public.estudios set notas = array_fill('nota'::text, array[51]) $$,
  '23514', null, 'no acepta más de 50 notas');

reset role;
select is(
  (select cambios -> 'notas' -> 'despues' from public.bitacora where tabla = 'estudios' and accion = 'editar'),
  '["El distribuidor pasa los martes.", "La nevera está llena."]'::jsonb,
  'la bitácora registra las notas que cambiaron');
select hasnt_column('public', 'estudios', 'descripcion', 'ya no existe la columna descripcion');

select * from finish();
rollback;
