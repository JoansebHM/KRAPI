import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { FlechaLista } from '../../components/FlechaLista'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { plural } from '../../lib/texto'
import { Avatar } from '../usuarios/Avatar'
import { semillaDe, useUsuarios } from '../usuarios/api'
import { useArchivarEstudio, useEstudios, useGuardarEstudio, type CamposEstudio, type Estudio } from './api'
import { camposDe, mostrarFecha, mostrarHora } from './campos'
import { FormularioEstudio } from './FormularioEstudio'
import { EstudioPresentacion } from './EstudioPresentacion'
import './EstudiosDelLugar.css'

interface EstudiosDelLugarProps {
  ubicacionId: string
  nombreLugar: string
  /** Los estudios de una zona son recorridos: no tienen "a quién se entrevistó". */
  esZona?: boolean
  /** Estudio nuevo en preparación: el botón "Agregar estudio" está en el pie de la ficha. */
  nuevo: CamposEstudio | null
  onCambiarNuevo: (campos: CamposEstudio | null) => void
}

/**
 * Histórico de estudios de un lugar (del más reciente al más antiguo). Cada estudio abre su página,
 * donde se edita, se archiva y se le agregan evidencias.
 */
export function EstudiosDelLugar({ ubicacionId, nombreLugar, esZona = false, nuevo, onCambiarNuevo }: EstudiosDelLugarProps) {
  const { data: estudios, isPending, isError, refetch } = useEstudios(ubicacionId)
  const { data: cuentas } = useUsuarios()
  const guardar = useGuardarEstudio()
  const archivar = useArchivarEstudio()
  const navigate = useNavigate()
  const [estudioAbierto, setEstudioAbierto] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [edicion, setEdicion] = useState<CamposEstudio | null>(null)
  const cuentaPorId = new Map((cuentas ?? []).map((cuenta) => [cuenta.id, cuenta]))
  const estudioSeleccionado = estudios?.find((estudio) => estudio.id === estudioAbierto)

  function editar(estudio: Estudio) {
    setEdicion(camposDe(estudio))
    setEditando(true)
  }

  async function guardarCambios() {
    if (!estudioSeleccionado || !edicion) return
    await guardar.mutateAsync({ ...edicion, ubicacionId, id: estudioSeleccionado.id })
    notificar.exito('Cambios guardados', { descripcion: `«${edicion.titulo.trim()}» quedó actualizado.` })
    setEditando(false)
  }

  async function archivarEstudio(estudio: Estudio) {
    try {
      await archivar.mutateAsync({ id: estudio.id, ubicacionId, archivar: true })
      setEstudioAbierto(null)
      setEditando(false)
      setEdicion(null)
      notificar.exito('Estudio archivado', {
        descripcion: `«${estudio.titulo}» ya no aparece en el histórico.`,
        accion: {
          texto: 'Deshacer',
          alHacer: () =>
            archivar.mutate(
              { id: estudio.id, ubicacionId, archivar: false },
              { onError: (error) => notificar.error('No se pudo recuperar', { descripcion: mensajeErrorDatos(error) }) },
            ),
        },
      })
    } catch (error) {
      notificar.error('No se pudo archivar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  async function guardarNuevo() {
    if (!nuevo) return
    const id = await guardar.mutateAsync({ ...nuevo, ubicacionId })
    notificar.exito('Estudio guardado', { descripcion: `«${nuevo.titulo.trim()}» quedó en el histórico. Ahora agrégale las evidencias.` })
    onCambiarNuevo(null)
    navigate(`/lugares/${ubicacionId}/estudios/${id}`)
  }

  return (
    <section className="estudios" aria-labelledby="estudios-titulo">
      <h2 id="estudios-titulo" className="estudios-titulo">
        Estudios
        {estudios && estudios.length > 0 && <span className="estudios-cantidad"> · {estudios.length}</span>}
      </h2>

      {isPending ? (
        <ListaCargando filas={2} />
      ) : isError ? (
        <ErrorCarga mensaje="No se pudieron cargar los estudios." onReintentar={() => refetch()} />
      ) : estudios.length === 0 ? (
        <EstadoVacio
          icono={<IconoEstudio />}
          titulo="Aún no hay estudios"
          descripcion="Cada visita a este lugar es un estudio: una entrevista o un levantamiento, con quiénes fueron."
        />
      ) : (
        <ul className="lista">
          {estudios.map((estudio) => {
            const personas = estudio.participanteIds.map((id) => cuentaPorId.get(id)).filter((cuenta) => cuenta !== undefined)
            return (
              <li key={estudio.id}>
                <button type="button" className="lista-item" onClick={() => setEstudioAbierto(estudio.id)}>
                  <span className="lista-item-textos">
                    <span className="lista-item-titulo">{estudio.titulo}</span>
                    <span className="lista-item-detalle">
                      {mostrarFecha(estudio.fecha)} · {mostrarHora(estudio.horaInicio)} – {mostrarHora(estudio.horaFin)}
                      {` · ${estudio.evidencias === 0 ? 'Sin evidencias' : plural(estudio.evidencias, 'evidencia')}`}
                    </span>
                    {(estudio.entrevistado || personas.length > 0) && (
                      <span className="estudio-meta">
                        {personas.length > 0 && (
                          <span className="estudio-avatares">
                            {personas.slice(0, 4).map((r) => (
                              <Avatar key={r.id} semilla={semillaDe(r)} tamano={24} />
                            ))}
                            {personas.length > 4 && <span className="estudio-avatares-mas">+{personas.length - 4}</span>}
                            <span className="solo-lector">Participantes: {personas.map((r) => r.nombre).join(', ')}</span>
                          </span>
                        )}
                        {estudio.entrevistado && <span className="lista-item-detalle">Entrevista: {estudio.entrevistado}</span>}
                      </span>
                    )}
                  </span>
                  <FlechaLista />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {nuevo && (
        <FormularioEstudio
          titulo="Nuevo estudio"
          lugar={nombreLugar}
          esZona={esZona}
          campos={nuevo}
          onCambiar={onCambiarNuevo}
          onGuardar={guardarNuevo}
          textoGuardar="Guardar estudio"
          onCerrar={() => onCambiarNuevo(null)}
          otrasAcciones={(guardando) => (
            <button type="button" className="btn btn-secondary btn-block" onClick={() => onCambiarNuevo(null)} disabled={guardando}>
              Cancelar
            </button>
          )}
        />
      )}

      {estudioSeleccionado &&
        (editando && edicion ? (
          <FormularioEstudio
            titulo="Editar estudio"
            lugar={nombreLugar}
          esZona={esZona}
            campos={edicion}
            onCambiar={setEdicion}
            onGuardar={guardarCambios}
            textoGuardar="Guardar cambios"
            editando
            onCerrar={() => setEditando(false)}
            otrasAcciones={(guardando) => (
              <button
                type="button"
                className="btn-texto btn-texto-peligro"
                onClick={() => void archivarEstudio(estudioSeleccionado)}
                disabled={guardando || archivar.isPending}
              >
                Archivar estudio
              </button>
            )}
          />
        ) : (
          <EstudioPresentacion
            key={estudioSeleccionado.id}
            estudio={estudioSeleccionado}
            nombreLugar={nombreLugar}
            onEditar={() => editar(estudioSeleccionado)}
            onAgregarEvidencia={() => navigate(`/lugares/${ubicacionId}/estudios/${estudioSeleccionado.id}`)}
            onCerrar={() => setEstudioAbierto(null)}
          />
        ))}
    </section>
  )
}

function IconoEstudio() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3h6l1 2h3v16H5V5h3z" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  )
}
