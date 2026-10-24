import { useQuery } from '@tanstack/react-query'
import type { Point, Polygon } from 'geojson'
import { supabase } from '../../lib/supabase'
import type { Enums } from '../../types/database'

interface LugarBase {
  id: string
  nombre: string
  estado: Enums<'estado_ubicacion'>
  /** Solo los puntos tienen categoría; NULL = sin categoría (marcador neutro). */
  categoriaId: string | null
}

export type Punto = LugarBase & { tipo: 'punto'; geometria: Point }
export type Zona = LugarBase & { tipo: 'zona'; geometria: Polygon }
export type Lugar = Punto | Zona

export const CLAVE_LUGARES = ['lugares'] as const

/** Lugares visibles (no archivados) con su geometría, para el mapa. */
export function useLugares() {
  return useQuery({
    queryKey: CLAVE_LUGARES,
    queryFn: async (): Promise<Lugar[]> => {
      const { data, error } = await supabase.rpc('lugares_mapa')
      if (error) throw error
      // La función devuelve POINT para los puntos y POLYGON para las zonas (lo exige la base de datos).
      return data.map(
        ({ id, tipo, nombre, estado, categoria_id, geojson }) =>
          ({ id, tipo, nombre, estado, categoriaId: categoria_id ?? null, geometria: geojson as unknown as Lugar['geometria'] }) as Lugar,
      )
    },
  })
}
