import { useSalidas, useSalidasElegibles } from '../salidas/api'

interface SelectorSalidaProps {
  valor: string | null
  onCambiar: (salidaId: string | null) => void
}

/**
 * En qué salida se hizo el estudio: se ofrecen las salidas donde la cuenta tiene una zona asignada.
 * Si no hay ninguna, el campo no aparece (la mayoría de los estudios no vienen de una salida).
 */
export function SelectorSalida({ valor, onCambiar }: SelectorSalidaProps) {
  const elegibles = useSalidasElegibles()
  const { data: salidas } = useSalidas()
  // Al editar un estudio ya ligado a una salida que dejó de ser elegible (se canceló, por ejemplo),
  // se muestra igual para poder verla o quitarla.
  const actual = valor ? salidas?.find((salida) => salida.id === valor) : undefined
  const opciones = actual && !elegibles.some((salida) => salida.id === actual.id) ? [actual, ...elegibles] : elegibles

  if (opciones.length === 0) return null

  return (
    <div className="field">
      <span className="field-label">
        Salida<span className="field-opcional"> (si se hizo en una)</span>
      </span>
      <div className="chips">
        <button type="button" className="chip chip-sin-icono" aria-pressed={valor === null} onClick={() => onCambiar(null)}>
          <span>Ninguna</span>
        </button>
        {opciones.map((salida) => (
          <button key={salida.id} type="button" className="chip chip-sin-icono" aria-pressed={valor === salida.id} onClick={() => onCambiar(salida.id)}>
            <span>{salida.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
