-- Pruebas del vínculo entre una zona asignada y la zona del mapa que registra (#111).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ad', 'admin@usuarios.kira.invalid');
update public.perfiles set estado = 'activo', rol = 'admin' where usuario = 'admin';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';

insert into public.salidas (id, nombre, fecha, hora_inicio)
values ('00000000-0000-0000-0000-000000000051', 'Salida de octubre', '2026-10-01', '14:00');
insert into public.asignaciones (id, salida_id, nombre, geom) values
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000051', 'Cuadrante norte',
   'SRID=4326;POLYGON((-75.5745 6.2128, -75.5739 6.2128, -75.5739 6.2134, -75.5745 6.2134, -75.5745 6.2128))');

insert into public.ubicaciones (id, tipo, geom, nombre) values
  ('00000000-0000-0000-0000-000000000071', 'zona', 'SRID=4326;POLYGON((-75.5745 6.2128, -75.5739 6.2128, -75.5739 6.2134, -75.5745 6.2134, -75.5745 6.2128))', 'Cuadrante norte'),
  ('00000000-0000-0000-0000-000000000072', 'punto', 'SRID=4326;POINT(-75.5740 6.2130)', 'Tienda');

-- No puede apuntar a un punto.
select throws_ok(
  $$ update public.asignaciones set zona_id = '00000000-0000-0000-0000-000000000072' where id = '00000000-0000-0000-0000-000000000061' $$,
  'P0001', null, 'zona_id no puede apuntar a un punto');

-- Se liga a una zona.
update public.asignaciones set zona_id = '00000000-0000-0000-0000-000000000071' where id = '00000000-0000-0000-0000-000000000061';
select is(
  (select zona_id from public.asignaciones where id = '00000000-0000-0000-0000-000000000061'),
  '00000000-0000-0000-0000-000000000071'::uuid, 'queda ligada a la zona del mapa');

-- Otra salida cubre el mismo cuadrante y reusa el vínculo (lo trae la app, no un trigger).
insert into public.salidas (id, nombre, fecha, hora_inicio)
values ('00000000-0000-0000-0000-000000000052', 'Salida de noviembre', '2026-11-01', '14:00');
insert into public.asignaciones (id, salida_id, nombre, geom, zona_id) values
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000052', 'Cuadrante norte',
   'SRID=4326;POLYGON((-75.5745 6.2128, -75.5739 6.2128, -75.5739 6.2134, -75.5745 6.2134, -75.5745 6.2128))',
   '00000000-0000-0000-0000-000000000071');
select is(
  (select count(*)::int from public.asignaciones where zona_id = '00000000-0000-0000-0000-000000000071'),
  2, 'dos asignaciones de salidas distintas pueden apuntar a la misma zona');

-- Si se borra la zona del mapa, las asignaciones no se pierden: solo quedan sin el vínculo.
delete from public.ubicaciones where id = '00000000-0000-0000-0000-000000000071';
select is(
  (select count(*)::int from public.asignaciones where id in ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000062')),
  2, 'las asignaciones siguen existiendo');
select is(
  (select zona_id from public.asignaciones where id = '00000000-0000-0000-0000-000000000061'),
  null, 'y quedan sin el vínculo');

select * from finish();
rollback;
