-- =============================================================================
-- Que una zona asignada sepa a qué zona del mapa corresponde (#111)
--
-- Varias salidas pueden cubrir el mismo cuadrante en fechas distintas: cada una tiene su
-- propia asignación (su propio reporte), pero si ese cuadrante ya se convirtió en una zona
-- del mapa, conviene que las siguientes asignaciones lo sepan en vez de crear otra zona
-- igual. zona_id es ese vínculo: opcional, y se llena la primera vez que se registra.
-- =============================================================================

alter table public.asignaciones
  add column zona_id uuid references public.ubicaciones (id) on delete set null;

comment on column public.asignaciones.zona_id is
  'La zona del mapa a la que corresponde este cuadrante, si ya se registró como tal. NULL mientras no se haya hecho.';

create index asignaciones_zona_idx on public.asignaciones (zona_id) where zona_id is not null;

-- zona_id debe apuntar a una zona, no a un punto.
create or replace function public.validar_zona_de_asignacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.zona_id is not null and not exists (
    select 1 from public.ubicaciones where id = new.zona_id and tipo = 'zona'
  ) then
    raise exception 'asignaciones.zona_id debe apuntar a una zona (ubicaciones.tipo = ''zona'')';
  end if;
  return new;
end;
$$;

create trigger asignaciones_validar_zona
  before insert or update of zona_id on public.asignaciones
  for each row execute function public.validar_zona_de_asignacion();
