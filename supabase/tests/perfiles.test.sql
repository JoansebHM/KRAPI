-- Pruebas de perfiles, roles, estados y funciones de administración (#69).
-- Se corren con `npm run db:test` sobre el Supabase local.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(30);

-- Cuentas de prueba. El trigger crea cada perfil en "pendiente".
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin.uno@usuarios.kira.invalid', '{"nombre": "Admin Uno"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@usuarios.kira.invalid', '{"nombre": "Ana", "avatar_semilla": "lapiz-7"}'),
  ('00000000-0000-0000-0000-00000000000c', 'pepe@usuarios.kira.invalid', '{}');
update public.perfiles set rol = 'admin', estado = 'activo'
 where id = '00000000-0000-0000-0000-00000000000a';

select is(
  (select estado::text from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'),
  'pendiente', 'una cuenta nueva queda pendiente');
select is(
  (select rol::text from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'),
  'miembro', 'una cuenta nueva es miembro');
select is(
  (select nombre from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'),
  'Ana', 'el nombre sale de los metadatos del registro');
select is(
  (select nombre from public.perfiles where id = '00000000-0000-0000-0000-00000000000c'),
  'pepe', 'sin nombre en los metadatos se usa el nombre de usuario');
select is(
  (select avatar_semilla from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'),
  'lapiz-7', 'el avatar sale de los metadatos del registro');

select throws_ok(
  $$ insert into auth.users (id, email) values (gen_random_uuid(), 'alguien@gmail.com') $$,
  '22023', null, 'no se crean cuentas con un correo que no sea interno');
select throws_ok(
  $$ insert into auth.users (id, email) values (gen_random_uuid(), 'Ana@usuarios.kira.invalid') $$,
  '23505', null, 'el nombre de usuario es único sin distinguir mayúsculas');
select throws_ok(
  $$ insert into auth.users (id, email) values (gen_random_uuid(), 'a b@usuarios.kira.invalid') $$,
  '23514', null, 'el nombre de usuario respeta el formato');
select throws_ok(
  $$ update auth.users set email = 'otra@usuarios.kira.invalid' where id = '00000000-0000-0000-0000-00000000000b' $$,
  '22023', null, 'el correo interno no se puede cambiar');

-- Sin sesión: solo la disponibilidad del nombre de usuario.
set local role anon;
select is(public.usuario_disponible('ANA'), false, 'anon: un nombre de usuario tomado no está disponible');
select is(public.usuario_disponible('nueva'), true, 'anon: un nombre de usuario libre está disponible');
select throws_ok($$ select * from public.perfiles $$, '42501', null, 'anon: no lee perfiles');

-- Cuenta pendiente.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is(public.es_miembro_activo(), false, 'pendiente: no es miembro activo');
select results_eq(
  $$ select usuario from public.perfiles $$, $$ values ('ana') $$,
  'pendiente: solo ve su propio perfil');
select is_empty(
  $$ update public.perfiles set nombre = 'Ana María' where id = auth.uid() returning id $$,
  'pendiente: no edita su perfil');
select throws_ok(
  $$ update public.perfiles set estado = 'activo' where id = auth.uid() $$,
  '42501', null, 'nadie cambia su propio estado');
select throws_ok(
  $$ select public.aprobar_usuario('00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'pendiente: no aprueba cuentas');

-- Admin.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(public.es_admin(), true, 'admin: es admin');
select is(
  (public.aprobar_usuario('00000000-0000-0000-0000-00000000000b')).estado::text,
  'activo', 'admin: aprueba una cuenta pendiente');
select is(
  (select aprobado_por from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'),
  '00000000-0000-0000-0000-00000000000a'::uuid, 'se guarda quién aprobó');
select is(
  (public.rechazar_usuario('00000000-0000-0000-0000-00000000000c')).estado::text,
  'rechazado', 'admin: rechaza una cuenta pendiente');
select throws_ok(
  $$ select public.desactivar_usuario('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'un admin no se desactiva a sí mismo');
select throws_ok(
  $$ select public.cambiar_rol('00000000-0000-0000-0000-00000000000a', 'miembro') $$,
  '42501', null, 'un admin no se quita el rol a sí mismo');
select is(
  (public.cambiar_rol('00000000-0000-0000-0000-00000000000b', 'admin')).rol::text,
  'admin', 'admin: nombra a otro admin');
select is(
  (public.cambiar_rol('00000000-0000-0000-0000-00000000000b', 'miembro')).rol::text,
  'miembro', 'admin: quita el rol de admin');

-- Miembro activo.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is(
  (select count(*)::int from public.perfiles where usuario in ('admin.uno', 'ana', 'pepe')), 3,
  'activo: ve todos los perfiles');
select isnt_empty(
  $$ update public.perfiles set nombre = 'Ana María' where id = auth.uid() returning id $$,
  'activo: edita su nombre');
select isnt_empty(
  $$ update public.perfiles set avatar_semilla = 'otra-semilla' where id = auth.uid() returning id $$,
  'activo: cambia su avatar');
select throws_ok(
  $$ update public.perfiles set rol = 'admin' where id = auth.uid() $$,
  '42501', null, 'nadie cambia su propio rol');

-- Desactivar cierra sus sesiones.
reset role;
insert into auth.sessions (id, user_id) values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000b');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select public.desactivar_usuario('00000000-0000-0000-0000-00000000000b');
reset role;
select is(
  (select count(*)::int from auth.sessions where user_id = '00000000-0000-0000-0000-00000000000b'),
  0, 'desactivar una cuenta cierra sus sesiones');

select * from finish();
rollback;
