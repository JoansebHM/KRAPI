import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { FeatureCollection, Polygon } from 'geojson'
import { useAuth } from '../auth/useAuth'
import { fechaLocal } from '../estudios/campos'
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from '../map/maplibre'
import { useSalidas } from './api'

const FUENTE = 'asignaciones'
const CAPA_RELLENO = 'asignaciones-relleno'
const CAPA_BORDE = 'asignaciones-borde'
const CAPA_BORDE_OTRAS = 'asignaciones-borde-otras'
/** Rosa, para no confundirse con las zonas (color de su tipo), el dibujo (naranja) ni Manila (azul). */
const COLOR_ASIGNACION = '#E93D82'

/**
 * Zonas de asignación en el mapa: las de la salida que se está viendo o, si no, las de las salidas
 * de hoy. Las propias se ven con borde continuo; las de los demás, con borde punteado. Se tocan
 * para ver su información (quiénes la cubren y cómo van).
 */
export function AsignacionesEnMapa({ mapa }: { mapa: MapLibreMap }) {
  const { data: salidas } = useSalidas()
  const { perfil } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [, salidaEnRuta, asignacionEnRuta] = pathname.match(/^\/salidas\/([^/]+)(?:\/zonas\/([^/]+))?/) ?? []
  // Mientras se dibuja una zona nueva, tocar el mapa no debe navegar a otra parte.
  const dibujando = asignacionEnRuta === 'nueva'

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
            salidaId: salida.id,
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

  const dibujandoActual = useRef(dibujando)
  useEffect(() => {
    dibujandoActual.current = dibujando
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

    function alTocar(evento: MapLayerMouseEvent) {
      if (dibujandoActual.current) return
      const feature = evento.features?.[0]
      if (!feature) return
      const { id, salidaId } = feature.properties as { id: string; salidaId: string }
      navigate(`/salidas/${salidaId}/zonas/${id}`)
    }
    const conPuntero = () => (mapa.getCanvas().style.cursor = 'pointer')
    const sinPuntero = () => (mapa.getCanvas().style.cursor = '')

    try {
      asegurar()
    } catch {
      // El estilo todavía está cargando: se agregan en style.load.
    }
    mapa.on('style.load', asegurar)
    mapa.on('click', CAPA_RELLENO, alTocar)
    mapa.on('mouseenter', CAPA_RELLENO, conPuntero)
    mapa.on('mouseleave', CAPA_RELLENO, sinPuntero)
    return () => {
      mapa.off('style.load', asegurar)
      mapa.off('click', CAPA_RELLENO, alTocar)
      mapa.off('mouseenter', CAPA_RELLENO, conPuntero)
      mapa.off('mouseleave', CAPA_RELLENO, sinPuntero)
    }
  }, [mapa, navigate])

  useEffect(() => {
    ;(mapa.getSource(FUENTE) as GeoJSONSource | undefined)?.setData(datos)
  }, [mapa, datos])

  return null
}
