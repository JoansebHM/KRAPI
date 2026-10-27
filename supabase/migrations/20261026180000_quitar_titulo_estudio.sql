-- =============================================================================
-- Quitar estudios.titulo: innecesario, un estudio ya se identifica por su fecha y hora
-- =============================================================================

alter table public.estudios
  drop constraint estudios_titulo_no_vacio,
  drop column titulo;
