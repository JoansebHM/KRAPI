import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'

export type Perfil = Tables<'perfiles'>

export const clavePerfil = (usuarioId: string | undefined) => ['perfil', usuarioId] as const

/** Mientras la cuenta espera aprobación se revisa seguido, para entrar apenas la aprueben. */
const REVISION_PENDIENTE_MS = 15 * 1000
/** Con la cuenta activa se revisa cada minuto, para notar si un admin la desactiva. */
const REVISION_ACTIVA_MS = 60 * 1000

/** Perfil de la cuenta con sesión: nombre, nombre de usuario, rol y estado. */
export function usePerfil(usuarioId: string | undefined) {
  return useQuery({
    queryKey: clavePerfil(usuarioId),
    queryFn: async () => {
      const { data, error } = await supabase.from('perfiles').select('*').eq('id', usuarioId!).single()
      if (error) throw error
      return data
    },
    enabled: Boolean(usuarioId),
    refetchInterval: (consulta) => (consulta.state.data?.estado === 'pendiente' ? REVISION_PENDIENTE_MS : REVISION_ACTIVA_MS),
    // Al volver a la pestaña se revisa siempre, aunque se haya revisado hace poco.
    refetchOnWindowFocus: 'always',
  })
}

/** Si nadie tiene ese nombre de usuario. Se puede consultar sin sesión, para el registro. */
export function useUsuarioDisponible(usuario: string, { habilitado }: { habilitado: boolean }) {
  return useQuery({
    queryKey: ['usuario-disponible', usuario],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('usuario_disponible', { usuario })
      if (error) throw error
      return data
    },
    enabled: habilitado,
    staleTime: 0,
  })
}
