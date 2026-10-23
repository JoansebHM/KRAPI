-- =============================================================================
-- Catálogos: categorías de ubicaciones y responsables de estudios
-- =============================================================================

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  -- Color para pintar los marcadores y zonas en el mapa, en formato #RRGGBB.
  color text not null default '#0478FB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categorias_nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint categorias_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

comment on table public.categorias is 'Tipos de lugar: comercio, hotelería, café, etc.';

-- No se permiten dos categorías con el mismo nombre (sin importar mayúsculas ni espacios).
create unique index categorias_nombre_unico on public.categorias (lower(trim(nombre)));

create trigger categorias_set_updated_at
  before update on public.categorias
  for each row execute function public.set_updated_at();


create table public.responsables (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint responsables_nombre_no_vacio check (length(trim(nombre)) > 0)
);

comment on table public.responsables is 'Personas que pueden figurar como responsables de un estudio.';

create unique index responsables_nombre_unico on public.responsables (lower(trim(nombre)));

create trigger responsables_set_updated_at
  before update on public.responsables
  for each row execute function public.set_updated_at();
