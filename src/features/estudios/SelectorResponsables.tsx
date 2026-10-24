import { Avatar } from '../responsables/Avatar'
import { semillaDe, useResponsables } from '../responsables/api'

interface SelectorResponsablesProps {
  valor: string[]
  onCambiar: (responsableIds: string[]) => void
}

/** Se pueden elegir varios: cada responsable es un botón con su avatar que se marca o desmarca. */
export function SelectorResponsables({ valor, onCambiar }: SelectorResponsablesProps) {
  const { data: responsables, isPending } = useResponsables()

  if (isPending) return <p className="chips-nota">Cargando responsables…</p>
  if (!responsables?.length) {
    return <p className="chips-nota">Aún no hay responsables. Puedes crearlos desde el menú, en Responsables.</p>
  }

  const alternar = (id: string) => onCambiar(valor.includes(id) ? valor.filter((otro) => otro !== id) : [...valor, id])

  return (
    <div className="chips">
      {responsables.map((responsable) => (
        <button
          key={responsable.id}
          type="button"
          className="chip"
          aria-pressed={valor.includes(responsable.id)}
          onClick={() => alternar(responsable.id)}
        >
          <Avatar semilla={semillaDe(responsable)} tamano={32} />
          <span>{responsable.nombre}</span>
        </button>
      ))}
    </div>
  )
}
