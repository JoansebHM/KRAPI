import { useState, type ReactNode } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { MAX_ENTREVISTADO, type CamposEstudio } from './api'
import { CampoNotas } from './CampoNotas'
import { SelectorParticipantes } from './SelectorParticipantes'
import { SelectorSalida } from './SelectorSalida'
import './FormularioEstudio.css'

interface FormularioEstudioProps {
  titulo: string
  /** Nombre del lugar, para recordar a qué lugar se agrega el estudio. */
  lugar: string
  campos: CamposEstudio
  onCambiar: (campos: CamposEstudio) => void
  /** Guarda el estudio. Si falla, el formulario muestra el error y queda abierto para corregir. */
  onGuardar: () => Promise<void>
  textoGuardar: string
  /** Acciones adicionales debajo de "Guardar", por ejemplo "Solo guardar el lugar". */
  otrasAcciones?: (guardando: boolean) => ReactNode
  onCerrar: () => void
  /** Al editar se enfoca el botón y no el primer campo, para que en celular no salte el teclado. */
  editando?: boolean
  /** Los estudios de una zona (recorridos) no tienen "a quién se entrevistó". */
  esZona?: boolean
}

export function FormularioEstudio({ titulo, lugar, campos, onCambiar, onGuardar, textoGuardar, otrasAcciones, onCerrar, editando, esZona }: FormularioEstudioProps) {
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cambiar = <K extends keyof CamposEstudio>(campo: K, valor: CamposEstudio[K]) => onCambiar({ ...campos, [campo]: valor })

  const errores = {
    fecha: campos.fecha ? null : 'Elige la fecha.',
    horas:
      !campos.horaInicio || !campos.horaFin
        ? 'Escribe la hora de inicio y la de fin.'
        : campos.horaFin <= campos.horaInicio
          ? 'La hora de fin debe ser posterior a la de inicio.'
          : null,
  }
  const hayErrores = Object.values(errores).some(Boolean)
  const ver = (error: string | null) => (intentoGuardar ? error : null)

  async function guardar() {
    setIntentoGuardar(true)
    if (hayErrores) return
    setGuardando(true)
    try {
      await onGuardar()
    } catch (error) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(error) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog
      titulo={titulo}
      onCerrar={guardando ? undefined : onCerrar}
      onSubmit={() => void guardar()}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={guardando} data-autofocus={editando ? true : undefined}>
            {guardando ? 'Guardando…' : textoGuardar}
          </button>
          {otrasAcciones?.(guardando)}
        </>
      }
    >
      <div className="formulario">
        <p className="estudio-lugar">
          En <strong>{lugar}</strong>
        </p>

        <label className="field">
          <span className="field-label">Fecha</span>
          <input
            className="field-input"
            type="date"
            value={campos.fecha}
            aria-invalid={Boolean(ver(errores.fecha))}
            onChange={(evento) => cambiar('fecha', evento.target.value)}
          />
          {ver(errores.fecha) && <p className="field-error">{errores.fecha}</p>}
        </label>

        <fieldset className="estudio-horas" aria-describedby={ver(errores.horas) ? 'estudio-horas-error' : undefined}>
          <legend className="field-label">Horario</legend>
          <label className="field">
            <span className="estudio-horas-etiqueta">Inicio</span>
            <input
              className="field-input"
              type="time"
              value={campos.horaInicio}
              aria-invalid={Boolean(ver(errores.horas))}
              onChange={(evento) => cambiar('horaInicio', evento.target.value)}
            />
          </label>
          <label className="field">
            <span className="estudio-horas-etiqueta">Fin</span>
            <input
              className="field-input"
              type="time"
              value={campos.horaFin}
              aria-invalid={Boolean(ver(errores.horas))}
              onChange={(evento) => cambiar('horaFin', evento.target.value)}
            />
          </label>
          {ver(errores.horas) && (
            <p id="estudio-horas-error" className="field-error estudio-horas-error">
              {errores.horas}
            </p>
          )}
        </fieldset>

        <div className="field">
          <span className="field-label">
            Participantes<span className="field-opcional"> (quiénes fueron)</span>
          </span>
          <SelectorParticipantes valor={campos.participanteIds} onCambiar={(ids) => cambiar('participanteIds', ids)} />
        </div>

        {!esZona && (
          <label className="field">
            <span className="field-label">
              A quién se entrevistó<span className="field-opcional"> (opcional)</span>
            </span>
            <input
              className="field-input"
              type="text"
              placeholder="Ej.: Tendero, administradora"
              maxLength={MAX_ENTREVISTADO}
              autoCapitalize="sentences"
              enterKeyHint="next"
              value={campos.entrevistado}
              onChange={(evento) => cambiar('entrevistado', evento.target.value)}
            />
          </label>
        )}

        <SelectorSalida valor={campos.salidaId} onCambiar={(salidaId) => cambiar('salidaId', salidaId)} />

        <CampoNotas notas={campos.notas} onCambiar={(notas) => cambiar('notas', notas)} />
      </div>
    </Dialog>
  )
}
