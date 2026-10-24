import { Link, useNavigate } from 'react-router'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { FlechaLista } from '../../components/FlechaLista'
import { notificar } from '../../lib/notificar'
import { Avatar } from '../responsables/Avatar'
import { semillaDe, useResponsables } from '../responsables/api'
import { useEstudios, useGuardarEstudio, type CamposEstudio } from './api'
import { mostrarFecha, mostrarHora } from './campos'
import { FormularioEstudio } from './FormularioEstudio'
import './EstudiosDelLugar.css'

interface EstudiosDelLugarProps {
  ubicacionId: string
  nombreLugar: string
  /** Estudio nuevo en preparación: el botón "Agregar estudio" está en el pie de la ficha. */
  nuevo: CamposEstudio | null
  onCambiarNuevo: (campos: CamposEstudio | null) => void
}

/**
 * Histórico de estudios de un lugar (del más reciente al más antiguo). Cada estudio abre su página,
 * donde se edita, se archiva y se le agregan evidencias.
 */
export function EstudiosDelLugar({ ubicacionId, nombreLugar, nuevo, onCambiarNuevo }: EstudiosDelLugarProps) {
  const { data: estudios, isPending, isError, refetch } = useEstudios(ubicacionId)
  const { data: responsables } = useResponsables()
  const guardar = useGuardarEstudio()
  const navigate = useNavigate()
  const responsablePorId = new Map((responsables ?? []).map((r) => [r.id, r]))

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
          descripcion="Cada visita a este lugar es un estudio: una entrevista o un levantamiento, con sus responsables."
        />
      ) : (
        <ul className="lista">
          {estudios.map((estudio) => {
            const personas = estudio.responsableIds.map((id) => responsablePorId.get(id)).filter((r) => r !== undefined)
            return (
              <li key={estudio.id}>
                <Link to={`/lugares/${ubicacionId}/estudios/${estudio.id}`} className="lista-item">
                  <span className="lista-item-textos">
                    <span className="lista-item-titulo">{estudio.titulo}</span>
                    <span className="lista-item-detalle">
                      {mostrarFecha(estudio.fecha)} · {mostrarHora(estudio.horaInicio)} – {mostrarHora(estudio.horaFin)}
                    </span>
                    {(estudio.entrevistado || personas.length > 0) && (
                      <span className="estudio-meta">
                        {personas.length > 0 && (
                          <span className="estudio-avatares">
                            {personas.slice(0, 4).map((r) => (
                              <Avatar key={r.id} semilla={semillaDe(r)} tamano={24} />
                            ))}
                            {personas.length > 4 && <span className="estudio-avatares-mas">+{personas.length - 4}</span>}
                            <span className="solo-lector">Responsables: {personas.map((r) => r.nombre).join(', ')}</span>
                          </span>
                        )}
                        {estudio.entrevistado && <span className="lista-item-detalle">Entrevista: {estudio.entrevistado}</span>}
                      </span>
                    )}
                  </span>
                  <FlechaLista />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {nuevo && (
        <FormularioEstudio
          titulo="Nuevo estudio"
          lugar={nombreLugar}
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
