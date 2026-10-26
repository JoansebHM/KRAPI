import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'
import type { FeatureCollection, Polygon } from 'geojson'
import { useAuth } from '../auth/useAuth'
import { fechaLocal } from '../estudios/campos'
import type { GeoJSONSource, Map as MapLibreMap } from '../map/maplibre'
import { useSalidas } from './api'

const FUENTE = 'asignaciones'
const CAPA_RELLENO = 'asignaciones-relleno'
const CAPA_BORDE = 'asignaciones-borde'
const CAPA_BORDE_OTRAS = 'asignaciones-borde-otras'
/** Rosa, para no confundirse con las zonas (color de su tipo), el dibujo (naranja) ni Manila (azul). */
const COLOR_ASIGNACION = '#E93D82'

/**
 * Zonas de asignación en el mapa: las de la salida que se está viendo o, si no, las de las salidas
 * de hoy. Las propias se ven con borde continuo; las de los demás, con borde punteado.
 */
export function AsignacionesEnMapa({ mapa }: { mapa: MapLibreMap }) {
  const { data: salidas } = useSalidas()
  const { perfil } = useAuth()
  const { pathname } = useLocation()
  const [, salidaEnRuta, asignacionEnRuta] = pathname.match(/^\/salidas\/([^/]+)(?:\/zonas\/([^/]+))?/) ?? []

  const datos = useMemo<FeatureCollection<Polygon>>(() => {
    const hoy = fechaLocal()
    const visibles = (salidas ?? []).filter((salida) =>
      salidaEnRuta && salidaEnRuta !== 'nueva' ? salida.id === salidaEnRuta : salida.fecha === hoy && !salida.cancelada,
    )
    return {
      type: 'FeatureCollection',
      features: visibles.flatMap((salida) =>
        salida.asignaciones.map((asignacion) => ({
          type: 'Feature' as const,
          geometry: asignacion.forma,
          properties: {
            id: asignacion.id,
            mia: asignacion.participantes.some((participacion) => participacion.usuarioId === perfil?.id),
            seleccionada: asignacion.id === asignacionEnRuta,
          },
        })),
      ),
    }
  }, [salidas, salidaEnRuta, asignacionEnRuta, perfil?.id])

  const actual = useRef(datos)
  useEffect(() => {
    actual.current = datos
  })

  // Crea la fuente y las capas, también después de cambiar de tema (el mapa recarga su estilo).
  useEffect(() => {
    const asegurar = () => {
      if (!mapa.getSource(FUENTE)) mapa.addSource(FUENTE, { type: 'geojson', data: actual.current })
      if (!mapa.getLayer(CAPA_RELLENO)) {
        mapa.addLayer({
          id: CAPA_RELLENO,
          type: 'fill',
          source: FUENTE,
          paint: { 'fill-color': COLOR_ASIGNACION, 'fill-opacity': ['case', ['get', 'seleccionada'], 0.3, ['get', 'mia'], 0.2, 0.08] },
        })
      }
      // El punteado no cambia por zona en MapLibre, así que hay una capa para las propias y otra para las demás.
      if (!mapa.getLayer(CAPA_BORDE)) {
        mapa.addLayer({
          id: CAPA_BORDE,
          type: 'line',
          source: FUENTE,
          filter: ['==', ['get', 'mia'], true],
          paint: { 'line-color': COLOR_ASIGNACION, 'line-width': ['case', ['get', 'seleccionada'], 4, 3] },
        })
      }
      if (!mapa.getLayer(CAPA_BORDE_OTRAS)) {
        mapa.addLayer({
          id: CAPA_BORDE_OTRAS,
          type: 'line',
          source: FUENTE,
          filter: ['==', ['get', 'mia'], false],
          paint: { 'line-color': COLOR_ASIGNACION, 'line-width': ['case', ['get', 'seleccionada'], 4, 2], 'line-dasharray': [2, 2] },
        })
      }
    }
    try {
      asegurar()
    } catch {
      // El estilo todavía está cargando: se agregan en style.load.
    }
    mapa.on('style.load', asegurar)
    return () => {
      mapa.off('style.load', asegurar)
    }
  }, [mapa])

  useEffect(() => {
    ;(mapa.getSource(FUENTE) as GeoJSONSource | undefined)?.setData(datos)
  }, [mapa, datos])

  return null
}
