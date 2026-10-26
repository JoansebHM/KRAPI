import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { SelectorParticipantes } from '../estudios/SelectorParticipantes'

const MAX_NOMBRE = 120

interface FormularioAsignacionProps {
  titulo: string
  nombreInicial?: string
  participantesIniciales?: string[]
  onGuardar: (datos: { nombre: string; participanteIds: string[] }) => Promise<void>
  textoGuardar: string
  onCerrar: () => void
}

/** Nombre de la zona asignada y quiénes la cubren (solo admins). */
export function FormularioAsignacion({ titulo, nombreInicial = '', participantesIniciales = [], onGuardar, textoGuardar, onCerrar }: FormularioAsignacionProps) {
  const [nombre, setNombre] = useState(nombreInicial)
  const [participanteIds, setParticipanteIds] = useState(participantesIniciales)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const errores = {
    nombre: nombre.trim() ? null : 'Escribe un nombre, por ejemplo "Cuadrante norte".',
    participantes: participanteIds.length > 0 ? null : 'Elige al menos una persona.',
  }

  async function guardar() {
    setIntentoGuardar(true)
    if (errores.nombre || errores.participantes) return
    setGuardando(true)
    try {
      await onGuardar({ nombre, participanteIds })
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
          <button type="submit" className="btn btn-primary btn-block" disabled={guardando}>
            {guardando ? 'Guardando…' : textoGuardar}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">Nombre de la zona</span>
          <input
            className="field-input"
            type="text"
            placeholder="Ej.: Cuadrante norte"
            maxLength={MAX_NOMBRE}
            value={nombre}
            aria-invalid={intentoGuardar && errores.nombre ? true : undefined}
            onChange={(evento) => setNombre(evento.target.value)}
          />
          {intentoGuardar && errores.nombre && <p className="field-error">{errores.nombre}</p>}
        </label>
        <div className="field">
          <span className="field-label">¿Quiénes la cubren?</span>
          <SelectorParticipantes valor={participanteIds} onCambiar={setParticipanteIds} />
          {intentoGuardar && errores.participantes && <p className="field-error">{errores.participantes}</p>}
        </div>
      </div>
    </Dialog>
  )
}
