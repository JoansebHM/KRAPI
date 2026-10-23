-- =============================================================================
-- Bucket privado para los archivos de las evidencias
--
-- Privado: los archivos solo se leen con sesión, mediante URLs firmadas que expiran.
-- Ruta sugerida de cada archivo: <estudio_id>/<uuid>-<nombre_original>
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias',
  'evidencias',
  false,
  52428800, -- 50 MB, el máximo del plan gratuito
  array[
    -- Fotos
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    -- Audios (incluye los formatos que graban iPhone y Android)
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg',
    -- Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Solo usuarios autenticados pueden ver, subir, reemplazar y borrar archivos de este bucket.
create policy "Evidencias: autenticados leen" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidencias');

create policy "Evidencias: autenticados suben" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidencias');

create policy "Evidencias: autenticados reemplazan" on storage.objects
  for update to authenticated
  using (bucket_id = 'evidencias')
  with check (bucket_id = 'evidencias');

create policy "Evidencias: autenticados borran" on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidencias');
