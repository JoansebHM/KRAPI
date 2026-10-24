import { useContext, useEffect, useRef } from 'react'
import { AttributionControl, GeolocateControl, Map as MapLibreMap, NavigationControl } from './maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { env } from '../../config/env'
import { LugaresEnMapa } from '../lugares/LugaresEnMapa'
import type { Theme } from '../theme/useTheme'
import { MANILA, MANILA_BOUNDS, MANILA_MAX_BOUNDS } from './manila'
import { MapaContexto } from './mapaContexto'
import { toNightStyle } from './nightStyle'
import './MapView.css'

const BOUNDS_PADDING = 48

const BOUNDARY_COLORS: Record<Theme, { line: string; fill: string; fillOpacity: number }> = {
  light: { line: '#0d34e9', fill: '#0478fb', fillOpacity: 0.08 },
  dark: { line: '#5cadff', fill: '#0478fb', fillOpacity: 0.16 },
}

interface MapViewProps {
  theme: Theme
}

export function MapView({ theme }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // Se comparte con las pantallas que se abren encima (MapaProvider) y se usa para dibujar los lugares.
  const { mapa, registrar } = useContext(MapaContexto)
  const themeRef = useRef(theme)
  const appliedThemeRef = useRef<Theme | null>(null)

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      bounds: MANILA_BOUNDS,
      fitBoundsOptions: { padding: BOUNDS_PADDING },
      // No deja mover ni alejar el mapa más allá de 1 km alrededor del barrio.
      maxBounds: MANILA_MAX_BOUNDS,
      attributionControl: false,
    })

    // Créditos abajo a la izquierda: abajo a la derecha va el botón flotante de crear.
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right')
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right',
    )

    // Cada vez que se carga un estilo (al inicio o al cambiar de tema) se vuelven a agregar las capas propias.
    map.on('style.load', () => addManilaLayers(map, themeRef.current))

    setBaseStyle(map, themeRef.current)
    appliedThemeRef.current = themeRef.current

    mapRef.current = map
    registrar(map)
    return () => {
      map.remove()
      mapRef.current = null
      registrar(null)
    }
  }, [registrar])

  // Cambiar el mapa base cuando cambia el tema.
  useEffect(() => {
    themeRef.current = theme
    const map = mapRef.current
    if (!map) return
    if (appliedThemeRef.current === theme) return
    appliedThemeRef.current = theme
    setBaseStyle(map, theme)
  }, [theme])

  return (
    <>
      <div ref={containerRef} className="map-view" />
      {mapa && <LugaresEnMapa mapa={mapa} theme={theme} />}
    </>
  )
}

/** Carga el mapa base del tema. Sin estilo oscuro configurado, genera uno nocturno a partir del claro. */
function setBaseStyle(map: MapLibreMap, theme: Theme) {
  const { light, dark } = env.mapStyles
  if (theme === 'dark' && !dark) {
    map.setStyle(light, { diff: false, transformStyle: (_previous, next) => toNightStyle(next) })
    return
  }
  map.setStyle(theme === 'dark' && dark ? dark : light, { diff: false })
}

function addManilaLayers(map: MapLibreMap, theme: Theme) {
  const colors = BOUNDARY_COLORS[theme]
  if (!map.getSource('manila')) {
    map.addSource('manila', { type: 'geojson', data: MANILA })
  }
  if (!map.getLayer('manila-fill')) {
    map.addLayer({
      id: 'manila-fill',
      type: 'fill',
      source: 'manila',
      paint: { 'fill-color': colors.fill, 'fill-opacity': colors.fillOpacity },
    })
  }
  if (!map.getLayer('manila-outline')) {
    map.addLayer({
      id: 'manila-outline',
      type: 'line',
      source: 'manila',
      paint: { 'line-color': colors.line, 'line-width': 3, 'line-dasharray': [2, 1] },
    })
  }
}
