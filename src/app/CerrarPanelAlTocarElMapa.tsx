import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { tocoUnLugar } from '../features/lugares/tocarLugar'
import type { MapMouseEvent } from '../features/map/maplibre'
import { useMapa } from '../features/map/mapaContexto'

/**
 * En computador, el panel de la derecha se cierra al tocar el mapa (un clic, no al arrastrarlo).
 * Tocar un lugar no lo cierra: abre su ficha. Crear, mover o dibujar no es un panel: ahí el mapa se mueve.
 */
/** Pantallas donde se mueve el mapa bajo la mira (crear, mover o dibujar). */
const RUTAS_CON_MIRA = [/^\/lugares\/nuevo$/, /^\/zonas\/nueva$/, /\/mover$/, /\/redibujar$/]

export function CerrarPanelAlTocarElMapa() {
  const mapa = useMapa()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const hayPanel = pathname !== '/' && !RUTAS_CON_MIRA.some((ruta) => ruta.test(pathname))

  useEffect(() => {
    if (!mapa || !hayPanel) return
    const alTocar = (evento: MapMouseEvent) => {
      if (!tocoUnLugar(mapa, evento)) navegar('/')
    }
    mapa.on('click', alTocar)
    return () => {
      mapa.off('click', alTocar)
    }
  }, [mapa, hayPanel, navegar])

  return null
}
