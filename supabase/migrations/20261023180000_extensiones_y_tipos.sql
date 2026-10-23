-- =============================================================================
-- Extensiones, tipos y utilidades compartidas
-- =============================================================================

-- PostGIS permite guardar puntos y polígonos y hacer cálculos geográficos.
-- En Supabase las extensiones van en el esquema "extensions".
create extension if not exists postgis with schema extensions;

-- Mantiene la columna updated_at al día en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger: actualiza updated_at con la fecha y hora actual en cada UPDATE.';

-- Tipos de ubicación: un punto (un local) o una zona (un polígono).
create type public.tipo_ubicacion as enum ('punto', 'zona');

-- Tipos de evidencia de un estudio.
create type public.tipo_evidencia as enum ('foto', 'audio', 'documento', 'texto', 'video');

-- Dónde está guardado el archivo o el video de una evidencia.
-- Permite cambiar de proveedor en el futuro sin migrar lo que ya existe.
create type public.proveedor_almacenamiento as enum ('supabase', 'sharepoint', 'otro');
