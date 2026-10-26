import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { Panel } from '../../components/Panel'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { plural } from '../../lib/texto'
import { useAuth } from '../auth/useAuth'
import { Avatar } from '../usuarios/Avatar'
import { semillaDe, useUsuarios } from '../usuarios/api'
import { estadoDe, useCancelarSalida, useGuardarAsignacion, useQuitarAsignacion, useSalidas, yaEmpezo, type Asignacion, type Participacion, type Salida } from './api'
import { FormularioAsignacion } from './FormularioAsignacion'
import { FormularioSalida } from './FormularioSalida'
import { ReportarAsignacion } from './ReportarAsignacion'
import { IconoSalida } from './SalidasPage'
import { cuandoEs, textoDeEstado } from './textos'
import './Salidas.css'

/** Una salida: sus zonas, quiénes las cubren y cómo van. Los admins la arman; cada quien reporta lo suyo. */
export function SalidaPagina() {
  const { id } = useParams()
  const { esAdmin } = useAuth()
  const { data: salidas, isPending, isError, refetch } = useSalidas()
  const cancelar = useCancelarSalida()
  const [editando, setEditando] = useState(false)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const salida = salidas?.find((s) => s.id === id)
  const volver = { a: '/salidas', etiqueta: 'Volver a las salidas' }

  if (isPending || isError || !salida) {
    return (
      <Panel titulo="Salida" volver={volver}>
        {isPending && <ListaCargando filas={2} />}
        {isError && <ErrorCarga mensaje="No se pudo cargar la salida." onReintentar={() => void refetch()} />}
        {salidas && !salida && <EstadoVacio icono={<IconoSalida />} titulo="Esta salida no existe" descripcion="Puede que la hayan borrado o que el enlace esté mal." />}
      </Panel>
    )
  }

  async function cambiarCancelada(cancelada: boolean) {
    try {
      await cancelar.mutateAsync({ id: salida!.id, cancelar: cancelada })
      setConfirmarCancelar(false)
      notificar.exito(cancelada ? 'Salida cancelada' : 'Salida reactivada')
    } catch (error) {
      notificar.error('No se pudo cambiar la salida', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <Panel
      titulo={salida.nombre}
      subtitulo={cuandoEs(salida)}
      volver={volver}
      pie={
        esAdmin && !salida.cancelada ? (
          <Link to={`/salidas/${salida.id}/zonas/nueva`} className="fab">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Agregar zona
          </Link>
        ) : undefined
      }
    >
      {salida.cancelada && <p className="alert alert-info">Esta salida se canceló. Sus zonas quedan en el histórico.</p>}

      {esAdmin && (
        <div className="salida-acciones">
          <button type="button" className="btn btn-secondary" onClick={() => setEditando(true)}>
            Editar salida
          </button>
          {salida.cancelada ? (
            <button type="button" className="btn btn-secondary" onClick={() => void cambiarCancelada(false)} disabled={cancelar.isPending}>
              Reactivar
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmarCancelar(true)}>
              Cancelar salida
            </button>
          )}
        </div>
      )}

      <h2 className="salidas-grupo-titulo">
        Zonas
        {salida.asignaciones.length > 0 && <span className="zona-seccion-cantidad"> · {salida.asignaciones.length}</span>}
      </h2>
      {salida.asignaciones.length === 0 ? (
        <p className="salida-vacio">
          {esAdmin ? 'Toca "Agregar zona" para dibujar la primera zona y asignarla.' : 'Aún no hay zonas asignadas en esta salida.'}
        </p>
      ) : (
        <ul className="salida-zonas">
          {salida.asignaciones.map((asignacion) => (
            <ZonaAsignada key={asignacion.id} salida={salida} asignacion={asignacion} />
          ))}
        </ul>
      )}

      {editando && <FormularioSalida salida={salida} onCerrar={() => setEditando(false)} onGuardada={() => setEditando(false)} />}
      {confirmarCancelar && (
        <Dialog
          titulo={`¿Cancelar «${salida.nombre}»?`}
          onCerrar={cancelar.isPending ? undefined : () => setConfirmarCancelar(false)}
          acciones={
            <>
              <button type="button" className="btn btn-danger btn-block" onClick={() => void cambiarCancelada(true)} disabled={cancelar.isPending}>
                {cancelar.isPending ? 'Cancelando…' : 'Cancelar salida'}
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setConfirmarCancelar(false)} disabled={cancelar.isPending}>
                Volver
              </button>
            </>
          }
        >
          <p>Las personas asignadas verán que se canceló. Sus zonas quedan en el histórico y se puede reactivar.</p>
        </Dialog>
      )}
    </Panel>
  )
}

