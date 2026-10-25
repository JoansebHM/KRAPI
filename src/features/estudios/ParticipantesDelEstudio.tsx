import { Avatar } from '../usuarios/Avatar'
import { semillaDe, useUsuarios } from '../usuarios/api'
import type { Estudio } from './api'
import './ParticipantesDelEstudio.css'

interface ParticipantesDelEstudioProps {
  estudio: Pick<Estudio, 'participanteIds' | 'participantesAnteriores'>
  /** Clases de la lista y del texto "Sin participantes", que cambian entre la presentación y la página. */
  claseLista: string
  claseVacio: string
}

/**
 * Las cuentas que participaron, con su avatar. Lo de antes de las cuentas individuales puede tener
 * nombres sin cuenta, que se muestran como texto.
 */
export function ParticipantesDelEstudio({ estudio, claseLista, claseVacio }: ParticipantesDelEstudioProps) {
  const { data: cuentas } = useUsuarios()
  const personas = estudio.participanteIds.map((id) => cuentas?.find((cuenta) => cuenta.id === id)).filter((cuenta) => cuenta !== undefined)
  const anteriores = estudio.participantesAnteriores

  if (personas.length === 0 && anteriores.length === 0) return <span className={claseVacio}>Sin participantes</span>

  return (
    <>
      {personas.length > 0 && (
        <ul className={claseLista}>
          {personas.map((cuenta) => (
            <li key={cuenta.id}>
              <Avatar semilla={semillaDe(cuenta)} tamano={28} />
              {cuenta.nombre}
            </li>
          ))}
        </ul>
      )}
      {anteriores.length > 0 && <p className="estudio-participantes-anteriores">También participó: {anteriores.join(', ')}</p>}
    </>
  )
}
