import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { compararTexto } from '../../lib/texto'
import type { Tables } from '../../types/database'

export type Categoria = Pick<Tables<'categorias'>, 'id' | 'nombre' | 'color' | 'icono'> & {
  /** Cuántas ubicaciones usan esta categoría. */
  ubicaciones: number
}

export interface DatosCategoria {
  nombre: string
  color: string
  icono: string
}

export const CLAVE_CATEGORIAS = ['categorias'] as const

export function useCategorias() {
  return useQuery({
    queryKey: CLAVE_CATEGORIAS,
    // Al abrir la pantalla se muestran los datos en caché al instante y se actualizan en segundo plano.
    refetchOnMount: 'always',
    queryFn: async (): Promise<Categoria[]> => {
      const { data, error } = await supabase.from('categorias').select('id, nombre, color, icono, ubicaciones(count)')
      if (error) throw error
      return data
        .map(({ ubicaciones, ...categoria }) => ({ ...categoria, ubicaciones: ubicaciones[0]?.count ?? 0 }))
        .sort((a, b) => compararTexto(a.nombre, b.nombre))
    },
  })
}

function limpiar({ nombre, color, icono }: DatosCategoria): DatosCategoria {
  return { nombre: nombre.trim().replace(/\s+/g, ' '), color: color.toUpperCase(), icono }
}

export function useCrearCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: DatosCategoria) => {
      const { data, error } = await supabase.from('categorias').insert(limpiar(datos)).select('id, nombre, color, icono').single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS }),
  })
}

export function useActualizarCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...datos }: DatosCategoria & { id: string }) => {
      const { error } = await supabase.from('categorias').update(limpiar(datos)).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS }),
  })
}

/** Lo necesario para deshacer una eliminación: la categoría y las ubicaciones que la usaban. */
export interface CategoriaEliminada {
  categoria: Categoria
  ubicacionIds: string[]
}

export function useEliminarCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (categoria: Categoria): Promise<CategoriaEliminada> => {
      // Antes de borrar se guardan las ubicaciones que la usan, para poder deshacer.
      const { data: ubicaciones, error: errorUbicaciones } = await supabase
        .from('ubicaciones')
        .select('id')
        .eq('categoria_id', categoria.id)
      if (errorUbicaciones) throw errorUbicaciones

      const { error } = await supabase.from('categorias').delete().eq('id', categoria.id)
      if (error) throw error
      return { categoria, ubicacionIds: ubicaciones.map(({ id }) => id) }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS }),
  })
}

export function useRestaurarCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ categoria, ubicacionIds }: CategoriaEliminada) => {
      const { error } = await supabase
        .from('categorias')
        .insert({ id: categoria.id, nombre: categoria.nombre, color: categoria.color, icono: categoria.icono })
      if (error) throw error
      if (ubicacionIds.length > 0) {
        const { error: errorUbicaciones } = await supabase
          .from('ubicaciones')
          .update({ categoria_id: categoria.id })
          .in('id', ubicacionIds)
          .is('categoria_id', null)
        if (errorUbicaciones) throw errorUbicaciones
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS }),
  })
}
