import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { PORCENTAJES, useReportar, type Asignacion, type Participacion } from './api'

const dosDigitos = (n: number) => String(n).padStart(2, '0')
const ahora = () => `${dosDigitos(new Date().getHours())}:${dosDigitos(new Date().getMinutes())}`

interface ReportarAsignacionProps {
  asignacion: Asignacion
  participacion: Participacion
  onCerrar: () => void
}

/** A qué hora terminó la persona y qué porcentaje de la zona alcanzó a cubrir. */
export function ReportarAsignacion({ asignacion, participacion, onCerrar }: ReportarAsignacionProps) {
  const [horaFin, setHoraFin] = useState(participacion.horaFin ?? ahora())
  const [porcentaje, setPorcentaje] = useState<number | null>(participacion.porcentaje)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const reportar = useReportar()

  async function guardar() {
    setIntentoGuardar(true)
    if (!horaFin || porcentaje === null) return
    try {
      await reportar.mutateAsync({ asignacionId: asignacion.id, usuarioId: participacion.usuarioId, horaFin, porcentaje })
      notificar.exito('Reporte guardado', { descripcion: `${asignacion.nombre}: ${porcentaje} % cubierto.` })
      onCerrar()
    } catch (error) {
      notificar.error('No se pudo guardar el reporte', {
        descripcion: mensajeErrorDatos(error, { sinPermiso: 'Solo la persona asignada o un admin puede reportar.' }),
      })
    }
  }

  return (
    <Dialog
      titulo={`Reportar: ${asignacion.nombre}`}
      onCerrar={reportar.isPending ? undefined : onCerrar}
      onSubmit={() => void guardar()}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={reportar.isPending}>
            {reportar.isPending ? 'Guardando…' : 'Guardar reporte'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={reportar.isPending}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">¿A qué hora terminaste?</span>
          <input className="field-input" type="time" value={horaFin} onChange={(evento) => setHoraFin(evento.target.value)} />
        </label>
        <fieldset className="field salida-porcentajes">
          <legend className="field-label">¿Qué tanto de la zona alcanzaste a cubrir?</legend>
          <div className="chips">
            {PORCENTAJES.map((valor) => (
              <button key={valor} type="button" className="chip chip-sin-icono" aria-pressed={porcentaje === valor} onClick={() => setPorcentaje(valor)}>
                <span>{valor} %</span>
              </button>
            ))}
          </div>
          {intentoGuardar && porcentaje === null && <p className="field-error">Elige un porcentaje.</p>}
        </fieldset>
      </div>
    </Dialog>
  )
}
