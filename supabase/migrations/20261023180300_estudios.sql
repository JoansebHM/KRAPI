-- =============================================================================
-- Estudios: lo que se hizo en una ubicación en una fecha y franja horaria
-- =============================================================================

create table public.estudios (
  id uuid primary key default gen_random_uuid(),
  ubicacion_id uuid not null references public.ubicaciones (id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  titulo text not null,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint estudios_titulo_no_vacio check (length(trim(titulo)) > 0),
  -- La franja debe estar dentro del mismo día.
  constraint estudios_horas_validas check (hora_fin > hora_inicio)
);

comment on table public.estudios is
  'Estudios realizados en una ubicación. Varios por ubicación, en fechas distintas, para tener trazabilidad.';

-- Para mostrar la línea de tiempo de una ubicación (más recientes primero).
create index estudios_ubicacion_fecha_idx on public.estudios (ubicacion_id, fecha desc);

create trigger estudios_set_updated_at
  before update on public.estudios
  for each row execute function public.set_updated_at();


-- Un estudio puede tener varios responsables y un responsable varios estudios.
create table public.estudio_responsables (
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  responsable_id uuid not null references public.responsables (id) on delete cascade,
  primary key (estudio_id, responsable_id)
);

comment on table public.estudio_responsables is
  'Responsables de cada estudio. Si se elimina un responsable, desaparece de sus estudios.';

create index estudio_responsables_responsable_idx on public.estudio_responsables (responsable_id);
