import { useState } from 'react'
import { Link } from 'react-router'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { Panel } from '../../components/Panel'
import { plural } from '../../lib/texto'
import { useAuth } from '../auth/useAuth'
import { estadoDe, useSalidas, yaEmpezo, type Asignacion, type Participacion, type Salida } from './api'
import { ReportarAsignacion } from './ReportarAsignacion'
import { IconoSalida } from './SalidasPage'
import { cuandoEs, textoDeEstado } from './textos'
import './Salidas.css'

interface MiAsignacion {
  salida: Salida
  asignacion: Asignacion
  participacion: Participacion
}

/** Las zonas que le asignaron a la cuenta: para saber qué cubrir y reportar cómo le fue. */
export function MisAsignacionesPage() {
  const { perfil } = useAuth()
  const { data: salidas, isPending, isError, refetch } = useSalidas()
  const [reportando, setReportando] = useState<MiAsignacion | null>(null)

  const mias: MiAsignacion[] = (salidas ?? []).flatMap((salida) =>
    salida.asignaciones.flatMap((asignacion) =>
      asignacion.participantes.filter((participacion) => participacion.usuarioId === perfil?.id).map((participacion) => ({ salida, asignacion, participacion })),
    ),
  )
  const porReportar = mias.filter(({ salida, participacion }) => estadoDe(salida, participacion) === 'sin-reportar' && yaEmpezo(salida)).length

  return (
    <Panel titulo="Mis asignaciones" subtitulo={salidas ? (porReportar > 0 ? `${plural(porReportar, 'por reportar')}` : plural(mias.length, 'zona')) : undefined}>
      {isPending && <ListaCargando />}
      {isError && <ErrorCarga mensaje="No se pudieron cargar tus asignaciones." onReintentar={() => void refetch()} />}
      {salidas && mias.length === 0 && (
        <EstadoVacio icono={<IconoSalida />} titulo="No tienes zonas asignadas" descripcion="Cuando un admin te asigne una zona en una salida, aparecerá aquí." />
      )}
      {mias.length > 0 && (
        <ul className="salida-zonas">
          {mias.map((mia) => {
            const { salida, asignacion, participacion } = mia
            const estado = estadoDe(salida, participacion)
            return (
              <li key={`${asignacion.id}`} className="salida-zona">
                <div className="salida-zona-encabezado">
                  <span className="salida-persona-textos">
                    <span className="salida-zona-nombre">{asignacion.nombre}</span>
                    <span className="lista-item-detalle">
                      {salida.nombre} · {cuandoEs(salida)}
                    </span>
                    <span className={`salida-estado salida-estado-${estado}`}>{textoDeEstado(salida, participacion)}</span>
                  </span>
                </div>
                <div className="salida-acciones">
                  <Link to={`/salidas/${salida.id}/zonas/${asignacion.id}`} className="btn btn-secondary">
                    Ver en el mapa
                  </Link>
                  {!salida.cancelada && yaEmpezo(salida) && (
                    <button type="button" className="btn btn-primary" onClick={() => setReportando(mia)}>
                      {participacion.porcentaje === null ? 'Reportar' : 'Corregir reporte'}
                    </button>
                  )}
                </div>
                <Link to={`/salidas/${salida.id}`} className="btn-texto">
                  Ver la salida completa
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {reportando && <ReportarAsignacion asignacion={reportando.asignacion} participacion={reportando.participacion} onCerrar={() => setReportando(null)} />}
    </Panel>
  )
}
