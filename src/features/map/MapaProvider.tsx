import { useMemo, useState, type ReactNode } from 'react'
import type { Map as MapLibreMap } from './maplibre'
import { MapaContexto } from './mapaContexto'

/** Comparte el mapa de fondo (que crea MapView) con las pantallas que se abren encima. */
export function MapaProvider({ children }: { children: ReactNode }) {
  const [mapa, registrar] = useState<MapLibreMap | null>(null)
  const valor = useMemo(() => ({ mapa, registrar }), [mapa])
  return <MapaContexto.Provider value={valor}>{children}</MapaContexto.Provider>
}
