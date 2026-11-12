-- Pruebas del cronograma: fragmentos del calendario con su checklist (decisión 0039).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'beto@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'pepe@usuarios.kira.invalid');
update public.perfiles set estado = 'activo', rol = 'admin' where usuario = 'admin';
update public.perfiles set estado = 'activo' where usuario in ('ana', 'beto');
-- pepe queda pendiente.

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

insert into public.cronograma_fragmentos (id, titulo, fecha_inicio, fecha_fin)
values ('00000000-0000-0000-0000-0000000000f1', null, '2026-11-03', '2026-11-12');
insert into public.cronograma_tareas (id, fragmento_id, texto)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', 'Visitar la calle 10');

select is((select creado_por from public.cronograma_fragmentos where id = '00000000-0000-0000-0000-0000000000f1'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'el fragmento lleva a su autora');
select is((select count(*)::int from public.cronograma_tarea_responsables where tarea_id = '00000000-0000-0000-0000-0000000000e1'),
  0, 'los responsables son opcionales');

-- Reglas de los datos.
select throws_ok(
  $$ insert into public.cronograma_fragmentos (fecha_inicio, fecha_fin) values ('2026-11-10', '2026-11-09') $$,
  '23514', null, 'la fecha de fin no puede ser antes de la de inicio');
select lives_ok(
  $$ insert into public.cronograma_fragmentos (fecha_inicio, fecha_fin) values ('2026-11-05', '2026-11-05') $$,
  'un fragmento puede durar un solo día');
select lives_ok(
  $$ insert into public.cronograma_fragmentos (titulo, fecha_inicio, fecha_fin) values ('Solapado', '2026-11-10', '2026-11-20') $$,
  'los fragmentos pueden solaparse');
select throws_ok(
  $$ insert into public.cronograma_fragmentos (titulo, fecha_inicio, fecha_fin) values ('   ', '2026-11-10', '2026-11-20') $$,
  '23514', null, 'el título, si se pone, no puede quedar vacío');
select throws_ok(
  $$ insert into public.cronograma_tareas (fragmento_id, texto) values ('00000000-0000-0000-0000-0000000000f1', '   ') $$,
  '23514', null, 'el texto de una tarea no puede quedar vacío');

-- Quién marcó la tarea como hecha lo pone la base de datos.
update public.cronograma_tareas set hecha_en = now(), hecha_por = '00000000-0000-0000-0000-0000000000b2'
 where id = '00000000-0000-0000-0000-0000000000e1';
select is((select hecha_por from public.cronograma_tareas where id = '00000000-0000-0000-0000-0000000000e1'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'hecha_por es quien la marca, aunque se intente poner a otra cuenta');

update public.cronograma_tareas set hecha_en = null where id = '00000000-0000-0000-0000-0000000000e1';
select is((select hecha_por from public.cronograma_tareas where id = '00000000-0000-0000-0000-0000000000e1'),
  null, 'al desmarcarla se limpia quién la marcó');

-- Todas las cuentas activas ven y editan lo de las demás.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select is((select count(*)::int from public.cronograma_tareas), 1, 'otra cuenta activa ve las tareas');
update public.cronograma_tareas set hecha_en = now() where id = '00000000-0000-0000-0000-0000000000e1';
select is((select hecha_por from public.cronograma_tareas where id = '00000000-0000-0000-0000-0000000000e1'),
  '00000000-0000-0000-0000-0000000000b2'::uuid, 'otra cuenta activa la marca como hecha');

-- Una tarea puede tener varios responsables, pero cada cuenta una sola vez.
select lives_ok(
  $$ insert into public.cronograma_tarea_responsables (tarea_id, usuario_id)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1'),
            ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b2') $$,
  'una tarea tiene varios responsables');
select is((select count(*)::int from public.cronograma_tarea_responsables where tarea_id = '00000000-0000-0000-0000-0000000000e1'),
  2, 'los dos responsables quedan guardados');
select throws_ok(
  $$ insert into public.cronograma_tarea_responsables (tarea_id, usuario_id)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1') $$,
  '23505', null, 'una cuenta no se repite en la misma tarea');

-- Una cuenta pendiente no ve nada.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated"}';
select is((select count(*)::int from public.cronograma_fragmentos), 0, 'una cuenta pendiente no ve los fragmentos');

-- La bitácora la lee un admin.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
select ok(
  exists (select 1 from public.bitacora where tabla = 'cronograma_tareas' and accion = 'crear'),
  'crear una tarea queda en la bitácora');
select ok(
  exists (select 1 from public.bitacora
           where tabla = 'cronograma_tarea_responsables' and registro_id = '00000000-0000-0000-0000-0000000000e1' and accion = 'crear'),
  'poner un responsable queda en la bitácora con el id de la tarea');

-- Si se borra una cuenta responsable, deja de figurar en la tarea; las demás se quedan.
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000b2';
select is((select count(*)::int from public.cronograma_tarea_responsables where tarea_id = '00000000-0000-0000-0000-0000000000e1'),
  1, 'al borrar una cuenta responsable, la tarea conserva a las demás');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
delete from public.cronograma_fragmentos where id = '00000000-0000-0000-0000-0000000000f1';
select is((select count(*)::int from public.cronograma_tareas where fragmento_id = '00000000-0000-0000-0000-0000000000f1'), 0,
  'borrar un fragmento borra sus tareas');
select is((select count(*)::int from public.cronograma_tarea_responsables), 0,
  'y se lleva también a los responsables de esas tareas');

select * from finish();
rollback;
