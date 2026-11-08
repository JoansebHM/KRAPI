-- Pruebas de las políticas del canal de presencia (#161).
-- Se corren con `npm run db:test` sobre el Supabase local. Realtime no corre en el local, pero sí
-- existe la tabla realtime.messages, que es la que consulta para decidir quién entra a un canal
-- privado. (db:test recrea la base antes, así que las particiones del día existen.)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

-- Cuentas de prueba: una activa y una pendiente.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'activa@usuarios.kira.invalid', '{"nombre": "Activa"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'pendiente@usuarios.kira.invalid', '{"nombre": "Pendiente"}');
update public.perfiles set estado = 'activo' where id = '00000000-0000-0000-0000-0000000000a1';

-- Cuenta activa en el canal de presencia.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local "realtime.topic" = 'presencia';

select lives_ok(
  $$ insert into realtime.messages (topic, extension, private) values ('presencia', 'presence', true) $$,
  'activa: se anuncia en el canal de presencia');
select cmp_ok(
  (select count(*)::int from realtime.messages where extension = 'presence'), '>=', 1,
  'activa: ve la presencia del canal');
select throws_ok(
  $$ insert into realtime.messages (topic, extension, private) values ('presencia', 'broadcast', true) $$,
  '42501', null, 'activa: no puede mandar otros mensajes que no sean de presencia');

set local "realtime.topic" = 'otro-canal';
select throws_ok(
  $$ insert into realtime.messages (topic, extension, private) values ('otro-canal', 'presence', true) $$,
  '42501', null, 'activa: no se anuncia en un canal que no sea el de presencia');
select is_empty(
  $$ select 1 from realtime.messages where topic = 'presencia' $$,
  'activa: con otro tópico no ve la presencia');

-- Cuenta pendiente.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}';
set local "realtime.topic" = 'presencia';
select throws_ok(
  $$ insert into realtime.messages (topic, extension, private) values ('presencia', 'presence', true) $$,
  '42501', null, 'pendiente: no se anuncia en el canal de presencia');
select is_empty(
  $$ select 1 from realtime.messages where extension = 'presence' $$,
  'pendiente: no ve quién está en línea');

-- Sin sesión.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ insert into realtime.messages (topic, extension, private) values ('presencia', 'presence', true) $$,
  '42501', null, 'anon: no se anuncia en el canal de presencia');
select is_empty(
  $$ select 1 from realtime.messages where extension = 'presence' $$,
  'anon: no ve quién está en línea');

-- Desactivar a alguien le quita el acceso en la siguiente comprobación.
reset role;
update public.perfiles set estado = 'desactivado' where id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local "realtime.topic" = 'presencia';
select is_empty(
  $$ select 1 from realtime.messages where extension = 'presence' $$,
  'desactivada: pierde el acceso al canal');

select * from finish();
rollback;
