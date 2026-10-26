-- =============================================================================
-- Ligar un estudio a la salida en la que se hizo (#106, decisión 0025)
--
-- La evidencia de una salida no es un sistema aparte: es la de siempre (estudios y
-- sus evidencias), solo que ahora un estudio puede decir en qué salida se hizo.
-- El reporte de avance (asignacion_participantes) sigue siendo aparte: es un
-- resumen rápido, no evidencia.
-- =============================================================================

alter table public.estudios
  add column salida_id uuid references public.salidas (id) on delete set null;

comment on column public.estudios.salida_id is
  'En qué salida se hizo este estudio (opcional). Si se borra la salida, el estudio no se pierde.';

-- Para la sección "Qué se registró" de la página de la salida.
create index estudios_salida_idx on public.estudios (salida_id) where salida_id is not null;
