import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SIN_PERMISO } from '../../lib/errores'
import { supabase } from '../../lib/supabase'
import { compararTexto } from '../../lib/texto'
import type { Tables } from '../../types/database'

export type TipoZona = Pick<Tables<'tipos_zona'>, 'id' | 'nombre' | 'color'> & {
  /** Cuántas zonas son de este tipo. */
  zonas: number
}

export interface DatosTipoZona {
  nombre: string
  color: string
}

export const CLAVE_TIPOS_ZONA = ['tipos-zona'] as const

/** Color de las zonas sin tipo: el lila de siempre. */
export const COLOR_ZONA_SIN_TIPO = '#9E7AE1'

export function useTiposZona() {
  return useQuery({
    queryKey: CLAVE_TIPOS_ZONA,
    queryFn: async (): Promise<TipoZona[]> => {
      const { data, error } = await supabase.from('tipos_zona').select('id, nombre, color, ubicaciones(count)')
      if (error) throw error
      return data
        .map(({ ubicaciones, ...tipo }) => ({ ...tipo, zonas: ubicaciones[0]?.count ?? 0 }))
        .sort((a, b) => compararTexto(a.nombre, b.nombre))
    },
  })
}

const limpiar = ({ nombre, color }: DatosTipoZona) => ({ nombre: nombre.trim().replace(/\s+/g, ' '), color: color.toUpperCase() })

export function useGuardarTipoZona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...datos }: DatosTipoZona & { id?: string }) => {
      const { error } = id
        ? await supabase.from('tipos_zona').update(limpiar(datos)).eq('id', id)
        : await supabase.from('tipos_zona').insert(limpiar(datos))
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_TIPOS_ZONA }),
  })
}

/** Solo un admin borra tipos (lo asegura RLS). Las zonas de ese tipo quedan sin tipo. */
export function useEliminarTipoZona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tipo: TipoZona) => {
      const { data: borrados, error } = await supabase.from('tipos_zona').delete().eq('id', tipo.id).select('id')
      if (error) throw error
      if (borrados.length === 0) throw SIN_PERMISO
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_TIPOS_ZONA })
      void queryClient.invalidateQueries({ queryKey: ['lugares'] })
    },
  })
}
