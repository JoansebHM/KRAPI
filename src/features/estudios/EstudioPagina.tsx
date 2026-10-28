import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { Panel } from '../../components/Panel'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { AgregarEvidencia } from '../evidencias/AgregarEvidencia'
import { AgregarVideo } from '../evidencias/AgregarVideo'
import { GrabadorAudio } from '../evidencias/GrabadorAudio'
import { IconoTipoEvidencia } from '../evidencias/IconoTipoEvidencia'
import { ListaEvidencias } from '../evidencias/ListaEvidencias'
import { agregarArchivos } from '../evidencias/subidas'
import { useLugares } from '../lugares/api'
import { useSalidas } from '../salidas/api'
import { useArchivarEstudio, useEstudios, useGuardarEstudio, type CamposEstudio, type Estudio } from './api'
import { camposDe, cuandoFue, mostrarFecha, mostrarHora } from './campos'
import { FormularioEstudio } from './FormularioEstudio'
import { NotasDelEstudio } from './NotasDelEstudio'
import { ParticipantesDelEstudio } from './ParticipantesDelEstudio'
import './EstudioPagina.css'

/** Página de un estudio (`/lugares/:id/estudios/:estudioId`): sus datos y sus evidencias. */
export function EstudioPagina() {
  const { id: lugarId = '', estudioId = '' } = useParams()
  const navigate = useNavigate()
  const { data: lugares } = useLugares()
  const { data: salidas } = useSalidas()
  const { data: estudios, isPending, isError, refetch } = useEstudios(lugarId)
  const guardar = useGuardarEstudio()
  const archivar = useArchivarEstudio()
  const [edicion, setEdicion] = useState<CamposEstudio | null>(null)
  const [agregando, setAgregando] = useState<'opciones' | 'audio' | 'video' | null>(null)

  const volver = { a: `/lugares/${lugarId}`, etiqueta: 'Volver al lugar' }
  const lugar = lugares?.find((l) => l.id === lugarId)
  const nombreLugar = lugar?.nombre ?? 'Lugar'

  if (isPending || isError) {
    return (
      <Panel titulo="Estudio" volver={volver}>
        {isPending ? <ListaCargando filas={3} /> : <ErrorCarga mensaje="No se pudo cargar el estudio." onReintentar={() => refetch()} />}
      </Panel>
    )
  }

  const estudio = estudios.find((e) => e.id === estudioId)
  if (!estudio) {
    return (
      <Panel titulo="Estudio no encontrado" subtitulo={nombreLugar} volver={volver}>
        <EstadoVacio
          icono={<IconoTipoEvidencia tipo="documento" />}
          titulo="Este estudio no está en el histórico"
          descripcion="Puede que lo hayan archivado o que el enlace esté mal."
          accion={
            <Link to={volver.a} className="btn btn-secondary">
              Volver al lugar
            </Link>
          }
        />
      </Panel>
    )
  }


  async function guardarCambios(actual: Estudio) {
    await guardar.mutateAsync({ ...edicion!, ubicacionId: lugarId, id: actual.id })
    notificar.exito('Cambios guardados', { descripcion: `El estudio del ${cuandoFue(edicion!)} quedó actualizado.` })
    setEdicion(null)
  }

  async function archivarEstudio(actual: Estudio) {
    try {
      await archivar.mutateAsync({ id: actual.id, ubicacionId: lugarId, archivar: true })
      setEdicion(null)
      navigate(volver.a)
      notificar.exito('Estudio archivado', {
        descripcion: `El estudio del ${cuandoFue(actual)} ya no aparece en el histórico.`,
        accion: {
          texto: 'Deshacer',
          alHacer: () =>
            archivar.mutate(
              { id: actual.id, ubicacionId: lugarId, archivar: false },
              { onError: (error) => notificar.error('No se pudo recuperar', { descripcion: mensajeErrorDatos(error) }) },
            ),
        },
      })
    } catch (error) {
      notificar.error('No se pudo archivar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  function subir(archivos: File[]) {
    setAgregando(null)
    agregarArchivos({ tipo: 'estudio', id: estudio!.id }, archivos)
  }

  return (
    <Panel
      titulo={cuandoFue(estudio)}
      subtitulo={nombreLugar}
      volver={volver}
      pie={
        <button type="button" className="fab" onClick={() => setAgregando('opciones')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Agregar evidencia
        </button>
      }
    >
      <dl className="ficha-datos">
        <div>
          <dt>Fecha y hora</dt>
          <dd>
            {mostrarFecha(estudio.fecha)} · {mostrarHora(estudio.horaInicio)} – {mostrarHora(estudio.horaFin)}
          </dd>
        </div>
        <div>
          <dt>Participantes</dt>
          <dd>
            <ParticipantesDelEstudio estudio={estudio} claseLista="estudio-personas" claseVacio="estudio-sin-dato" />
          </dd>
        </div>
        {estudio.entrevistado && (
          <div>
            <dt>A quién se entrevistó</dt>
            <dd>{estudio.entrevistado}</dd>
          </div>
        )}
        {estudio.salidaId && (
          <div>
            <dt>Salida</dt>
            <dd>
              <Link to={`/salidas/${estudio.salidaId}`}>{salidas?.find((s) => s.id === estudio.salidaId)?.nombre ?? 'Ver historial de zona de salida'}</Link>
            </dd>
          </div>
        )}
      </dl>

      <NotasDelEstudio notas={estudio.notas} />

      <button type="button" className="btn btn-secondary estudio-editar" onClick={() => setEdicion(camposDe(estudio))}>
        Editar estudio
      </button>

      <ListaEvidencias dueno={{ tipo: 'estudio', id: estudio.id }} />

      {agregando === 'opciones' && (
        <AgregarEvidencia
          onArchivos={subir}
          onGrabarAudio={() => setAgregando('audio')}
          onVideo={() => setAgregando('video')}
          onCerrar={() => setAgregando(null)}
        />
      )}
      {agregando === 'audio' && <GrabadorAudio onUsar={(audio) => subir([audio])} onCerrar={() => setAgregando(null)} />}
      {agregando === 'video' && <AgregarVideo dueno={{ tipo: 'estudio', id: estudio.id }} onCerrar={() => setAgregando(null)} />}

      {edicion && (
        <FormularioEstudio
          titulo="Editar estudio"
          lugar={nombreLugar}
          esZona={lugar?.tipo === 'zona'}
          campos={edicion}
          onCambiar={setEdicion}
          onGuardar={() => guardarCambios(estudio)}
          textoGuardar="Guardar cambios"
          editando
          onCerrar={() => setEdicion(null)}
          otrasAcciones={(guardando) => (
            <>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setEdicion(null)} disabled={guardando}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-texto btn-texto-peligro"
                onClick={() => void archivarEstudio(estudio)}
                disabled={guardando || archivar.isPending}
              >
                Archivar estudio
              </button>
            </>
          )}
        />
      )}
    </Panel>
  )
}
