-- Pruebas de permisos por estado y rol de la cuenta (#71).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(30);

-- Cuentas: un admin, dos miembros activos (Ana y Beto) y una cuenta pendiente.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'beto@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'pepe@usuarios.kira.invalid');
update public.perfiles set estado = 'activo' where usuario in ('admin', 'ana', 'beto');
update public.perfiles set rol = 'admin' where usuario = 'admin';

-- Datos creados por Ana: una categoría, un lugar con un estudio y una evidencia,
-- otro lugar sin estudios, y el archivo de la evidencia en el bucket.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

insert into public.categorias (id, nombre) values ('00000000-0000-0000-0000-000000000001', 'Café');
insert into public.ubicaciones (id, tipo, geom, nombre) values
  ('00000000-0000-0000-0000-000000000011', 'punto', 'SRID=4326;POINT(-75.5740 6.2130)', 'Tienda'),
  ('00000000-0000-0000-0000-000000000012', 'punto', 'SRID=4326;POINT(-75.5745 6.2132)', 'Creado por error');
insert into public.estudios (id, ubicacion_id, fecha, hora_inicio, hora_fin, titulo)
values ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011',
        '2026-10-30', '14:00', '15:00', 'Entrevista');
insert into public.evidencias (id, estudio_id, tipo, texto) values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000021', 'texto', 'Nota de Ana'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000021', 'texto', 'Otra nota de Ana');
insert into storage.objects (bucket_id, name, owner_id)
values ('evidencias', 'estudio/foto-ana.jpg', '00000000-0000-0000-0000-0000000000a1');

select pass('un miembro activo crea categorías, lugares, estudios, evidencias y archivos');

-- Storage solo deja borrar archivos por su API; esto lo permite en la prueba
-- para revisar la política de borrado igual que la aplica la API.
set local storage.allow_delete_query = 'true';

-- Cuenta pendiente: no ve ni toca nada.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated"}';
select is_empty($$ select id from public.categorias $$, 'pendiente: no ve categorías');
select is_empty($$ select id from public.ubicaciones $$, 'pendiente: no ve lugares');
select is_empty($$ select estudio_id from public.estudio_responsables $$, 'pendiente: no ve responsables de estudios');
select is_empty($$ select id from public.evidencias $$, 'pendiente: no ve evidencias');
select is_empty($$ select id from public.lugares_mapa() $$, 'pendiente: lugares_mapa() no devuelve nada');
select is_empty($$ select id from public.ubicaciones_cercanas(-75.5740, 6.2130) $$, 'pendiente: ubicaciones_cercanas() no devuelve nada');
select is_empty($$ select id from storage.objects where bucket_id = 'evidencias' $$, 'pendiente: no ve archivos');
select throws_ok(
  $$ insert into public.categorias (nombre) values ('Hotel') $$,
  '42501', null, 'pendiente: no crea categorías');
select throws_ok(
  $$ insert into public.ubicaciones (tipo, geom, nombre) values ('punto', 'SRID=4326;POINT(-75.5740 6.2130)', 'X') $$,
  '42501', null, 'pendiente: no crea lugares');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('evidencias', 'estudio/otra.jpg') $$,
  '42501', null, 'pendiente: no sube archivos');
select is_empty(
  $$ update public.ubicaciones set nombre = 'Cambio' returning id $$, 'pendiente: no edita lugares');

-- Beto, miembro activo: ve y edita todo, pero no borra lo de Ana ni los catálogos.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select is((select count(*)::int from public.lugares_mapa()), 2, 'miembro: lugares_mapa() devuelve los lugares');
select isnt_empty(
  $$ update public.estudios set titulo = 'Entrevista al tendero' returning id $$, 'miembro: edita estudios de otros');
select isnt_empty(
  $$ update public.ubicaciones set archivada_en = now() where id = '00000000-0000-0000-0000-000000000011' returning id $$,
  'miembro: archiva lugares de otros');
select isnt_empty(
  $$ with r as (insert into public.responsables (nombre) values ('Beto') returning id)
     insert into public.estudio_responsables (estudio_id, responsable_id)
     select '00000000-0000-0000-0000-000000000021', r.id from r
     returning estudio_id $$,
  'miembro: crea responsables y los asigna');
select is_empty(
  $$ delete from public.categorias returning id $$, 'miembro: no borra categorías');
select is_empty(
  $$ delete from public.responsables returning id $$, 'miembro: no borra responsables');
select is_empty(
  $$ delete from public.evidencias where id = '00000000-0000-0000-0000-000000000031' returning id $$,
  'miembro: no borra evidencias de otros');
select is_empty(
  $$ delete from public.ubicaciones where id = '00000000-0000-0000-0000-000000000012' returning id $$,
  'miembro: no borra lugares de otros');
select is_empty(
  $$ delete from storage.objects where name = 'estudio/foto-ana.jpg' returning id $$,
  'miembro: no borra archivos de otros');

-- Ana: borra lo suyo, pero no un lugar con estudios.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select isnt_empty(
  $$ delete from public.evidencias where id = '00000000-0000-0000-0000-000000000031' returning id $$,
  'autor: borra su evidencia');
select isnt_empty(
  $$ delete from storage.objects where name = 'estudio/foto-ana.jpg' returning id $$,
  'autor: borra su archivo');
select is_empty(
  $$ delete from public.ubicaciones where id = '00000000-0000-0000-0000-000000000011' returning id $$,
  'autor: no borra un lugar con estudios');
select isnt_empty(
  $$ delete from public.ubicaciones where id = '00000000-0000-0000-0000-000000000012' returning id $$,
  'autor: borra su lugar sin estudios');

-- Admin: borra catálogos y evidencias de otros.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
select isnt_empty(
  $$ delete from public.evidencias where id = '00000000-0000-0000-0000-000000000032' returning id $$,
  'admin: borra evidencias de otros');
select isnt_empty(
  $$ delete from public.categorias returning id $$, 'admin: borra categorías');
select isnt_empty(
  $$ delete from public.responsables returning id $$, 'admin: borra responsables');

-- Al desactivar a Beto pierde el acceso de inmediato, con el mismo token.
select public.desactivar_usuario('00000000-0000-0000-0000-0000000000b2');
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select is_empty($$ select id from public.ubicaciones $$, 'desactivado: deja de ver los datos de inmediato');
select is_empty(
  $$ update public.estudios set titulo = 'Cambio' returning id $$, 'desactivado: deja de editar de inmediato');

select * from finish();
rollback;
