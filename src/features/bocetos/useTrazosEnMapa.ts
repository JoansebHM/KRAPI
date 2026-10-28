import { useEffect, useRef } from 'react'
import type { GeoJSONSource, Map as MapLibreMap } from '../map/maplibre'
import { trazosAGeoJSON, type Trazo } from './trazos'

const FUENTE = 'pizarra-trazos'
const CAPA_BORDE = 'pizarra-trazos-borde'
const CAPA_LINEA = 'pizarra-trazos-linea'

/** El borde blanco se ve más grueso que la línea: así cualquier color se ve sobre el mapa claro y el oscuro. */
const GROSOR_DEL_BORDE_PX = 3

function asegurarCapas(mapa: MapLibreMap, datos: ReturnType<typeof trazosAGeoJSON>) {
  if (!mapa.getSource(FUENTE)) mapa.addSource(FUENTE, { type: 'geojson', data: datos })
  const forma = { 'line-cap': 'round', 'line-join': 'round' } as const
  if (!mapa.getLayer(CAPA_BORDE)) {
    mapa.addLayer({
      id: CAPA_BORDE,
      type: 'line',
      source: FUENTE,
      layout: forma,
      paint: { 'line-color': '#ffffff', 'line-opacity': 0.9, 'line-width': ['+', ['get', 'grosor'], GROSOR_DEL_BORDE_PX] },
    })
  }
  if (!mapa.getLayer(CAPA_LINEA)) {
    mapa.addLayer({
      id: CAPA_LINEA,
      type: 'line',
      source: FUENTE,
      layout: forma,
      paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'grosor'] },
    })
  }
}

/**
 * Dibuja los trazos en el mapa, en capas propias, para que salgan en la captura. Se agregan de nuevo
 * después de cambiar el tema (el mapa recarga su estilo) y se quitan al salir de la pizarra.
 */
export function useTrazosEnMapa(mapa: MapLibreMap | null, trazos: Trazo[]) {
  const datos = trazosAGeoJSON(trazos)
  const actual = useRef(datos)
  useEffect(() => {
    actual.current = datos
  })

  useEffect(() => {
    if (!mapa) return
    const asegurar = () => asegurarCapas(mapa, actual.current)
    try {
      asegurar()
    } catch {
      // El estilo todavía está cargando: se agregan en style.load.
    }
    mapa.on('style.load', asegurar)
    return () => {
      mapa.off('style.load', asegurar)
      for (const capa of [CAPA_LINEA, CAPA_BORDE]) if (mapa.getLayer(capa)) mapa.removeLayer(capa)
      if (mapa.getSource(FUENTE)) mapa.removeSource(FUENTE)
    }
  }, [mapa])

  useEffect(() => {
    ;(mapa?.getSource(FUENTE) as GeoJSONSource | undefined)?.setData(datos)
  }, [mapa, datos])
}
