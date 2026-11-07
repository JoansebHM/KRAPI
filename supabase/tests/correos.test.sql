-- Pruebas del correo de contacto y de los avisos por correo (#159).
-- Se corren con `npm run db:test` sobre el Supabase local.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(21);

-- Cuentas de prueba. El trigger crea cada perfil en "pendiente".
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin.uno@usuarios.kira.invalid', '{"nombre": "Admin Uno"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@usuarios.kira.invalid', '{"nombre": "Ana", "correo_contacto": "  Ana@Correo.COM "}'),
  ('00000000-0000-0000-0000-00000000000c', 'pepe@usuarios.kira.invalid', '{"nombre": "Pepe", "correo_contacto": "esto-no-es-un-correo"}'),
  ('00000000-0000-0000-0000-00000000000d', 'luis@usuarios.kira.invalid', '{"nombre": "Luis"}');
update public.perfiles set rol = 'admin', estado = 'activo' where id = '00000000-0000-0000-0000-00000000000a';
update public.perfiles set estado = 'activo' where id = '00000000-0000-0000-0000-00000000000b';

-- Registro: el correo viaja en los metadatos.
select is(
  (select correo from public.contactos where perfil_id = '00000000-0000-0000-0000-00000000000b'),
  'ana@correo.com', 'el correo del registro se guarda en minúsculas y sin espacios');
select is_empty(
  $$ select 1 from public.contactos where perfil_id = '00000000-0000-0000-0000-00000000000c' $$,
  'un correo mal escrito no se guarda, pero la cuenta se crea');
select is(
  (select count(*)::int from public.perfiles where id = '00000000-0000-0000-0000-00000000000c'),
  1, 'un correo mal escrito no impide crear la cuenta');
select is_empty(
  $$ select 1 from public.contactos where perfil_id = '00000000-0000-0000-0000-00000000000d' $$,
  'sin correo en el registro no hay contacto');

-- La tabla no acepta correos inválidos aunque se escriba directo.
select throws_ok(
  $$ insert into public.contactos (perfil_id, correo) values ('00000000-0000-0000-0000-00000000000d', 'Luis@Correo.com') $$,
  '23514', null, 'la tabla exige el correo en minúsculas');
select throws_ok(
  $$ insert into public.contactos (perfil_id, correo) values ('00000000-0000-0000-0000-00000000000d', 'sin-arroba') $$,
  '23514', null, 'la tabla exige un formato de correo');

-- Los avisos no rompen nada, tenga o no configurada la función en Vault.
select lives_ok(
  $$ select public.avisar_por_correo('registro_pendiente', '00000000-0000-0000-0000-00000000000d') $$,
  'avisar sin configuración en Vault no falla');
select lives_ok(
  $$ update public.perfiles set estado = 'rechazado' where id = '00000000-0000-0000-0000-00000000000d' $$,
  'rechazar una cuenta no falla aunque no se pueda avisar');
select lives_ok(
  $$ update public.perfiles set estado = 'activo' where id = '00000000-0000-0000-0000-00000000000d' $$,
  'aprobar una cuenta rechazada no falla aunque no se pueda avisar');

-- La Edge Function lee contactos con la clave secreta (service_role). Con "Automatically expose new
-- tables" desactivado necesita el permiso explícito; sin él, la función no encontraba destinatarios.
select ok(has_table_privilege('service_role', 'public.contactos', 'select'), 'service_role lee contactos');

-- Sin sesión.
set local role anon;
select throws_ok($$ select * from public.contactos $$, '42501', null, 'anon: no lee contactos');
select throws_ok($$ select public.guardar_correo('a@b.co') $$, '42501', null, 'anon: no guarda correo');

-- Cuenta pendiente: no puede guardar correo.
reset role;
update public.perfiles set estado = 'pendiente' where id = '00000000-0000-0000-0000-00000000000d';
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok($$ select public.guardar_correo('luis@correo.com') $$, '42501', null, 'pendiente: no guarda correo');

-- Miembro activo.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select correo from public.contactos $$, $$ values ('ana@correo.com') $$,
  'activo: lee solo su correo');
select lives_ok(
  $$ select public.guardar_correo('  OTRO@Correo.com ') $$, 'activo: cambia su correo');
select is(
  (select correo from public.contactos), 'otro@correo.com', 'el correo cambiado queda normalizado');
select throws_ok(
  $$ select public.guardar_correo('no-es-correo') $$, '22023', null, 'activo: no guarda un correo inválido');
select throws_ok(
  $$ insert into public.contactos (perfil_id, correo) values (auth.uid(), 'x@y.co') $$,
  '42501', null, 'activo: no escribe directo en contactos');
select lives_ok($$ select public.guardar_correo('') $$, 'activo: quita su correo con un texto vacío');
select is_empty($$ select 1 from public.contactos $$, 'sin correo no queda contacto');

-- Un admin tampoco lee el correo de otra cuenta desde la app (solo la Edge Function con la clave secreta).
reset role;
insert into public.contactos (perfil_id, correo) values ('00000000-0000-0000-0000-00000000000d', 'luis@correo.com');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is_empty($$ select 1 from public.contactos $$, 'admin: no lee el correo de otras cuentas');

select * from finish();
rollback;
