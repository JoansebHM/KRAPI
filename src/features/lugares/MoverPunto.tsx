import { useEffect, useRef } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { dentroDeManila } from '../map/manila'
import { useMapa } from '../map/mapaContexto'
import { useLugares, useMoverPunto, type Punto } from './api'
import { MiraCentral } from './MiraCentral'
import './CrearPunto.css'

/** Mover un punto: el mapa arranca sobre su posición y se mueve por debajo de la mira. */
export function MoverPunto() {
  const { id } = useParams()
  const mapa = useMapa()
  const navigate = useNavigate()
  const { data: lugares, isPending } = useLugares()
  const mover = useMoverPunto()
  const punto = lugares?.find((lugar): lugar is Punto => lugar.id === id && lugar.tipo === 'punto')
  const centrado = useRef(false)

  // Al abrir, el mapa se centra en la posición actual del punto (una sola vez).
  useEffect(() => {
    if (!mapa || !punto || centrado.current) return
    centrado.current = true
    const [lng, lat] = punto.geometria.coordinates
    mapa.jumpTo({ center: [lng, lat], zoom: Math.max(mapa.getZoom(), 18) })
  }, [mapa, punto])

  // Solo se mueven puntos visibles; si no está (archivado o una zona), se vuelve a su ficha.
  if (!isPending && !punto) return <Navigate to={`/lugares/${id}`} replace />
  if (!punto) return null

  async function guardar(centro: [number, number] | null) {
    if (!centro || !dentroDeManila(centro[0], centro[1])) return
    try {
      await mover.mutateAsync({ id: punto!.id, lng: centro[0], lat: centro[1] })
      notificar.exito('Punto movido', { descripcion: `«${punto!.nombre}» quedó en su nueva posición.` })
      navigate(`/lugares/${punto!.id}`)
    } catch (error) {
      notificar.error('No se pudo mover', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <div className="crear-punto">
      <MiraCentral mensaje={`Mueve el mapa hasta la nueva posición de «${punto.nombre}».`}>
        {({ centro, dentro }) => (
          <div className="crear-barra">
            <Link to={`/lugares/${punto.id}`} className="btn btn-secondary">
              Cancelar
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => void guardar(centro)} disabled={!dentro || mover.isPending}>
              {mover.isPending ? 'Guardando…' : 'Guardar aquí'}
            </button>
          </div>
        )}
      </MiraCentral>
    </div>
  )
}
