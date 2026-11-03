import { useState } from 'react'
import { Check, Layers } from 'lucide-react'
import { VISTAS, type Vista } from './vistas'
import './BotonVistas.css'

interface BotonVistasProps {
  vista: Vista
  onCambiar: (vista: Vista) => void
}

/** Botón flotante del mapa para elegir la vista: calles, topográfico o simplificado. */
export function BotonVistas({ vista, onCambiar }: BotonVistasProps) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="boton-vistas">
      <button
        type="button"
        className="boton-vistas-boton"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-label="Vista del mapa"
        title="Vista del mapa"
      >
        <Layers size={22} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="boton-vistas-menu" aria-label="Vista del mapa">
          {VISTAS.map((opcion) => (
            <li key={opcion.id}>
              <button
                type="button"
                className="boton-vistas-opcion"
                aria-pressed={opcion.id === vista}
                onClick={() => {
                  onCambiar(opcion.id)
                  setAbierto(false)
                }}
              >
                {opcion.nombre}
                {opcion.id === vista && <Check size={18} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
