import { esClaro } from '../../lib/color'
import { COLORES_CATEGORIA } from './colores'
import './SelectorColor.css'

interface SelectorColorProps {
  valor: string
  onCambiar: (color: string) => void
}

/** Muestras de color para tocar, más una opción para elegir cualquier otro color. */
export function SelectorColor({ valor, onCambiar }: SelectorColorProps) {
  const esPersonalizado = !COLORES_CATEGORIA.some((color) => color.valor.toLowerCase() === valor.toLowerCase())

  return (
    <div className="selector-color" role="group" aria-label="Color">
      {COLORES_CATEGORIA.map((color) => {
        const seleccionado = color.valor.toLowerCase() === valor.toLowerCase()
        return (
          <button
            key={color.valor}
            type="button"
            className="selector-color-muestra"
            style={{ background: color.valor }}
            aria-label={color.nombre}
            aria-pressed={seleccionado}
            title={color.nombre}
            onClick={() => onCambiar(color.valor)}
          >
            {seleccionado && <Check claro={esClaro(color.valor)} />}
          </button>
        )
      })}
      <label
        className="selector-color-muestra selector-color-otro"
        data-seleccionado={esPersonalizado}
        style={esPersonalizado ? { background: valor } : undefined}
        title="Otro color"
      >
        <input
          type="color"
          className="selector-color-input"
          value={valor}
          aria-label="Elegir otro color"
          onChange={(evento) => onCambiar(evento.target.value.toUpperCase())}
        />
        {esPersonalizado ? <Check claro={esClaro(valor)} /> : <Mas />}
      </label>
    </div>
  )
}

function Check({ claro }: { claro: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={claro ? '#0a0a0c' : '#ffffff'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

function Mas() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
