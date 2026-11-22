-- Puntos y elementos pueden quedar fuera de Manila; las zonas no (#179).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid');
update public.perfiles set estado = 'activo' where usuario = 'ana';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

-- Un punto y un elemento al sur de Manila (a unos 500 m del borde).
select lives_ok(
  $$ insert into public.ubicaciones (tipo, geom, nombre) values
       ('punto', 'SRID=4326;POINT(-75.5734 6.2000)', 'Local aledaño') $$,
  'un punto puede quedar fuera de Manila');
select lives_ok(
  $$ insert into public.ubicaciones (tipo, geom, nombre) values
       ('elemento', 'SRID=4326;POINT(-75.5734 6.2001)', 'Caneca aledaña') $$,
  'un elemento puede quedar fuera de Manila');
select lives_ok(
  $$ update public.ubicaciones set geom = 'SRID=4326;POINT(-75.5700 6.2010)' where nombre = 'Local aledaño' $$,
  'un punto se puede mover fuera de Manila');

-- Una zona, en cambio, sigue dentro del barrio.
select throws_ok(
  $$ insert into public.ubicaciones (tipo, geom, nombre) values
       ('zona', 'SRID=4326;POLYGON((-75.5740 6.2000, -75.5734 6.2000, -75.5734 6.2006, -75.5740 6.2006, -75.5740 6.2000))', 'Zona aledaña') $$,
  '23514', null, 'una zona fuera de Manila sigue rechazada');
select lives_ok(
  $$ insert into public.ubicaciones (tipo, geom, nombre) values
       ('zona', 'SRID=4326;POLYGON((-75.5745 6.2128, -75.5739 6.2128, -75.5739 6.2134, -75.5745 6.2134, -75.5745 6.2128))', 'Zona del barrio') $$,
  'una zona dentro de Manila se guarda');

select * from finish();
rollback;
