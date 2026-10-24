import { useState } from 'react'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { FlechaLista } from '../../components/FlechaLista'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { Avatar } from '../responsables/Avatar'
import { semillaDe, useResponsables } from '../responsables/api'
import { useArchivarEstudio, useEstudios, useGuardarEstudio, type CamposEstudio, type Estudio } from './api'
import { camposDe, mostrarFecha, mostrarHora } from './campos'
import { FormularioEstudio } from './FormularioEstudio'
import './EstudiosDelLugar.css'

type Formulario = { tipo: 'nuevo'; campos: CamposEstudio } | { tipo: 'editar'; estudio: Estudio; campos: CamposEstudio }

interface EstudiosDelLugarProps {
  ubicacionId: string
  nombreLugar: string
  /** Estudio nuevo en preparación: el botón "Agregar estudio" está en el pie de la ficha. */
  nuevo: CamposEstudio | null
  onCambiarNuevo: (campos: CamposEstudio | null) => void
}

/** Histórico de estudios de un lugar (del más reciente al más antiguo), para agregar, editar y archivar. */
export function EstudiosDelLugar({ ubicacionId, nombreLugar, nuevo, onCambiarNuevo }: EstudiosDelLugarProps) {
  const { data: estudios, isPending, isError, refetch } = useEstudios(ubicacionId)
  const { data: responsables } = useResponsables()
  const guardar = useGuardarEstudio()
  const archivar = useArchivarEstudio()
  const [editando, setEditando] = useState<Formulario | null>(null)

  const formulario: Formulario | null = nuevo ? { tipo: 'nuevo', campos: nuevo } : editando
  const responsablePorId = new Map((responsables ?? []).map((r) => [r.id, r]))

  function cerrar() {
    setEditando(null)
    onCambiarNuevo(null)
  }

  async function guardarFormulario() {
    if (!formulario) return
    await guardar.mutateAsync({
      ...formulario.campos,
      ubicacionId,
      id: formulario.tipo === 'editar' ? formulario.estudio.id : undefined,
    })
    notificar.exito(formulario.tipo === 'editar' ? 'Cambios guardados' : 'Estudio guardado', {
      descripcion: `«${formulario.campos.titulo.trim()}» quedó en el histórico de ${nombreLugar}.`,
    })
    cerrar()
  }

  async function archivarEstudio(estudio: Estudio) {
    try {
      await archivar.mutateAsync({ id: estudio.id, ubicacionId, archivar: true })
      cerrar()
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
                <button
                  type="button"
                  className="lista-item"
                  onClick={() => setEditando({ tipo: 'editar', estudio, campos: camposDe(estudio) })}
                >
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
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {formulario && (
        <FormularioEstudio
          titulo={formulario.tipo === 'editar' ? 'Editar estudio' : 'Nuevo estudio'}
          lugar={nombreLugar}
          campos={formulario.campos}
          onCambiar={(campos) => (formulario.tipo === 'nuevo' ? onCambiarNuevo(campos) : setEditando({ ...formulario, campos }))}
          onGuardar={guardarFormulario}
          textoGuardar={formulario.tipo === 'editar' ? 'Guardar cambios' : 'Guardar estudio'}
          editando={formulario.tipo === 'editar'}
          onCerrar={cerrar}
          otrasAcciones={(guardando) => (
            <>
              <button type="button" className="btn btn-secondary btn-block" onClick={cerrar} disabled={guardando}>
                Cancelar
              </button>
              {formulario.tipo === 'editar' && (
                <button
                  type="button"
                  className="btn-texto btn-texto-peligro"
                  onClick={() => void archivarEstudio(formulario.estudio)}
                  disabled={guardando || archivar.isPending}
                >
                  Archivar estudio
                </button>
              )}
            </>
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
