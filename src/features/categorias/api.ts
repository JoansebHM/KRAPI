import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { SIN_PERMISO } from '../../lib/errores'
import { supabase } from '../../lib/supabase'
import { compararTexto } from '../../lib/texto'
import type { Enums, Tables } from '../../types/database'

export type UsoCategoria = Enums<'uso_categoria'>

export type Categoria = Pick<Tables<'categorias'>, 'id' | 'nombre' | 'color' | 'icono' | 'aplica_a'> & {
  /** Cuántas ubicaciones usan esta categoría. */
  ubicaciones: number
}

export interface DatosCategoria {
  nombre: string
  color: string
  icono: string
  aplica_a: UsoCategoria
}

/** Dónde se puede elegir la categoría: en los lugares (locales), en los elementos o en los dos. */
export const NOMBRE_USO: Record<UsoCategoria, string> = {
  lugares: 'Lugares',
  elementos: 'Elementos',
  ambos: 'Lugares y elementos',
}

/** Si la categoría se puede elegir para un lugar (local) o para un elemento (caneca, poste…). */
export const aplicaA = (categoria: Pick<Categoria, 'aplica_a'>, uso: Exclude<UsoCategoria, 'ambos'>) =>
  categoria.aplica_a === uso || categoria.aplica_a === 'ambos'

export const CLAVE_CATEGORIAS = ['categorias'] as const

/**
 * Tras cambiar una categoría se recarga también el mapa y las fichas: un elemento sin nombre se muestra con el de
 * su categoría. (Las claves van escritas porque lugares/api.ts ya importa este archivo.)
 */
function invalidarCategorias(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['lugares'] })
  void queryClient.invalidateQueries({ queryKey: ['lugar'] })
  return queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS })
}

export function useCategorias() {
  return useQuery({
    queryKey: CLAVE_CATEGORIAS,
    // Al abrir la pantalla se muestran los datos en caché al instante y se actualizan en segundo plano.
    refetchOnMount: 'always',
    queryFn: async (): Promise<Categoria[]> => {
      const { data, error } = await supabase.from('categorias').select('id, nombre, color, icono, aplica_a, ubicaciones(count)')
      if (error) throw error
      return data
        .map(({ ubicaciones, ...categoria }) => ({ ...categoria, ubicaciones: ubicaciones[0]?.count ?? 0 }))
        .sort((a, b) => compararTexto(a.nombre, b.nombre))
    },
  })
}

function limpiar({ nombre, color, icono, aplica_a }: DatosCategoria): DatosCategoria {
  return { nombre: nombre.trim().replace(/\s+/g, ' '), color: color.toUpperCase(), icono, aplica_a }
}

export function useCrearCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: DatosCategoria) => {
      const { data, error } = await supabase.from('categorias').insert(limpiar(datos)).select('id, nombre, color, icono, aplica_a').single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidarCategorias(queryClient),
  })
}

export function useActualizarCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...datos }: DatosCategoria & { id: string }) => {
      const { error } = await supabase.from('categorias').update(limpiar(datos)).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidarCategorias(queryClient),
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

      const { data: borradas, error } = await supabase.from('categorias').delete().eq('id', categoria.id).select('id')
      if (error) throw error
      if (borradas.length === 0) throw SIN_PERMISO
      return { categoria, ubicacionIds: ubicaciones.map(({ id }) => id) }
    },
    onSuccess: () => invalidarCategorias(queryClient),
  })
}

export function useRestaurarCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ categoria, ubicacionIds }: CategoriaEliminada) => {
      const { error } = await supabase
        .from('categorias')
        .insert({ id: categoria.id, nombre: categoria.nombre, color: categoria.color, icono: categoria.icono, aplica_a: categoria.aplica_a })
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
    onSuccess: () => invalidarCategorias(queryClient),
  })
}
