import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

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
