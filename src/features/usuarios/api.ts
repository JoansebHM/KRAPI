import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeErrorDatos } from '../../lib/errores'
import { supabase } from '../../lib/supabase'
import { compararTexto } from '../../lib/texto'
import type { Enums, Tables } from '../../types/database'

export type Usuario = Tables<'perfiles'>
export type Rol = Enums<'rol_usuario'>

export const CLAVE_USUARIOS = ['usuarios'] as const

/** Cuentas del equipo. Solo las usa un admin (un miembro activo también las puede leer). */
export function useUsuarios({ habilitado = true } = {}) {
  return useQuery({
    queryKey: CLAVE_USUARIOS,
    refetchOnMount: 'always',
    enabled: habilitado,
    queryFn: async (): Promise<Usuario[]> => {
      const { data, error } = await supabase.from('perfiles').select('*')
      if (error) throw error
      return data.sort((a, b) => compararTexto(a.nombre, b.nombre))
    },
  })
}

/** Funciones de la base de datos que cambian el estado de una cuenta. */
export type CambioDeEstado = 'aprobar_usuario' | 'rechazar_usuario' | 'desactivar_usuario' | 'reactivar_usuario'

export function useCambiarEstado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ cambio, usuario }: { cambio: CambioDeEstado; usuario: Usuario }) => {
      const { error } = await supabase.rpc(cambio, { usuario_id: usuario.id })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_USUARIOS }),
  })
}

export function useCambiarRol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ usuario, rol }: { usuario: Usuario; rol: Rol }) => {
      const { error } = await supabase.rpc('cambiar_rol', { usuario_id: usuario.id, rol })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_USUARIOS }),
  })
}

/**
 * Las funciones de administración explican en español por qué no se pudo (por ejemplo, "No puedes
 * cambiar tu propio rol ni tu propio estado."). Ese mensaje se muestra tal cual.
 */
export function mensajeErrorCuenta(error: unknown) {
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  if (message && ['42501', '22023', 'P0002'].includes(code ?? '')) return message
  return mensajeErrorDatos(error)
}
