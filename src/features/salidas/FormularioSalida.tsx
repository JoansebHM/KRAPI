import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { fechaLocal } from '../estudios/campos'
import { useGuardarSalida, type DatosSalida, type Salida } from './api'

const MAX_NOMBRE = 120

interface FormularioSalidaProps {
  salida?: Salida
  onCerrar: () => void
  /** Se llama con el id de la salida guardada. */
  onGuardada: (id: string) => void
}

/** Nombre, fecha y hora de inicio de una salida (solo admins). */
export function FormularioSalida({ salida, onCerrar, onGuardada }: FormularioSalidaProps) {
  const [datos, setDatos] = useState<DatosSalida>({
    nombre: salida?.nombre ?? '',
    fecha: salida?.fecha ?? fechaLocal(),
    horaInicio: salida?.horaInicio ?? '14:00',
  })
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const guardar = useGuardarSalida()
  const errores = {
    nombre: datos.nombre.trim() ? null : 'Escribe un nombre, por ejemplo "Salida del sábado".',
    fecha: datos.fecha && datos.horaInicio ? null : 'Elige la fecha y la hora de inicio.',
  }

  async function alGuardar() {
    setIntentoGuardar(true)
    if (errores.nombre || errores.fecha) return
    try {
      const id = await guardar.mutateAsync({ ...datos, id: salida?.id })
      notificar.exito(salida ? 'Cambios guardados' : 'Salida creada', { descripcion: salida ? undefined : 'Ahora agrégale las zonas y quiénes las cubren.' })
      onGuardada(id)
    } catch (error) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(error, { sinPermiso: 'Solo un admin puede armar salidas.' }) })
    }
  }

  return (
    <Dialog
      titulo={salida ? 'Editar salida' : 'Nueva salida'}
      onCerrar={guardar.isPending ? undefined : onCerrar}
      onSubmit={() => void alGuardar()}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={guardar.isPending} data-autofocus={salida ? true : undefined}>
            {guardar.isPending ? 'Guardando…' : salida ? 'Guardar cambios' : 'Crear salida'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={guardar.isPending}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className="field-input"
            type="text"
            placeholder="Ej.: Salida del sábado"
            maxLength={MAX_NOMBRE}
            value={datos.nombre}
            aria-invalid={intentoGuardar && errores.nombre ? true : undefined}
            onChange={(evento) => setDatos({ ...datos, nombre: evento.target.value })}
          />
          {intentoGuardar && errores.nombre && <p className="field-error">{errores.nombre}</p>}
        </label>
        <div className="salida-fecha-hora">
          <label className="field">
            <span className="field-label">Fecha</span>
            <input className="field-input" type="date" value={datos.fecha} onChange={(evento) => setDatos({ ...datos, fecha: evento.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Hora de inicio</span>
            <input className="field-input" type="time" value={datos.horaInicio} onChange={(evento) => setDatos({ ...datos, horaInicio: evento.target.value })} />
          </label>
        </div>
        {intentoGuardar && errores.fecha && <p className="field-error">{errores.fecha}</p>}
      </div>
    </Dialog>
  )
}
