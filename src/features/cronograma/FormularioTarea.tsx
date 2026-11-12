import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useUsuarios } from '../usuarios/api'
import { useBorrarTarea, useGuardarTarea, type Tarea } from './api'

const MAX_TEXTO = 300

interface FormularioTareaProps {
  tarea: Tarea
  onCerrar: () => void
}

/** Edita el texto y el responsable (opcional) de una tarea, o la borra. */
export function FormularioTarea({ tarea, onCerrar }: FormularioTareaProps) {
  const [texto, setTexto] = useState(tarea.texto)
  const [responsableId, setResponsableId] = useState(tarea.responsableId ?? '')
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const guardar = useGuardarTarea()
  const borrar = useBorrarTarea()
  const { data: cuentas } = useUsuarios()
  // Una cuenta que ya no está activa solo se ofrece si ya era la responsable.
  const elegibles = (cuentas ?? []).filter((cuenta) => cuenta.estado === 'activo' || cuenta.id === tarea.responsableId)
  const ocupado = guardar.isPending || borrar.isPending
  const errorTexto = texto.trim() ? null : 'Escribe qué hay que hacer.'

  async function alGuardar() {
    setIntentoGuardar(true)
    if (errorTexto) return
    try {
      await guardar.mutateAsync({ id: tarea.id, fragmentoId: tarea.fragmentoId, texto, responsableId: responsableId || null })
      notificar.exito('Cambios guardados')
      onCerrar()
    } catch (error) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  async function alBorrar() {
    try {
      await borrar.mutateAsync(tarea.id)
      notificar.exito('Tarea borrada')
      onCerrar()
    } catch (error) {
      notificar.error('No se pudo borrar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <Dialog
      titulo="Editar tarea"
      onCerrar={ocupado ? undefined : onCerrar}
      onSubmit={() => void alGuardar()}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={ocupado}>
            {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button type="button" className="btn-texto btn-texto-peligro" onClick={() => void alBorrar()} disabled={ocupado}>
            {borrar.isPending ? 'Borrando…' : 'Borrar tarea'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={ocupado}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">Tarea</span>
          <input
            className="field-input"
            type="text"
            maxLength={MAX_TEXTO}
            value={texto}
            aria-invalid={intentoGuardar && errorTexto ? true : undefined}
            onChange={(evento) => setTexto(evento.target.value)}
          />
          {intentoGuardar && errorTexto && <p className="field-error">{errorTexto}</p>}
        </label>
        <label className="field">
          <span className="field-label">Responsable (opcional)</span>
          <select className="field-input" value={responsableId} onChange={(evento) => setResponsableId(evento.target.value)}>
            <option value="">Sin responsable</option>
            {elegibles.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>
                {cuenta.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Dialog>
  )
}
