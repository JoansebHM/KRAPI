import { Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { FeatureCollection } from 'geojson'
import { notificar } from '../../lib/notificar'
import { MiraCentral } from '../lugares/MiraCentral'
import type { GeoJSONSource, Map as MapLibreMap } from '../map/maplibre'
import { useMapa } from '../map/mapaContexto'
import { areaM2, mostrarArea, problemaDeZona, type Esquina } from './geometria'
import '../lugares/CrearPunto.css'
import './DibujarZona.css'

const FUENTE = 'dibujo-zona'
const CAPAS = ['dibujo-zona-relleno', 'dibujo-zona-borde', 'dibujo-zona-esquinas'] as const
/** El dibujo va en naranja para distinguirlo de las zonas guardadas (lila) y del límite de Manila (azul). */
const COLOR_DIBUJO = '#F79009'

interface DibujarZonaProps {
  /** A dónde lleva "Cancelar". */
  cancelarA: string
  textoTerminar: string
  /** Se llama con las esquinas cuando la zona es válida. */
  onTerminar: (esquinas: Esquina[]) => void
  /** Mientras se guarda, los botones quedan deshabilitados. */
  ocupado?: boolean
}

/**
 * Dibujar una zona con la mira fija en el centro: se mueve el mapa y se toca "Agregar esquina".
 * Se ve la forma (con el lado que se está por agregar) y su área. "Terminar" revisa que tenga
 * 3 esquinas o más, que quede en Manila, que sus lados no se crucen y que tenga al menos 20 m².
 */
export function DibujarZona({ cancelarA, textoTerminar, onTerminar, ocupado = false }: DibujarZonaProps) {
  const [esquinas, setEsquinas] = useState<Esquina[]>([])
  const area = areaM2(esquinas)
  const mensaje =
    esquinas.length === 0
      ? 'Mueve el mapa y agrega la primera esquina.'
      : `${esquinas.length} ${esquinas.length === 1 ? 'esquina' : 'esquinas'}${esquinas.length >= 3 ? ` · ${mostrarArea(area)}` : ''}`

  function terminar() {
    const problema = problemaDeZona(esquinas)
    if (problema) {
      notificar.aviso('Todavía no se puede terminar', { descripcion: problema })
      return
    }
    onTerminar(esquinas)
  }

  return (
    <div className="crear-punto">
      <MiraCentral mensaje={mensaje}>
        {({ centro, dentro }) => (
          <>
            <VistaPrevia esquinas={esquinas} centro={centro} />
            <div className="dibujo-barra">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEsquinas((actuales) => actuales.slice(0, -1))}
                disabled={esquinas.length === 0 || ocupado}
              >
                <Undo2 size={18} aria-hidden="true" />
                Deshacer
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => centro && setEsquinas((actuales) => [...actuales, centro])}
                disabled={!centro || !dentro || ocupado}
              >
                Agregar esquina
              </button>
              <Link to={cancelarA} className="btn btn-secondary">
                Cancelar
              </Link>
              <button type="button" className="btn btn-primary" onClick={terminar} disabled={esquinas.length < 3 || ocupado}>
                {ocupado ? 'Guardando…' : textoTerminar}
              </button>
            </div>
          </>
        )}
      </MiraCentral>
    </div>
  )
}

/** Dibuja en el mapa la zona en curso: las esquinas, sus lados y el lado hacia la mira. */
function VistaPrevia({ esquinas, centro }: { esquinas: Esquina[]; centro: Esquina | null }) {
  const mapa = useMapa()
  const datos = datosDeVistaPrevia(esquinas, centro)
  const actual = useRef(datos)
  useEffect(() => {
    actual.current = datos
  })

  // Crea la fuente y las capas, también después de cambiar de tema (el mapa recarga su estilo).
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
      for (const capa of CAPAS) if (mapa.getLayer(capa)) mapa.removeLayer(capa)
      if (mapa.getSource(FUENTE)) mapa.removeSource(FUENTE)
    }
  }, [mapa])

  useEffect(() => {
    ;(mapa?.getSource(FUENTE) as GeoJSONSource | undefined)?.setData(datos)
  }, [mapa, datos])

  return null
}

function datosDeVistaPrevia(esquinas: Esquina[], centro: Esquina | null): FeatureCollection {
  // El contorno pasa por la mira, para ver cómo quedaría la próxima esquina.
  const contorno = centro ? [...esquinas, centro] : esquinas
  return {
    type: 'FeatureCollection',
    features: [
      ...(contorno.length >= 3
        ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [[...contorno, contorno[0]]] } }]
        : []),
      ...(contorno.length >= 2
        ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: contorno } }]
        : []),
      ...esquinas.map((esquina) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: esquina } })),
    ],
  }
}

function asegurarCapas(mapa: MapLibreMap, datos: FeatureCollection) {
  if (!mapa.getSource(FUENTE)) mapa.addSource(FUENTE, { type: 'geojson', data: datos })
  if (!mapa.getLayer(CAPAS[0])) {
    mapa.addLayer({ id: CAPAS[0], type: 'fill', source: FUENTE, filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': COLOR_DIBUJO, 'fill-opacity': 0.2 } })
  }
  if (!mapa.getLayer(CAPAS[1])) {
    mapa.addLayer({
      id: CAPAS[1],
      type: 'line',
      source: FUENTE,
      filter: ['==', '$type', 'LineString'],
      paint: { 'line-color': COLOR_DIBUJO, 'line-width': 3, 'line-dasharray': [2, 1] },
    })
  }
  if (!mapa.getLayer(CAPAS[2])) {
    mapa.addLayer({
      id: CAPAS[2],
      type: 'circle',
      source: FUENTE,
      filter: ['==', '$type', 'Point'],
      paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': COLOR_DIBUJO, 'circle-stroke-width': 3 },
    })
  }
}
