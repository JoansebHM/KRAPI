-- =============================================================================
-- Evidencias: archivos, textos y videos asociados a un estudio
-- =============================================================================

create table public.evidencias (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  tipo public.tipo_evidencia not null,
  titulo text,

  -- Una evidencia es exactamente UNA de estas tres cosas:
  -- 1. Un archivo subido (ruta dentro del bucket)
  archivo_path text unique,
  archivo_nombre text,
  archivo_mime text,
  archivo_bytes bigint,
  -- 2. Un texto escrito en la app
  texto text,
  -- 3. Un enlace externo (por ejemplo, un video de SharePoint)
  url_externa text,

  -- Dónde vive el archivo o el enlace. NULL para textos escritos en la app.
  proveedor public.proveedor_almacenamiento,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint evidencias_un_solo_contenido check (num_nonnulls(archivo_path, texto, url_externa) = 1),
  constraint evidencias_archivo_completo check (
    archivo_path is null
    or (archivo_nombre is not null and archivo_mime is not null and archivo_bytes > 0)
  ),
  constraint evidencias_url_valida check (url_externa is null or url_externa ~* '^https?://'),
  constraint evidencias_proveedor_coherente check ((texto is null) = (proveedor is not null)),
  -- Qué contenido admite cada tipo.
  constraint evidencias_contenido_segun_tipo check (
    (tipo in ('foto', 'audio', 'documento') and archivo_path is not null)
    or (tipo = 'texto' and (texto is not null or archivo_path is not null))
    or (tipo = 'video' and (url_externa is not null or archivo_path is not null))
  )
);

comment on table public.evidencias is
  'Evidencias de un estudio. Al borrar el estudio se borran sus filas; los archivos del bucket los borra la app.';

create index evidencias_estudio_idx on public.evidencias (estudio_id);

create trigger evidencias_set_updated_at
  before update on public.evidencias
  for each row execute function public.set_updated_at();
