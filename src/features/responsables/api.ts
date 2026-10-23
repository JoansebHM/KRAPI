import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { compararTexto } from '../../lib/texto'
import type { Tables } from '../../types/database'

export type Responsable = Pick<Tables<'responsables'>, 'id' | 'nombre'> & {
  /** En cuántos estudios aparece. */
  estudios: number
}

export const CLAVE_RESPONSABLES = ['responsables'] as const

export function useResponsables() {
  return useQuery({
    queryKey: CLAVE_RESPONSABLES,
    // Al abrir la pantalla se muestran los datos en caché al instante y se actualizan en segundo plano.
    refetchOnMount: 'always',
    queryFn: async (): Promise<Responsable[]> => {
      const { data, error } = await supabase.from('responsables').select('id, nombre, estudio_responsables(count)')
      if (error) throw error
      return data
        .map(({ estudio_responsables, ...responsable }) => ({
          ...responsable,
          estudios: estudio_responsables[0]?.count ?? 0,
        }))
        .sort((a, b) => compararTexto(a.nombre, b.nombre))
    },
  })
}

const limpiarNombre = (nombre: string) => nombre.trim().replace(/\s+/g, ' ')

export function useCrearResponsable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { error } = await supabase.from('responsables').insert({ nombre: limpiarNombre(nombre) })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_RESPONSABLES }),
  })
}

export function useActualizarResponsable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { error } = await supabase.from('responsables').update({ nombre: limpiarNombre(nombre) }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_RESPONSABLES }),
  })
}

/** Lo necesario para deshacer una eliminación: la persona y los estudios donde aparecía. */
export interface ResponsableEliminado {
  responsable: Responsable
  estudioIds: string[]
}

export function useEliminarResponsable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (responsable: Responsable): Promise<ResponsableEliminado> => {
      // Antes de borrar se guardan sus estudios, para poder deshacer.
      const { data: relaciones, error: errorRelaciones } = await supabase
        .from('estudio_responsables')
        .select('estudio_id')
        .eq('responsable_id', responsable.id)
      if (errorRelaciones) throw errorRelaciones

      const { error } = await supabase.from('responsables').delete().eq('id', responsable.id)
      if (error) throw error
      return { responsable, estudioIds: relaciones.map(({ estudio_id }) => estudio_id) }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_RESPONSABLES }),
  })
}

export function useRestaurarResponsable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ responsable, estudioIds }: ResponsableEliminado) => {
      const { error } = await supabase.from('responsables').insert({ id: responsable.id, nombre: responsable.nombre })
      if (error) throw error
      if (estudioIds.length > 0) {
        const { error: errorRelaciones } = await supabase
          .from('estudio_responsables')
          .insert(estudioIds.map((estudio_id) => ({ estudio_id, responsable_id: responsable.id })))
        if (errorRelaciones) throw errorRelaciones
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_RESPONSABLES }),
  })
}
