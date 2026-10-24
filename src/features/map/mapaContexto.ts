import { createContext, useContext } from 'react'
import type { Map as MapLibreMap } from './maplibre'

interface ValorMapa {
  /** El mapa ya creado, o null mientras se crea. */
  mapa: MapLibreMap | null
  registrar: (mapa: MapLibreMap | null) => void
}

export const MapaContexto = createContext<ValorMapa>({ mapa: null, registrar: () => {} })

/** El mapa de fondo, para las pantallas que necesitan leerlo o moverlo (por ejemplo, crear un punto). */
export function useMapa() {
  return useContext(MapaContexto).mapa
}
