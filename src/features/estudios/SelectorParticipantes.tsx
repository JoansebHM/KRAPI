import { Avatar } from '../usuarios/Avatar'
import { semillaDe, useUsuarios } from '../usuarios/api'

interface SelectorParticipantesProps {
  valor: string[]
  onCambiar: (participanteIds: string[]) => void
}

/** Se pueden elegir varios: cada cuenta activa es un botón con su avatar que se marca o desmarca. */
export function SelectorParticipantes({ valor, onCambiar }: SelectorParticipantesProps) {
  const { data: cuentas, isPending } = useUsuarios()
  // Las cuentas que ya no están activas solo se muestran si ya estaban en el estudio.
  const elegibles = (cuentas ?? []).filter((cuenta) => cuenta.estado === 'activo' || valor.includes(cuenta.id))

  if (isPending) return <p className="chips-nota">Cargando el equipo…</p>

  const alternar = (id: string) => onCambiar(valor.includes(id) ? valor.filter((otro) => otro !== id) : [...valor, id])

  return (
    <div className="chips">
      {elegibles.map((cuenta) => (
        <button key={cuenta.id} type="button" className="chip" aria-pressed={valor.includes(cuenta.id)} onClick={() => alternar(cuenta.id)}>
          <Avatar semilla={semillaDe(cuenta)} tamano={32} />
          <span>{cuenta.nombre}</span>
        </button>
      ))}
    </div>
  )
}
