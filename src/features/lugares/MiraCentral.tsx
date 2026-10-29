import { useEffect, useState, type ReactNode } from 'react'
import { notificar } from '../../lib/notificar'
import { dentroDeManila } from '../map/manila'
import { useMapa } from '../map/mapaContexto'

export interface PosicionMira {
  /** [lng, lat] del centro del mapa, o null mientras se crea el mapa. */
  centro: [number, number] | null
  dentro: boolean
}

interface MiraCentralProps {
  /** Qué hacer, mientras la mira está dentro de Manila. */
  mensaje: string
  /**
   * Si se pasa, aparece el botón "Usar mi ubicación": pide la ubicación al navegador y, si está dentro
   * de Manila, deja el punto ahí y llama a esta función con ella. Solo crear un punto lo usa.
   */
  onUsarUbicacion?: (posicion: [number, number]) => void
  /** La barra de abajo con sus botones, que reciben la posición de la mira. */
  children: (posicion: PosicionMira) => ReactNode
}

/**
 * Mira fija en el centro del mapa: se mueve el mapa por debajo para elegir una posición. Avisa si
 * queda fuera de Manila y trae el botón "Mi ubicación". La usan crear y mover un punto.
 */
export function MiraCentral({ mensaje, onUsarUbicacion, children }: MiraCentralProps) {
  const mapa = useMapa()
  const [centro, setCentro] = useState<[number, number] | null>(() => mapa?.getCenter().toArray() ?? null)
  const [localizando, setLocalizando] = useState(false)

  useEffect(() => {
    if (!mapa) return
    const actualizar = () => setCentro(mapa.getCenter().toArray())
    actualizar()
    mapa.on('move', actualizar)
    return () => {
      mapa.off('move', actualizar)
    }
  }, [mapa])

  const dentro = centro ? dentroDeManila(centro[0], centro[1]) : false

  /** Pide la ubicación al navegador (que pregunta si se permite) y lleva el mapa hasta ella. */
  function irAMiUbicacion(usarla = false) {
    if (!mapa) return
    if (!('geolocation' in navigator)) {
      notificar.error('No se puede usar tu ubicación', { descripcion: 'Este navegador no lo permite.' })
      return
    }
    setLocalizando(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocalizando(false)
        if (!dentroDeManila(coords.longitude, coords.latitude)) {
          notificar.aviso('Estás fuera de Manila', { descripcion: 'Mueve el mapa hasta el lugar que quieres registrar.' })
        }
        mapa.flyTo({ center: [coords.longitude, coords.latitude], zoom: Math.max(mapa.getZoom(), 18) })
        if (usarla && dentroDeManila(coords.longitude, coords.latitude)) onUsarUbicacion?.([coords.longitude, coords.latitude])
      },
      () => {
        setLocalizando(false)
        notificar.error('No se pudo obtener tu ubicación', { descripcion: 'Revisa que el permiso de ubicación esté activado.' })
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  return (
    <>
      <div className={`crear-mira${dentro ? '' : ' crear-mira-fuera'}`} aria-hidden="true">
        <svg viewBox="0 0 48 48" width="48" height="48">
          <circle cx="24" cy="24" r="10" />
          <path d="M24 2v12M24 34v12M2 24h12M34 24h12" />
          <circle cx="24" cy="24" r="2" className="crear-mira-centro" />
        </svg>
      </div>

      <p className={`crear-aviso${dentro ? '' : ' crear-aviso-fuera'}`} role="status">
        {dentro ? mensaje : 'No se puede registrar fuera de Manila.'}
      </p>

      <button
        type="button"
        className="crear-mi-ubicacion"
        onClick={() => irAMiUbicacion()}
        disabled={localizando || !mapa}
        aria-label="Mi ubicación"
        title="Mi ubicación"
        aria-busy={localizando}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>

      {onUsarUbicacion && (
        <button type="button" className="btn btn-secondary crear-usar-ubicacion" onClick={() => irAMiUbicacion(true)} disabled={localizando || !mapa} aria-busy={localizando}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          {localizando ? 'Buscando…' : 'Usar mi ubicación'}
        </button>
      )}

      {children({ centro, dentro })}
    </>
  )
}
