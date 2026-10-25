-- =============================================================================
-- Varias notas por estudio (#101)
--
-- El estudio tenía un solo texto de notas (descripcion). En campo se toman varios
-- apuntes sueltos, así que ahora es una lista: notas text[]. La nota que ya tenía
-- cada estudio pasa a ser la primera de su lista.
-- =============================================================================

-- Una nota no puede quedar vacía ni ser muy larga. Una regla (check) no puede
-- tener subconsultas, por eso la revisión va en una función.
create or replace function public.notas_validas(notas text[])
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select cardinality(notas) <= 50
     and coalesce(bool_and(length(trim(nota)) between 1 and 2000), true)
  from unnest(notas) as nota
$$;

comment on function public.notas_validas(text[]) is
  'Regla de estudios.notas: hasta 50 notas, cada una de 1 a 2000 caracteres (sin contar espacios de los extremos).';

alter table public.estudios
  add column notas text[] not null default '{}';

-- Pasar la nota de cada estudio a la lista sin que cuente como una edición: con
-- los triggers encendidos, actualizado_por quedaría vacío (la migración no tiene
-- cuenta) y la bitácora registraría una edición que nadie hizo.
alter table public.estudios disable trigger user;

update public.estudios
   set notas = array[trim(descripcion)]
 where descripcion is not null and length(trim(descripcion)) > 0;

alter table public.estudios enable trigger user;

alter table public.estudios drop column descripcion;

alter table public.estudios
  add constraint estudios_notas_validas check (public.notas_validas(notas));

comment on column public.estudios.notas is 'Apuntes de la visita, en el orden en que se escribieron. Lista vacía = sin notas.';

-- La regla la evalúa la base de datos al escribir; nadie necesita llamarla directamente.
revoke execute on function public.notas_validas(text[]) from public, anon;
grant execute on function public.notas_validas(text[]) to authenticated;

-- Los permisos de la tabla (solo authenticated) y sus políticas RLS ya cubren la columna nueva.
