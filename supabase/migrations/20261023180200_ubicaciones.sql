-- =============================================================================
-- Ubicaciones: puntos (locales) y zonas (polígonos) dentro del barrio Manila
-- =============================================================================

-- Límite oficial del barrio Manila (El Poblado, Medellín), código 1419.
-- Debe coincidir con el polígono del frontend: src/features/map/manila.ts
create or replace function public.limite_manila()
returns extensions.geometry
language sql
immutable
parallel safe
set search_path = ''
as $$
  select extensions.st_geomfromtext(
    'POLYGON((-75.5699508 6.2147536, -75.5702952 6.2148169, -75.5707401 6.2148383, -75.5707971 6.2148315, -75.5708473 6.214818, -75.5709908 6.214775, -75.5710579 6.2147637, -75.571137 6.2147637, -75.571364 6.2147728, -75.5714757 6.2147863, -75.5715689 6.2148044, -75.5716649 6.2148315, -75.572326 6.214992, -75.5727467 6.2150937, -75.5728782 6.2151412, -75.5729245 6.2151502, -75.5731938 6.2152632, -75.5734496 6.2151592, -75.5735727 6.2151332, -75.5736049 6.2151265, -75.5737387 6.2150926, -75.5738392 6.2150474, -75.5740159 6.2149739, -75.5741497 6.2149242, -75.5746245 6.2147784, -75.5747324 6.2147535, -75.5747849 6.2147513, -75.5748283 6.2147547, -75.5749328 6.2147626, -75.5752298 6.2147953, -75.5752947 6.2148021, -75.5754003 6.2148202, -75.5754731 6.214836, -75.5755262 6.2148914, -75.5760185 6.2149434, -75.5760456 6.2149468, -75.5760851 6.2149513, -75.5761393 6.2149581, -75.576643 6.2150179, -75.5771133 6.215079, -75.577194 6.2150744, -75.5772324 6.2150699, -75.577268 6.2150677, -75.5773267 6.2150959, -75.5776649 6.2151354, -75.5778687 6.2151524, -75.5780353 6.214089, -75.5780911 6.213663, -75.5776383 6.213576, -75.5775423 6.2135568, -75.5772663 6.2135048, -75.5772296 6.2134969, -75.5769602 6.2134449, -75.5767615 6.2133986, -75.5764967 6.2133342, -75.5763031 6.2132867, -75.5760083 6.2132178, -75.5759485 6.2132065, -75.5757819 6.2131636, -75.5756758 6.2131172, -75.5756024 6.2130743, -75.5755375 6.2130291, -75.5754561 6.2129647, -75.5753957 6.212915, -75.5753178 6.2128551, -75.5752743 6.2128291, -75.5752128 6.212785, -75.5749858 6.2126347, -75.5748882 6.2125613, -75.5748368 6.2125307, -75.5747831 6.2125149, -75.5747447 6.2125127, -75.5746877 6.212455, -75.5743241 6.2122053, -75.5739137 6.211933, -75.5738453 6.2118912, -75.5731029 6.211603, -75.5728251 6.2114923, -75.5725434 6.2113804, -75.572505 6.2113657, -75.5719528 6.2111578, -75.5716005 6.2110256, -75.5711477 6.2108527, -75.570753 6.2107024, -75.5704668 6.2106041, -75.5702511 6.2111295, -75.5702155 6.2112233, -75.5701726 6.2113386, -75.5701201 6.2115194, -75.5700761 6.2116697, -75.5700151 6.2120833, -75.5699982 6.2124483, -75.5699925 6.2128291, -75.5699925 6.2128472, -75.5699925 6.2129975, -75.5699863 6.213193, -75.5699609 6.2146892, -75.5699508 6.2147536))',
    4326
  )
$$;

comment on function public.limite_manila() is
  'Polígono del barrio Manila (SRID 4326). Debe coincidir con src/features/map/manila.ts.';


create table public.ubicaciones (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_ubicacion not null,
  -- Punto o polígono en coordenadas geográficas (longitud, latitud).
  geom extensions.geometry(Geometry, 4326) not null,
  nombre text not null,
  descripcion text,
  direccion text,
  complemento text,
  contacto_nombre text,
  contacto_telefono text,
  categoria_id uuid references public.categorias (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ubicaciones_nombre_no_vacio check (length(trim(nombre)) > 0),
  -- Un punto debe guardarse como POINT y una zona como POLYGON.
  constraint ubicaciones_geom_segun_tipo check (
    (tipo = 'punto' and extensions.geometrytype(geom) = 'POINT')
    or (tipo = 'zona' and extensions.geometrytype(geom) = 'POLYGON')
  ),
  constraint ubicaciones_geom_valida check (extensions.st_isvalid(geom)),
  -- Nada puede quedar fuera del barrio. La app muestra un aviso antes de intentarlo;
  -- esta regla es el respaldo por si algo se salta la app.
  constraint ubicaciones_dentro_de_manila check (extensions.st_coveredby(geom, public.limite_manila())),
  constraint ubicaciones_telefono_valido check (
    contacto_telefono is null or contacto_telefono ~ '^\+?[0-9 ()-]{7,20}$'
  )
);

comment on table public.ubicaciones is 'Puntos y zonas del barrio donde se realizan estudios.';
comment on column public.ubicaciones.categoria_id is 'Si la categoría se elimina, queda en NULL.';

create index ubicaciones_geom_idx on public.ubicaciones using gist (geom);
create index ubicaciones_categoria_idx on public.ubicaciones (categoria_id);

create trigger ubicaciones_set_updated_at
  before update on public.ubicaciones
  for each row execute function public.set_updated_at();
