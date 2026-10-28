-- Pruebas de los bocetos: dibujos sobre el mapa guardados como imagen (#129).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

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

insert into public.bocetos (id, titulo, descripcion, trazos, imagen_path, miniatura_path, ancho, alto) values
  ('00000000-0000-0000-0000-0000000000b1', '  Ruta del bus 133 ', 'Por la 10',
   '{"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"color": "#E5484D", "grosor": 4}, "geometry": {"type": "LineString", "coordinates": [[-75.574, 6.213], [-75.573, 6.2131]]}}]}',
   'bocetos/00000000-0000-0000-0000-0000000000b1/imagen.png', 'bocetos/00000000-0000-0000-0000-0000000000b1/miniatura.jpg', 780, 1200);

select is(
  (select creado_por from public.bocetos where id = '00000000-0000-0000-0000-0000000000b1'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'el boceto lleva a su autora');

-- Reglas de los datos.
select throws_ok(
  $$ insert into public.bocetos (titulo, imagen_path, miniatura_path, ancho, alto) values ('   ', 'a.png', 'a.jpg', 10, 10) $$,
  '23514', null, 'el título no puede quedar vacío');
select throws_ok(
  $$ insert into public.bocetos (titulo, trazos, imagen_path, miniatura_path, ancho, alto) values ('Sin forma', '[]', 'b.png', 'b.jpg', 10, 10) $$,
  '23514', null, 'los trazos son una FeatureCollection');
select throws_ok(
  $$ insert into public.bocetos (titulo, imagen_path, miniatura_path, ancho, alto) values ('Sin medidas', 'c.png', 'c.jpg', 0, 10) $$,
  '23514', null, 'la imagen tiene medidas');
select throws_ok(
  $$ insert into public.bocetos (titulo, imagen_path, miniatura_path, ancho, alto)
     values ('Repetido', 'bocetos/00000000-0000-0000-0000-0000000000b1/imagen.png', 'd.jpg', 10, 10) $$,
  '23505', null, 'dos bocetos no comparten imagen');

-- Un boceto no se edita.
select throws_ok(
  $$ update public.bocetos set titulo = 'Otro' where id = '00000000-0000-0000-0000-0000000000b1' $$,
  '42501', null, 'nadie edita un boceto');

-- Quién lo ve y quién lo borra.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select is((select count(*)::int from public.bocetos), 1, 'otra cuenta activa lo ve');
delete from public.bocetos where id = '00000000-0000-0000-0000-0000000000b1';
select is((select count(*)::int from public.bocetos), 1, 'pero no lo borra');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated"}';
select is((select count(*)::int from public.bocetos), 0, 'una cuenta pendiente no ve nada');

-- La bitácora la lee un admin.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}';
select ok(
  exists (select 1 from public.bitacora where tabla = 'bocetos' and accion = 'crear'),
  'crear un boceto queda en la bitácora');

delete from public.bocetos where id = '00000000-0000-0000-0000-0000000000b1';
select is((select count(*)::int from public.bocetos), 0, 'un admin lo borra');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
insert into public.bocetos (id, titulo, imagen_path, miniatura_path, ancho, alto)
values ('00000000-0000-0000-0000-0000000000b9', 'Mío', 'e.png', 'e.jpg', 10, 10);
delete from public.bocetos where id = '00000000-0000-0000-0000-0000000000b9';
select is((select count(*)::int from public.bocetos), 0, 'su autora lo borra');

select * from finish();
rollback;
