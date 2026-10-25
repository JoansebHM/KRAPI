-- Pruebas de autoría: quién creó, editó y archivó cada registro (#70).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@usuarios.kira.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'beto@usuarios.kira.invalid');
update public.perfiles set estado = 'activo' where usuario in ('ana', 'beto');

-- Ana crea un lugar y un estudio, e intenta hacerse pasar por Beto.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

insert into public.ubicaciones (id, tipo, geom, nombre, creado_por)
values ('00000000-0000-0000-0000-000000000001', 'punto',
        'SRID=4326;POINT(-75.5740 6.2130)', 'Tienda', '00000000-0000-0000-0000-0000000000b2');
insert into public.estudios (id, ubicacion_id, fecha, hora_inicio, hora_fin, titulo)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
        '2026-10-30', '14:00', '15:00', 'Entrevista');
insert into public.categorias (id, nombre) values ('00000000-0000-0000-0000-000000000003', 'Café');

select is(
  (select creado_por from public.ubicaciones where id = '00000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'creado_por es quien crea, aunque la app mande otro');
select is(
  (select actualizado_por from public.estudios where id = '00000000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'al crear, actualizado_por también es quien crea');
select is(
  (select creado_por from public.categorias where id = '00000000-0000-0000-0000-000000000003'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'los catálogos también guardan quién los creó');
select is(
  (select archivado_por from public.estudios where id = '00000000-0000-0000-0000-000000000002'),
  null, 'un estudio nuevo no tiene quién lo archivó');

-- Beto edita y archiva.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
update public.estudios set titulo = 'Entrevista al tendero', creado_por = auth.uid()
 where id = '00000000-0000-0000-0000-000000000002';

select is(
  (select creado_por from public.estudios where id = '00000000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'creado_por no cambia al editar');
select is(
  (select actualizado_por from public.estudios where id = '00000000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-0000000000b2'::uuid, 'actualizado_por es quien editó por última vez');

update public.estudios set archivado_en = now() where id = '00000000-0000-0000-0000-000000000002';
update public.ubicaciones set archivada_en = now() where id = '00000000-0000-0000-0000-000000000001';

select is(
  (select archivado_por from public.estudios where id = '00000000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-0000000000b2'::uuid, 'archivado_por es quien archivó el estudio');
select is(
  (select archivada_por from public.ubicaciones where id = '00000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-0000000000b2'::uuid, 'archivada_por es quien archivó el lugar');

-- Ana edita el estudio archivado: quien lo archivó no cambia.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
update public.estudios set notas = array['Notas'], archivado_por = auth.uid()
 where id = '00000000-0000-0000-0000-000000000002';

select is(
  (select archivado_por from public.estudios where id = '00000000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-0000000000b2'::uuid, 'editar un estudio archivado no cambia quién lo archivó');

-- Ana lo recupera.
update public.estudios set archivado_en = null where id = '00000000-0000-0000-0000-000000000002';
update public.ubicaciones set archivada_en = null where id = '00000000-0000-0000-0000-000000000001';

select is(
  (select archivado_por from public.estudios where id = '00000000-0000-0000-0000-000000000002'),
  null, 'al recuperar el estudio se limpia quién lo archivó');
select is(
  (select archivada_por from public.ubicaciones where id = '00000000-0000-0000-0000-000000000001'),
  null, 'al recuperar el lugar se limpia quién lo archivó');

-- Si se borra la cuenta, sus registros quedan sin autor.
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select creado_por from public.estudios where id = '00000000-0000-0000-0000-000000000002'),
  null, 'al borrar la cuenta, sus registros quedan sin autor');

select * from finish();
rollback;
