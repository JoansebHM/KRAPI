import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { clavePerfil } from '../auth/api'
import { CLAVE_USUARIOS } from '../usuarios/api'

export interface DatosPerfil {
  nombre: string
  avatarSemilla: string
}

/** Cada quien edita solo su nombre y su avatar (lo demás lo protege la base de datos). */
export function useActualizarPerfil(usuarioId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nombre, avatarSemilla }: DatosPerfil) => {
      const { error } = await supabase
        .from('perfiles')
        .update({ nombre: nombre.trim().replace(/\s+/g, ' '), avatar_semilla: avatarSemilla })
        .eq('id', usuarioId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clavePerfil(usuarioId) })
      void queryClient.invalidateQueries({ queryKey: CLAVE_USUARIOS })
    },
  })
}

export function useCambiarContrasena() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
  })
}
