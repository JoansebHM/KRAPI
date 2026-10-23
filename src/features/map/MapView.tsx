import { useEffect, useRef } from 'react'
import { GeolocateControl, Map as MapLibreMap, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { env } from '../../config/env'
import { MANILA, MANILA_BOUNDS } from './manila'
import './MapView.css'

const BOUNDS_PADDING = 48

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: env.mapStyleUrl,
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

    map.on('load', () => {
      map.addSource('manila', { type: 'geojson', data: MANILA })
      map.addLayer({
        id: 'manila-fill',
        type: 'fill',
        source: 'manila',
        paint: { 'fill-color': '#0478fb', 'fill-opacity': 0.08 },
      })
      map.addLayer({
        id: 'manila-outline',
        type: 'line',
        source: 'manila',
        paint: { 'line-color': '#054a97', 'line-width': 3, 'line-dasharray': [2, 1] },
      })
    })

    return () => map.remove()
  }, [])

  return <div ref={containerRef} className="map-view" />
}
