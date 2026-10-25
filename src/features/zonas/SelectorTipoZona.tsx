import { Link } from 'react-router'
import { useTiposZona } from '../tiposZona/api'

interface SelectorTipoZonaProps {
  valor: string | null
  onCambiar: (tipoZonaId: string | null) => void
}

/** Se elige un tipo (o ninguno): cada uno es un botón con la muestra de su color. */
export function SelectorTipoZona({ valor, onCambiar }: SelectorTipoZonaProps) {
  const { data: tipos, isPending } = useTiposZona()
  if (isPending) return <p className="chips-nota">Cargando tipos…</p>

  return (
    <>
      <div className="chips">
        <button type="button" className="chip chip-sin-icono" aria-pressed={valor === null} onClick={() => onCambiar(null)}>
          <span>Sin tipo</span>
        </button>
        {(tipos ?? []).map((tipo) => (
          <button key={tipo.id} type="button" className="chip" aria-pressed={valor === tipo.id} onClick={() => onCambiar(tipo.id)}>
            <span className="tipo-zona-muestra tipo-zona-muestra-chica" style={{ background: tipo.color }} aria-hidden="true" />
            <span>{tipo.nombre}</span>
          </button>
        ))}
      </div>
      <p className="chips-nota">
        Los tipos se administran en el menú, en <Link to="/tipos-de-zona">Tipos de zona</Link>.
      </p>
    </>
  )
}
