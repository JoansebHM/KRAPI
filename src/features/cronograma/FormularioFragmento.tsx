import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { fechaLocal } from '../estudios/campos'
import { useGuardarFragmento, type Fragmento } from './api'

const MAX_TITULO = 120

/** Hoy más `dias`, como 'AAAA-MM-DD'. */
function enDias(dias: number) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return fechaLocal(fecha)
}

interface FormularioFragmentoProps {
  fragmento?: Fragmento
  onCerrar: () => void
  /** Solo al editar: abre la confirmación para borrar el fragmento. */
  onBorrar?: () => void
}

/** Título (opcional) y fechas de un fragmento del cronograma. Por defecto, hoy y los 6 días siguientes. */
export function FormularioFragmento({ fragmento, onCerrar, onBorrar }: FormularioFragmentoProps) {
  const [titulo, setTitulo] = useState(fragmento?.titulo ?? '')
  const [fechaInicio, setFechaInicio] = useState(fragmento?.fechaInicio ?? fechaLocal())
  const [fechaFin, setFechaFin] = useState(fragmento?.fechaFin ?? enDias(6))
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const guardar = useGuardarFragmento()
  const errorFechas = !fechaInicio || !fechaFin ? 'Elige la fecha de inicio y la de fin.' : fechaFin < fechaInicio ? 'La fecha de fin no puede ser antes de la de inicio.' : null

  async function alGuardar() {
    setIntentoGuardar(true)
    if (errorFechas) return
    try {
      await guardar.mutateAsync({ id: fragmento?.id, titulo, fechaInicio, fechaFin })
      notificar.exito(fragmento ? 'Cambios guardados' : 'Fragmento creado', { descripcion: fragmento ? undefined : 'Ahora agrégale las tareas.' })
      onCerrar()
    } catch (error) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <Dialog
      titulo={fragmento ? 'Editar fragmento' : 'Nuevo fragmento'}
      onCerrar={guardar.isPending ? undefined : onCerrar}
      onSubmit={() => void alGuardar()}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : fragmento ? 'Guardar cambios' : 'Crear fragmento'}
          </button>
          {onBorrar && (
            <button type="button" className="btn-texto btn-texto-peligro" onClick={onBorrar} disabled={guardar.isPending}>
              Borrar fragmento
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={guardar.isPending}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">Título (opcional)</span>
          <input
            className="field-input"
            type="text"
            placeholder="Ej.: Semana de entrevistas"
            maxLength={MAX_TITULO}
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
          />
        </label>
        <div className="cronograma-fechas">
          <label className="field">
            <span className="field-label">Desde</span>
            <input className="field-input" type="date" value={fechaInicio} onChange={(evento) => setFechaInicio(evento.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Hasta</span>
            <input
              className="field-input"
              type="date"
              value={fechaFin}
              aria-invalid={intentoGuardar && errorFechas ? true : undefined}
              onChange={(evento) => setFechaFin(evento.target.value)}
            />
          </label>
        </div>
        {intentoGuardar && errorFechas && <p className="field-error">{errorFechas}</p>}
      </div>
    </Dialog>
  )
}
