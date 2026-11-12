import { Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { Avatar } from '../usuarios/Avatar'
import { semillaDe, useNombreDeCuenta, useUsuarios } from '../usuarios/api'
import { useBorrarFragmento, useGuardarTarea, useMarcarTarea, type Fragmento, type Tarea } from './api'
import { FormularioFragmento } from './FormularioFragmento'
import { FormularioTarea } from './FormularioTarea'
import { avanceDe, estaEnCurso, rangoDe, tituloDe } from './textos'

const MAX_TEXTO = 300

interface FragmentoTarjetaProps {
  fragmento: Fragmento
  /** Si el checklist se ve desplegado al abrir la página. */
  abierto: boolean
}

/** Un fragmento del calendario: su rango de fechas, su avance y su checklist. */
export function FragmentoTarjeta({ fragmento, abierto }: FragmentoTarjetaProps) {
  const { total, hechas, porcentaje } = avanceDe(fragmento)
  const [editando, setEditando] = useState(false)
  const [porBorrar, setPorBorrar] = useState(false)
  const borrar = useBorrarFragmento()
  const titulo = tituloDe(fragmento)

  async function confirmarBorrar() {
    try {
      await borrar.mutateAsync(fragmento.id)
      notificar.exito('Fragmento borrado', { descripcion: `«${titulo}» se borró con sus tareas.` })
      setPorBorrar(false)
    } catch (error) {
      notificar.error('No se pudo borrar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <li className="cronograma-fragmento">
      <details open={abierto}>
        <summary className="cronograma-resumen">
          <span className="cronograma-textos">
            <span className="cronograma-titulo">
              {titulo}
              {estaEnCurso(fragmento) && <span className="cronograma-etiqueta"> En curso</span>}
            </span>
            {fragmento.titulo && <span className="lista-item-detalle">{rangoDe(fragmento)}</span>}
            <span className="lista-item-detalle">{total === 0 ? 'Sin tareas' : `${hechas} de ${total} hechas`}</span>
          </span>
          <span className="cronograma-barra" aria-hidden="true">
            <span className="cronograma-barra-relleno" style={{ width: `${porcentaje}%` }} />
          </span>
        </summary>

        <div className="cronograma-cuerpo">
          {fragmento.tareas.length > 0 && (
            <ul className="cronograma-tareas">
              {fragmento.tareas.map((tarea) => (
                <FilaTarea key={tarea.id} tarea={tarea} />
              ))}
            </ul>
          )}
          <FormularioNuevaTarea fragmentoId={fragmento.id} />
          <button type="button" className="btn-texto cronograma-editar" onClick={() => setEditando(true)}>
            <Pencil size={16} aria-hidden="true" /> Editar fragmento
          </button>
        </div>
      </details>

      {editando && (
        <FormularioFragmento
          fragmento={fragmento}
          onCerrar={() => setEditando(false)}
          onBorrar={() => {
            // La confirmación va sola: el formulario se cierra para que no queden dos diálogos apilados.
            setEditando(false)
            setPorBorrar(true)
          }}
        />
      )}
      {porBorrar && (
        <Dialog
          titulo={`¿Borrar «${titulo}»?`}
          onCerrar={borrar.isPending ? undefined : () => setPorBorrar(false)}
          acciones={
            <>
              <button type="button" className="btn btn-danger btn-block" disabled={borrar.isPending} onClick={() => void confirmarBorrar()}>
                {borrar.isPending ? 'Borrando…' : 'Borrar'}
              </button>
              <button type="button" className="btn btn-secondary btn-block" disabled={borrar.isPending} onClick={() => setPorBorrar(false)}>
                Cancelar
              </button>
            </>
          }
        >
          <p>
            Se borra el fragmento con {total === 1 ? 'su tarea' : `sus ${total} tareas`}. <strong>No se puede deshacer.</strong>
          </p>
        </Dialog>
      )}
    </li>
  )
}

function FilaTarea({ tarea }: { tarea: Tarea }) {
  const marcar = useMarcarTarea()
  const nombreDe = useNombreDeCuenta()
  const { data: cuentas } = useUsuarios()
  const responsables = tarea.responsableIds.map((id) => cuentas?.find((cuenta) => cuenta.id === id)).filter((cuenta) => cuenta !== undefined)
  const [editando, setEditando] = useState(false)

  // La casilla se actualiza en el mismo toque (si espera al caché de consultas, que avisa un instante
  // después, React la devuelve a su valor anterior y parpadea). Vale mientras el valor guardado siga igual.
  const [pendiente, setPendiente] = useState<{ base: boolean; valor: boolean } | null>(null)
  const hecha = pendiente && pendiente.base === tarea.hecha ? pendiente.valor : tarea.hecha

  function alMarcar(valor: boolean) {
    setPendiente({ base: tarea.hecha, valor })
    marcar(tarea.id, valor, (error) => {
      setPendiente(null)
      notificar.error('No se pudo actualizar la tarea', { descripcion: mensajeErrorDatos(error) })
    })
  }

  return (
    <li className="cronograma-tarea">
      <label className="cronograma-tarea-principal">
        <input type="checkbox" className="cronograma-casilla" checked={hecha} onChange={(evento) => alMarcar(evento.target.checked)} />
        <span className="cronograma-tarea-textos">
          <span className={`cronograma-tarea-texto${hecha ? ' cronograma-tarea-hecha' : ''}`}>{tarea.texto}</span>
          {tarea.responsableIds.length > 0 && (
            <span className="cronograma-responsables">
              <span className="cronograma-avatares">
                {responsables.map((cuenta) => (
                  <Avatar key={cuenta.id} semilla={semillaDe(cuenta)} tamano={22} />
                ))}
              </span>
              <span className="lista-item-detalle">
                {tarea.responsableIds.length === 1 ? 'Responsable' : 'Responsables'}: {tarea.responsableIds.map((id) => nombreDe(id) ?? '…').join(', ')}
              </span>
            </span>
          )}
        </span>
      </label>
      <button type="button" className="icon-btn" aria-label={`Editar la tarea «${tarea.texto}»`} title="Editar" onClick={() => setEditando(true)}>
        <Pencil size={18} aria-hidden="true" />
      </button>
      {editando && <FormularioTarea tarea={tarea} onCerrar={() => setEditando(false)} />}
    </li>
  )
}

/** Campo para agregar una tarea al final de la lista sin abrir un diálogo. */
function FormularioNuevaTarea({ fragmentoId }: { fragmentoId: string }) {
  const [texto, setTexto] = useState('')
  const guardar = useGuardarTarea()

  async function agregar(evento: FormEvent) {
    evento.preventDefault()
    if (!texto.trim()) return
    try {
      await guardar.mutateAsync({ fragmentoId, texto, responsableIds: [] })
      setTexto('')
    } catch (error) {
      notificar.error('No se pudo agregar la tarea', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <form className="cronograma-nueva" onSubmit={(evento) => void agregar(evento)}>
      <input
        className="field-input"
        type="text"
        aria-label="Nueva tarea"
        placeholder="Agregar una tarea…"
        maxLength={MAX_TEXTO}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />
      <button type="submit" className="btn btn-primary" disabled={guardar.isPending || !texto.trim()}>
        Agregar
      </button>
    </form>
  )
}
