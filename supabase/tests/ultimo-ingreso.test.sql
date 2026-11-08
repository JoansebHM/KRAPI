-- Pruebas de ultimos_accesos(): solo un admin activo ve cuándo ingresó cada cuenta (#163).
-- Se corren con `npm run db:test` sobre el Supabase local.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

-- Cuentas de prueba: un admin, un miembro activo y una cuenta pendiente que nunca ingresó.
insert into auth.users (id, email, raw_user_meta_data, last_sign_in_at) values
  ('00000000-0000-0000-0000-0000000000b1', 'admin.ingreso@usuarios.kira.invalid', '{"nombre": "Admin"}', '2026-11-01 15:30:00+00'),
  ('00000000-0000-0000-0000-0000000000b2', 'miembro.ingreso@usuarios.kira.invalid', '{"nombre": "Miembro"}', '2026-11-05 09:00:00+00'),
  ('00000000-0000-0000-0000-0000000000b3', 'pendiente.ingreso@usuarios.kira.invalid', '{"nombre": "Pendiente"}', null);
update public.perfiles set rol = 'admin', estado = 'activo' where id = '00000000-0000-0000-0000-0000000000b1';
update public.perfiles set estado = 'activo' where id = '00000000-0000-0000-0000-0000000000b2';

-- Admin.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
select is(
  (select ultimo_acceso from public.ultimos_accesos() where usuario_id = '00000000-0000-0000-0000-0000000000b2'),
  '2026-11-05 09:00:00+00'::timestamptz, 'admin: ve cuándo ingresó otra cuenta');
select is(
  (select ultimo_acceso from public.ultimos_accesos() where usuario_id = '00000000-0000-0000-0000-0000000000b1'),
  '2026-11-01 15:30:00+00'::timestamptz, 'admin: ve también su propio último ingreso');
select ok(
  exists (select 1 from public.ultimos_accesos() where usuario_id = '00000000-0000-0000-0000-0000000000b3' and ultimo_acceso is null),
  'admin: una cuenta que nunca ingresó sale con NULL');
select cmp_ok(
  (select count(*)::int from public.ultimos_accesos() where usuario_id in (
    '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b3')),
  '=', 3, 'admin: salen todas las cuentas, una vez cada una');

-- Miembro activo: no.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select throws_ok($$ select * from public.ultimos_accesos() $$, '42501', null, 'miembro: no ve los últimos ingresos');

-- Cuenta pendiente: no.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated"}';
select throws_ok($$ select * from public.ultimos_accesos() $$, '42501', null, 'pendiente: no ve los últimos ingresos');

-- Un admin desactivado pierde el acceso.
reset role;
update public.perfiles set estado = 'desactivado' where id = '00000000-0000-0000-0000-0000000000b1';
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
select throws_ok($$ select * from public.ultimos_accesos() $$, '42501', null, 'admin desactivado: ya no los ve');

-- Sin sesión: ni siquiera puede llamar a la función.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select * from public.ultimos_accesos() $$, '42501', null, 'anon: no puede llamar a la función');

-- Nadie lee auth.users directamente desde la app.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select throws_ok($$ select last_sign_in_at from auth.users $$, '42501', null, 'miembro: no lee auth.users');

select * from finish();
rollback;
