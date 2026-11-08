import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { CANAL_PRESENCIA, GRACIA_OCULTA_MS, idsEnLinea } from './presencia'
import { PresenciaContext, type PresenciaContextValue } from './PresenciaContext'

/**
 * Se anuncia en el canal de presencia mientras la app esté abierta y visible, y sigue quién más
 * está (decisión 0036). Solo se monta con una cuenta activa: la política RLS del canal le cierra la
 * puerta a las demás. Si Realtime no responde, la lista queda vacía y la app sigue igual.
 */
export function PresenciaProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const usuarioId = session?.user.id
  const [enLinea, setEnLinea] = useState<string[]>([])

  useEffect(() => {
    if (!usuarioId) return

    // La clave de presencia es el id de la cuenta: así varias pestañas son una sola persona.
    const canal = supabase.channel(CANAL_PRESENCIA, { config: { private: true, presence: { key: usuarioId } } })
    let suscrito = false
    let temporizadorOculta: number | undefined

    const anunciarse = () => void canal.track({ desde: new Date().toISOString() })

    canal.on('presence', { event: 'sync' }, () => setEnLinea(idsEnLinea(canal.presenceState())))
    canal.subscribe((estado) => {
      suscrito = estado === 'SUBSCRIBED'
      // También al reconectar: la presencia no sobrevive a una caída de la conexión.
      if (suscrito && document.visibilityState === 'visible') anunciarse()
    })

    // Oculta (otra pestaña o pantalla apagada) más de un minuto: deja de figurar en línea.
    const alCambiarVisibilidad = () => {
      window.clearTimeout(temporizadorOculta)
      if (document.visibilityState === 'visible') {
        if (suscrito) anunciarse()
      } else {
        temporizadorOculta = window.setTimeout(() => void canal.untrack(), GRACIA_OCULTA_MS)
      }
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)

    return () => {
      window.clearTimeout(temporizadorOculta)
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
      void supabase.removeChannel(canal)
      setEnLinea([])
    }
  }, [usuarioId])

  const valor = useMemo<PresenciaContextValue>(() => ({ enLinea }), [enLinea])
  return <PresenciaContext.Provider value={valor}>{children}</PresenciaContext.Provider>
}