function ZonaAsignada({ salida, asignacion }: { salida: Salida; asignacion: Asignacion }) {
  const { perfil, esAdmin } = useAuth()
  const { data: cuentas } = useUsuarios()
  const quitar = useQuitarAsignacion()
  const guardar = useGuardarAsignacion()
  const [reportando, setReportando] = useState<Participacion | null>(null)
  const [editando, setEditando] = useState(false)
  const [confirmarQuitar, setConfirmarQuitar] = useState(false)
  const mia = asignacion.participantes.find((participacion) => participacion.usuarioId === perfil?.id)
  const puedeReportar = !salida.cancelada && yaEmpezo(salida)

  async function quitarZona() {
    try {
      await quitar.mutateAsync(asignacion.id)
      notificar.exito('Zona quitada', { descripcion: `«${asignacion.nombre}» ya no está en la salida.` })
    } catch (error) {
      notificar.error('No se pudo quitar la zona', { descripcion: mensajeErrorDatos(error) })
    }
  }

  async function guardarCambios({ nombre, participanteIds }: { nombre: string; participanteIds: string[] }) {
    try {
      await guardar.mutateAsync({
        id: asignacion.id,
        salidaId: salida.id,
        nombre,
        participanteIds,
        anteriores: asignacion.participantes.map((participacion) => participacion.usuarioId),
      })
      notificar.exito('Cambios guardados')
      setEditando(false)
    } catch (error) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <li className="salida-zona">
      <div className="salida-zona-encabezado">
        <h3 className="salida-zona-nombre">{asignacion.nombre}</h3>
        <Link to={`/salidas/${salida.id}/zonas/${asignacion.id}`} className="btn btn-secondary salida-zona-ver">
          Ver en el mapa
        </Link>
      </div>
      <ul className="salida-personas">
        {asignacion.participantes.map((participacion) => {
          const cuenta = cuentas?.find((c) => c.id === participacion.usuarioId)
          const estado = estadoDe(salida, participacion)
          return (
            <li key={participacion.usuarioId} className="salida-persona">
              {cuenta && <Avatar semilla={semillaDe(cuenta)} tamano={32} />}
              <span className="salida-persona-textos">
                <span className="salida-persona-nombre">{cuenta?.nombre ?? 'Cuenta'}</span>
                <span className={`salida-estado salida-estado-${estado}`}>{textoDeEstado(salida, participacion)}</span>
              </span>
              {puedeReportar && (participacion.usuarioId === perfil?.id || esAdmin) && (
                <button type="button" className="btn btn-secondary salida-reportar" onClick={() => setReportando(participacion)}>
                  {participacion.porcentaje === null ? 'Reportar' : 'Corregir'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <div className="salida-zona-acciones">
        {(mia || esAdmin) && (
          <Link to={`/zonas/nueva?asignacion=${asignacion.id}`} className="btn-texto">
            Registrar el recorrido como zona del mapa
          </Link>
        )}
        {esAdmin && !salida.cancelada && (
          <>
            <button type="button" className="btn-texto" onClick={() => setEditando(true)}>
              Editar zona
            </button>
            <button type="button" className="btn-texto btn-texto-peligro" onClick={() => setConfirmarQuitar(true)}>
              Quitar zona
            </button>
          </>
        )}
      </div>

      {reportando && <ReportarAsignacion asignacion={asignacion} participacion={reportando} onCerrar={() => setReportando(null)} />}
      {editando && (
        <FormularioAsignacion
          titulo="Editar zona asignada"
          nombreInicial={asignacion.nombre}
          participantesIniciales={asignacion.participantes.map((participacion) => participacion.usuarioId)}
          onGuardar={guardarCambios}
          textoGuardar="Guardar cambios"
          onCerrar={() => setEditando(false)}
        />
      )}
      {confirmarQuitar && (
        <Dialog
          titulo={`¿Quitar «${asignacion.nombre}»?`}
          onCerrar={quitar.isPending ? undefined : () => setConfirmarQuitar(false)}
          acciones={
            <>
              <button type="button" className="btn btn-danger btn-block" onClick={() => void quitarZona()} disabled={quitar.isPending}>
                {quitar.isPending ? 'Quitando…' : 'Quitar zona'}
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setConfirmarQuitar(false)} disabled={quitar.isPending}>
                Cancelar
              </button>
            </>
          }
        >
          <p>
            Se quita de la salida con {plural(asignacion.participantes.length, 'persona asignada', 'personas asignadas')} y sus reportes. No se puede
            deshacer.
          </p>
        </Dialog>
      )}
    </li>
  )
}
