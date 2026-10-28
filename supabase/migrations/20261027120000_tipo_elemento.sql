-- =============================================================================
-- Elementos: nuevo tipo de ubicación (decisión 0028, #127)
--
-- Va en su propia migración porque Postgres no deja usar un valor nuevo de un
-- enum en la misma transacción en la que se agrega. Las reglas de los elementos
-- están en la siguiente migración (elementos).
-- =============================================================================

alter type public.tipo_ubicacion add value if not exists 'elemento';
