-- Pruebas de la bitácora de acciones (#72).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'pepe@usuarios.kira.invalid');
update public.perfiles set estado = 'activo' where usuario in ('admin', 'ana');
update public.perfiles set rol = 'admin' where usuario = 'admin';

-- Ana trabaja con un estudio.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

insert into public.ubicaciones (id, tipo, geom, nombre)
values ('00000000-0000-0000-0000-000000000011', 'punto', 'SRID=4326;POINT(-75.5740 6.2130)', 'Tienda');
insert into public.estudios (id, ubicacion_id, fecha, hora_inicio, hora_fin, titulo)
values ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011',
        '2026-10-30', '14:00', '15:00', 'Entrevista');
insert into public.responsables (id, nombre) values ('00000000-0000-0000-0000-000000000031', 'Ana');
insert into public.estudio_responsables (estudio_id, responsable_id)
values ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000031');
update public.estudios set titulo = 'Entrevista al tendero' where id = '00000000-0000-0000-0000-000000000021';
update public.estudios set archivado_en = now() where id = '00000000-0000-0000-0000-000000000021';
update public.estudios set archivado_en = null where id = '00000000-0000-0000-0000-000000000021';
insert into public.evidencias (id, estudio_id, tipo, texto)
values ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000021', 'texto', 'Nota equivocada');
delete from public.evidencias where id = '00000000-0000-0000-0000-000000000041';

-- Un miembro no la lee ni la escribe.
select is_empty($$ select id from public.bitacora $$, 'miembro: no lee la bitácora');
select throws_ok(
  $$ insert into public.bitacora (tabla, registro_id, accion) values ('x', gen_random_uuid(), 'crear') $$,
  '42501', null, 'miembro: no escribe en la bitácora');

-- El admin aprueba a Pepe y revisa la bitácora.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
select public.aprobar_usuario('00000000-0000-0000-0000-0000000000c3');

select results_eq(
  $$ select accion::text from public.bitacora
     where registro_id = '00000000-0000-0000-0000-000000000021' and tabla = 'estudios' order by id $$,
  $$ values ('crear'), ('editar'), ('archivar'), ('recuperar') $$,
  'registra crear, editar, archivar y recuperar un estudio');
select is(
  (select cambios -> 'titulo' from public.bitacora
    where tabla = 'estudios' and accion = 'editar'),
  '{"antes": "Entrevista", "despues": "Entrevista al tendero"}'::jsonb,
  'al editar guarda el valor de antes y el de después');
select is(
  (select array_agg(campo order by campo) from public.bitacora, jsonb_object_keys(cambios) campo
    where tabla = 'estudios' and accion = 'editar'),
  array['titulo'], 'al editar solo guarda los campos que cambiaron');
select is(
  (select cambios ->> 'titulo' from public.bitacora where tabla = 'estudios' and accion = 'crear'),
  'Entrevista', 'al crear guarda los campos del registro');
select ok(
  not exists (select 1 from public.bitacora where tabla = 'estudios' and accion = 'crear' and cambios ? 'creado_por'),
  'no guarda las columnas que mantiene la base de datos');
select is(
  (select usuario_id from public.bitacora where tabla = 'estudios' and accion = 'archivar'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'guarda quién hizo la acción');
select is(
  (select registro_id from public.bitacora where tabla = 'estudio_responsables'),
  '00000000-0000-0000-0000-000000000021'::uuid, 'los responsables de un estudio se registran con el id del estudio');
select is(
  (select registro_borrado ->> 'texto' from public.bitacora where tabla = 'evidencias' and accion = 'borrar'),
  'Nota equivocada', 'al borrar guarda una copia del registro');
select is(
  (select cambios -> 'estado' from public.bitacora where tabla = 'perfiles' and registro_id = '00000000-0000-0000-0000-0000000000c3'),
  '{"antes": "pendiente", "despues": "activo"}'::jsonb, 'registra los cambios de estado de las cuentas');
select is(
  (select usuario_id from public.bitacora where tabla = 'perfiles' and registro_id = '00000000-0000-0000-0000-0000000000c3'),
  '00000000-0000-0000-0000-0000000000ad'::uuid, 'guarda qué admin cambió la cuenta');

-- Cambiar el nombre propio no se registra; nadie edita ni borra la bitácora.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
update public.perfiles set nombre = 'Ana María' where id = auth.uid();
reset role;
select is(
  (select count(*)::int from public.bitacora
    where tabla = 'perfiles' and registro_id = '00000000-0000-0000-0000-0000000000a1' and cambios ? 'nombre'), 0,
  'los cambios de nombre del perfil no se registran');
select throws_ok(
  $$ update public.bitacora set accion = 'crear' $$, '42501', null, 'nadie edita la bitácora');
select throws_ok(
  $$ delete from public.bitacora $$, '42501', null, 'nadie borra filas de la bitácora');
select throws_ok(
  $$ truncate public.bitacora $$, '42501', null, 'nadie vacía la bitácora');

select * from finish();
rollback;
