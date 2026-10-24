import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Point, Polygon } from 'geojson'
import { supabase } from '../../lib/supabase'
import type { Enums } from '../../types/database'
import { CLAVE_CATEGORIAS } from '../categorias/api'

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

/** Distancia (en metros) por debajo de la cual se pregunta si es el mismo lugar. */
export const METROS_POSIBLE_DUPLICADO = 15

export interface LugarCercano {
  id: string
  nombre: string
  estado: Enums<'estado_ubicacion'>
  distanciaM: number
}

/** Puntos a menos de 15 m de la coordenada, para avisar de un posible duplicado antes de crear uno. */
export async function buscarCercanos(lng: number, lat: number): Promise<LugarCercano[]> {
  const { data, error } = await supabase.rpc('ubicaciones_cercanas', { lng, lat, metros: METROS_POSIBLE_DUPLICADO })
  if (error) throw error
  return data.map(({ id, nombre, estado, distancia_m }) => ({ id, nombre, estado, distanciaM: distancia_m }))
}

/** Lo que se llena en el formulario de un punto. */
export interface CamposPunto {
  nombre: string
  categoriaId: string | null
  direccion: string
  complemento: string
  contactoNombre: string
  contactoTelefono: string
}

export const PUNTO_VACIO: CamposPunto = {
  nombre: '',
  categoriaId: null,
  direccion: '',
  complemento: '',
  contactoNombre: '',
  contactoTelefono: '',
}

export type DatosPunto = CamposPunto & { lng: number; lat: number }

/** Texto limpio o NULL si quedó vacío. */
const opcional = (texto: string) => texto.trim().replace(/\s+/g, ' ') || null

export function useCrearPunto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: DatosPunto) => {
      const { data, error } = await supabase
        .from('ubicaciones')
        .insert({
          tipo: 'punto',
          // PostGIS acepta la geometría como texto (EWKT), con su sistema de coordenadas.
          geom: `SRID=4326;POINT(${datos.lng} ${datos.lat})`,
          nombre: datos.nombre.trim().replace(/\s+/g, ' '),
          categoria_id: datos.categoriaId,
          direccion: opcional(datos.direccion),
          complemento: opcional(datos.complemento),
          contacto_nombre: opcional(datos.contactoNombre),
          contacto_telefono: opcional(datos.contactoTelefono),
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_LUGARES })
      // Las categorías muestran cuántas ubicaciones las usan.
      void queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS })
    },
  })
}
