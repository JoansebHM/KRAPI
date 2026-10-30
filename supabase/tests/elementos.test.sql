-- Pruebas de los elementos: puntos sin estudios que reciben evidencias (#127).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid');
update public.perfiles set estado = 'activo', rol = 'admin' where usuario = 'admin';
update public.perfiles set estado = 'activo' where usuario = 'ana';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

insert into public.categorias (id, nombre, aplica_a) values
  ('00000000-0000-0000-0000-000000000c01', 'Caneca', 'elementos');

insert into public.ubicaciones (id, tipo, geom, nombre, categoria_id) values
  ('00000000-0000-0000-0000-000000000e01', 'elemento', 'SRID=4326;POINT(-75.5740 6.2130)', 'Caneca de la esquina', '00000000-0000-0000-0000-000000000c01'),
  ('00000000-0000-0000-0000-000000000e02', 'punto', 'SRID=4326;POINT(-75.5741 6.2131)', 'Tienda', null);

select is(
  (select aplica_a from public.categorias where nombre = 'Caneca'),
  'elementos'::public.uso_categoria, 'una categoría puede aplicar solo a elementos');

-- Forma y datos de un elemento.
select throws_ok(
  $$ insert into public.ubicaciones (tipo, geom, nombre) values
       ('elemento', 'SRID=4326;POLYGON((-75.5745 6.2128, -75.5739 6.2128, -75.5739 6.2134, -75.5745 6.2134, -75.5745 6.2128))', 'Parque') $$,
  '23514', null, 'un elemento es un punto, no un polígono');
select throws_ok(
  $$ insert into public.ubicaciones (tipo, geom, nombre, contacto_telefono) values
       ('elemento', 'SRID=4326;POINT(-75.5740 6.2130)', 'Poste', '300 123 4567') $$,
  '23514', null, 'un elemento no tiene contacto ni dirección');
select throws_ok(
  $$ update public.ubicaciones set tipo = 'elemento' where id = '00000000-0000-0000-0000-000000000e02' $$,
  'P0001', null, 'un punto no se puede convertir en elemento');

-- Un elemento no tiene estudios.
select throws_ok(
  $$ insert into public.estudios (ubicacion_id, fecha, hora_inicio, hora_fin)
     values ('00000000-0000-0000-0000-000000000e01', '2026-10-27', '10:00', '11:00') $$,
  'P0001', null, 'un elemento no admite estudios');

-- Evidencias del elemento.
insert into public.evidencias (id, ubicacion_id, tipo, archivo_path, archivo_nombre, archivo_mime, archivo_bytes, proveedor) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000e01', 'foto',
   'elementos/00000000-0000-0000-0000-000000000e01/a-caneca.jpg', 'caneca.jpg', 'image/jpeg', 1000, 'supabase');
select is(
  (select creado_por from public.evidencias where id = '00000000-0000-0000-0000-0000000000f1'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'la evidencia de un elemento lleva su autoría');
-- Solo un admin lee la bitácora.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
select ok(
  exists (select 1 from public.bitacora where tabla = 'evidencias' and registro_id = '00000000-0000-0000-0000-0000000000f1'),
  'y queda en la bitácora');
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.evidencias (ubicacion_id, tipo, url_externa, proveedor)
     values ('00000000-0000-0000-0000-000000000e02', 'video', 'https://kratos.sharepoint.com/v', 'sharepoint') $$,
  'P0001', null, 'ubicacion_id solo puede apuntar a un elemento');
select throws_ok(
  $$ insert into public.evidencias (tipo, url_externa, proveedor)
     values ('video', 'https://kratos.sharepoint.com/v', 'sharepoint') $$,
  '23514', null, 'una evidencia tiene estudio o elemento');

insert into public.estudios (id, ubicacion_id, fecha, hora_inicio, hora_fin)
values ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000e02', '2026-10-27', '10:00', '11:00');
select throws_ok(
  $$ insert into public.evidencias (estudio_id, ubicacion_id, tipo, url_externa, proveedor)
     values ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000e01', 'video', 'https://kratos.sharepoint.com/v', 'sharepoint') $$,
  '23514', null, 'pero no las dos cosas');

-- El nombre es opcional en un elemento, no en un punto ni una zona.
insert into public.ubicaciones (id, tipo, geom, categoria_id) values
  ('00000000-0000-0000-0000-000000000e03', 'elemento', 'SRID=4326;POINT(-75.5750 6.2140)', '00000000-0000-0000-0000-000000000c01');
select is(
  (select nombre from public.ubicaciones where id = '00000000-0000-0000-0000-000000000e03'),
  null, 'un elemento puede no tener nombre');
select is(
  (select nombre from public.lugares_mapa() where id = '00000000-0000-0000-0000-000000000e03'),
  'Caneca', 'sin nombre, el mapa muestra el de su categoría');
select throws_ok(
  $$ insert into public.ubicaciones (tipo, geom, nombre) values ('elemento', 'SRID=4326;POINT(-75.5751 6.2141)', '   ') $$,
  '23514', null, 'pero un nombre escrito no puede ser solo espacios');
select throws_ok(
  $$ insert into public.ubicaciones (tipo, geom) values ('punto', 'SRID=4326;POINT(-75.5752 6.2142)') $$,
  '23514', null, 'un punto sí necesita nombre');

-- Duplicados: solo elementos de la misma categoría muy cerca.
select is(
  (select array_agg(nombre) from public.elementos_cercanos(-75.57401, 6.2130, '00000000-0000-0000-0000-000000000c01')),
  array['Caneca de la esquina'], 'encuentra el elemento de la misma categoría a menos de 3 m');
select is(
  (select count(*)::int from public.elementos_cercanos(-75.57401, 6.2130, null)),
  0, 'no lo encuentra si la categoría es otra');

-- Borrar: un elemento con evidencias no se borra (se archiva).
delete from public.ubicaciones where id = '00000000-0000-0000-0000-000000000e01';
select is(
  (select count(*)::int from public.ubicaciones where id = '00000000-0000-0000-0000-000000000e01'),
  1, 'un elemento con evidencias no se borra');

delete from public.evidencias where id = '00000000-0000-0000-0000-0000000000f1';
delete from public.ubicaciones where id = '00000000-0000-0000-0000-000000000e01';
select is(
  (select count(*)::int from public.ubicaciones where id = '00000000-0000-0000-0000-000000000e01'),
  0, 'sin evidencias, quien lo creó lo puede borrar');

select * from finish();
rollback;
