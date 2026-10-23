import { useEffect, useRef } from 'react'
import { GeolocateControl, Map as MapLibreMap, NavigationControl } from './maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { env } from '../../config/env'
import type { Theme } from '../theme/useTheme'
import { MANILA, MANILA_BOUNDS } from './manila'
import './MapView.css'

const BOUNDS_PADDING = 48

const BOUNDARY_COLORS: Record<Theme, { line: string; fill: string; fillOpacity: number }> = {
  light: { line: '#054a97', fill: '#0478fb', fillOpacity: 0.08 },
  dark: { line: '#3d9bff', fill: '#0478fb', fillOpacity: 0.14 },
}

interface MapViewProps {
  theme: Theme
}

export function MapView({ theme }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const themeRef = useRef(theme)
  const styleUrlRef = useRef(env.mapStyles[theme])

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleUrlRef.current,
      bounds: MANILA_BOUNDS,
      fitBoundsOptions: { padding: BOUNDS_PADDING },
      attributionControl: { compact: true },
    })

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

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Cambiar el mapa base cuando cambia el tema.
  useEffect(() => {
    themeRef.current = theme
    const map = mapRef.current
    if (!map) return
    const url = env.mapStyles[theme]
    if (url === styleUrlRef.current) return
    styleUrlRef.current = url
    map.setStyle(url, { diff: false })
  }, [theme])

  return <div ref={containerRef} className="map-view" />
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
