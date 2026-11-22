-- Puntos y elementos fuera del polígono de Manila (#179, decisión 0040).
--
-- Hay lugares aledaños al barrio que también se registran como puntos. Solo las zonas (áreas del
-- barrio) siguen obligadas a quedar dentro de Manila. La app limita la navegación a 1 km alrededor
-- del barrio (decisión 0003), así que ese es el alcance práctico de los puntos.

alter table public.ubicaciones
  drop constraint ubicaciones_dentro_de_manila,
  add constraint ubicaciones_dentro_de_manila check (
    tipo <> 'zona' or extensions.st_coveredby(geom, public.limite_manila())
  );

comment on constraint ubicaciones_dentro_de_manila on public.ubicaciones is
  'Las zonas deben quedar dentro de Manila. Los puntos y elementos pueden quedar en cualquier parte.';
