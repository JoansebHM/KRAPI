import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { SelectorParticipantes } from '../estudios/SelectorParticipantes'
import { useBorrarTarea, useGuardarTarea, type Tarea } from './api'

const MAX_TEXTO = 300

interface FormularioTareaProps {
  tarea: Tarea
  onCerrar: () => void
}

/** Edita el texto y el responsable (opcional) de una tarea, o la borra. */
export function FormularioTarea({ tarea, onCerrar }: FormularioTareaProps) {
  const [texto, setTexto] = useState(tarea.texto)
  const [responsableIds, setResponsableIds] = useState(tarea.responsableIds)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const guardar = useGuardarTarea()
  const borrar = useBorrarTarea()
  const ocupado = guardar.isPending || borrar.isPending
  const errorTexto = texto.trim() ? null : 'Escribe qué hay que hacer.'

  async function alGuardar() {
    setIntentoGuardar(true)
    if (errorTexto) return
    try {
      await guardar.mutateAsync({ id: tarea.id, fragmentoId: tarea.fragmentoId, texto, responsableIds, anteriores: tarea.responsableIds })
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
        <div className="field">
          <span className="field-label">Responsables (opcional)</span>
          <SelectorParticipantes valor={responsableIds} onCambiar={setResponsableIds} />
        </div>
      </div>
    </Dialog>
  )
}
