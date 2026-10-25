-- =============================================================================
-- Solo las cuentas activas acceden a los datos (decisión 0021)
--
-- Reemplaza las políticas "Autenticados: acceso total" por las de la tabla de
-- permisos de la decisión 0021:
--   - Una cuenta pendiente, rechazada o desactivada no lee ni escribe nada.
--   - Un miembro activo ve, crea y edita todo.
--   - Borrar: categorías y responsables solo un admin; evidencias y lugares
--     sin estudios, quien los creó o un admin.
--
-- Las funciones se llaman como (select ...) para que Postgres las evalúe una
-- vez por consulta y no una vez por fila.
-- =============================================================================

drop policy "Autenticados: acceso total" on public.categorias;
drop policy "Autenticados: acceso total" on public.responsables;
drop policy "Autenticados: acceso total" on public.ubicaciones;
drop policy "Autenticados: acceso total" on public.estudios;
drop policy "Autenticados: acceso total" on public.estudio_responsables;
drop policy "Autenticados: acceso total" on public.evidencias;


-- 1. Catálogos: los miembros activos los usan y los editan; solo un admin los borra.
create policy "Activos: leer" on public.categorias
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Activos: crear" on public.categorias
  for insert to authenticated with check ((select public.es_miembro_activo()));
create policy "Activos: editar" on public.categorias
  for update to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));
create policy "Admins: borrar" on public.categorias
  for delete to authenticated using ((select public.es_admin()));

create policy "Activos: leer" on public.responsables
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Activos: crear" on public.responsables
  for insert to authenticated with check ((select public.es_miembro_activo()));
create policy "Activos: editar" on public.responsables
  for update to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));
create policy "Admins: borrar" on public.responsables
  for delete to authenticated using ((select public.es_admin()));


-- 2. Lugares: se archivan. Solo se borra de verdad un lugar sin estudios, y
--    solo lo borra quien lo creó o un admin.
create policy "Activos: leer" on public.ubicaciones
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Activos: crear" on public.ubicaciones
  for insert to authenticated with check ((select public.es_miembro_activo()));
create policy "Activos: editar" on public.ubicaciones
  for update to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));
create policy "Autor o admin: borrar si no tiene estudios" on public.ubicaciones
  for delete to authenticated
  using (
    ((select public.es_admin()) or (creado_por = (select auth.uid()) and (select public.es_miembro_activo())))
    and not exists (select 1 from public.estudios e where e.ubicacion_id = ubicaciones.id)
  );


-- 3. Estudios: se archivan. Quien lo creó (o un admin) puede borrarlo; la app
--    lo usa para deshacer un estudio recién creado si fallan sus responsables.
create policy "Activos: leer" on public.estudios
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Activos: crear" on public.estudios
  for insert to authenticated with check ((select public.es_miembro_activo()));
create policy "Activos: editar" on public.estudios
  for update to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));
create policy "Autor o admin: borrar" on public.estudios
  for delete to authenticated
  using ((select public.es_admin()) or (creado_por = (select auth.uid()) and (select public.es_miembro_activo())));

-- Los responsables de un estudio se cambian al editarlo (se borran y se vuelven a crear).
create policy "Activos: acceso total" on public.estudio_responsables
  for all to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));


-- 4. Evidencias: una evidencia equivocada la borra quien la subió o un admin.
create policy "Activos: leer" on public.evidencias
  for select to authenticated using ((select public.es_miembro_activo()));
create policy "Activos: crear" on public.evidencias
  for insert to authenticated with check ((select public.es_miembro_activo()));
create policy "Activos: editar" on public.evidencias
  for update to authenticated
  using ((select public.es_miembro_activo())) with check ((select public.es_miembro_activo()));
create policy "Autor o admin: borrar" on public.evidencias
  for delete to authenticated
  using ((select public.es_admin()) or (creado_por = (select auth.uid()) and (select public.es_miembro_activo())));


-- 5. Bucket "evidencias". Al borrar una evidencia, la app borra primero la fila y
--    después el archivo, así que cuando llega a borrar el archivo la fila ya no
--    existe. Por eso el permiso de borrar se revisa con el dueño del archivo
--    (owner_id, que Storage llena con quien lo subió), que es quien creó la evidencia.
drop policy "Evidencias: autenticados leen" on storage.objects;
drop policy "Evidencias: autenticados suben" on storage.objects;
drop policy "Evidencias: autenticados reemplazan" on storage.objects;
drop policy "Evidencias: autenticados borran" on storage.objects;

create policy "Evidencias: activos leen" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidencias' and (select public.es_miembro_activo()));

create policy "Evidencias: activos suben" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidencias' and (select public.es_miembro_activo()));

create policy "Evidencias: activos reemplazan" on storage.objects
  for update to authenticated
  using (bucket_id = 'evidencias' and (select public.es_miembro_activo()))
  with check (bucket_id = 'evidencias' and (select public.es_miembro_activo()));

create policy "Evidencias: autor o admin borran" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'evidencias'
    and ((select public.es_admin()) or (owner_id = (select auth.uid())::text and (select public.es_miembro_activo())))
  );

-- lugares_mapa(), ubicaciones_en_zona() y ubicaciones_cercanas() corren con los
-- permisos de quien llama, así que estas políticas ya las cubren: a una cuenta
-- que no está activa no le devuelven nada.
