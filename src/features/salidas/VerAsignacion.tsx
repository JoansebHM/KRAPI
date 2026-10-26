import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { useMapa } from '../map/mapaContexto'
import { Avatar } from '../usuarios/Avatar'
import { semillaDe, useUsuarios } from '../usuarios/api'
import { useSalidas } from './api'
import { cuandoEs } from './textos'
import './Salidas.css'

/** Una zona asignada sobre el mapa, sin panel encima: se encuadra y abajo va quién la cubre. */
export function VerAsignacion() {
  const { salidaId, asignacionId } = useParams()
  const mapa = useMapa()
  const { data: salidas } = useSalidas()
  const { data: cuentas } = useUsuarios()
  const salida = salidas?.find((s) => s.id === salidaId)
  const asignacion = salida?.asignaciones.find((a) => a.id === asignacionId)
  const encuadrada = useRef(false)

  useEffect(() => {
    if (!mapa || !asignacion || encuadrada.current) return
    encuadrada.current = true
    const anillo = asignacion.forma.coordinates[0]
    const lngs = anillo.map(([lng]) => lng)
    const lats = anillo.map(([, lat]) => lat)
    mapa.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: { top: 48, bottom: 200, left: 32, right: 32 }, maxZoom: 19, duration: 600 },
    )
  }, [mapa, asignacion])

  if (!salida || !asignacion) return null

  return (
    <div className="ver-asignacion" role="region" aria-label={asignacion.nombre}>
      <div className="ver-asignacion-textos">
        <strong>{asignacion.nombre}</strong>
        <span className="lista-item-detalle">
          {salida.nombre} · {cuandoEs(salida)}
        </span>
        <span className="ver-asignacion-personas">
          {asignacion.participantes.map((participacion) => {
            const cuenta = cuentas?.find((c) => c.id === participacion.usuarioId)
            return cuenta ? (
              <span key={cuenta.id} className="ver-asignacion-persona">
                <Avatar semilla={semillaDe(cuenta)} tamano={24} />
                {cuenta.nombre}
              </span>
            ) : null
          })}
        </span>
      </div>
      <Link to={`/salidas/${salida.id}`} className="btn btn-primary">
        Ver historial de zona de salida
      </Link>
    </div>
  )
}
