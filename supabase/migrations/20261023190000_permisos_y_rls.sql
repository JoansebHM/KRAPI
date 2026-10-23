-- =============================================================================
-- Permisos y Row Level Security
--
-- Regla de KRAPI: quien inició sesión (rol authenticated) puede leer y modificar
-- todo; sin sesión (rol anon) no se puede ver ni tocar nada.
--
-- El proyecto tiene desactivado "Automatically expose new tables", así que cada
-- tabla nueva debe recibir sus permisos explícitamente aquí o en una migración nueva.
-- =============================================================================

-- 1. Permisos de tabla (qué roles pueden siquiera intentar leer o escribir).
revoke all on table
  public.categorias,
  public.responsables,
  public.ubicaciones,
  public.estudios,
  public.estudio_responsables,
  public.evidencias
from anon, authenticated;

grant select, insert, update, delete on table
  public.categorias,
  public.responsables,
  public.ubicaciones,
  public.estudios,
  public.estudio_responsables,
  public.evidencias
to authenticated;

-- 2. Funciones: el límite del barrio lo puede consultar la app con sesión;
--    la función del trigger no la necesita llamar nadie directamente.
revoke execute on function public.limite_manila() from public, anon;
grant execute on function public.limite_manila() to authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- 3. Row Level Security: activo en todas las tablas, con una política de acceso
--    total para usuarios autenticados.
alter table public.categorias enable row level security;
alter table public.responsables enable row level security;
alter table public.ubicaciones enable row level security;
alter table public.estudios enable row level security;
alter table public.estudio_responsables enable row level security;
alter table public.evidencias enable row level security;

create policy "Autenticados: acceso total" on public.categorias
  for all to authenticated using (true) with check (true);
create policy "Autenticados: acceso total" on public.responsables
  for all to authenticated using (true) with check (true);
create policy "Autenticados: acceso total" on public.ubicaciones
  for all to authenticated using (true) with check (true);
create policy "Autenticados: acceso total" on public.estudios
  for all to authenticated using (true) with check (true);
create policy "Autenticados: acceso total" on public.estudio_responsables
  for all to authenticated using (true) with check (true);
create policy "Autenticados: acceso total" on public.evidencias
  for all to authenticated using (true) with check (true);
