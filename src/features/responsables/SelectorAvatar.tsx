import { useState } from 'react'
import { Avatar } from './Avatar'
import { semillaAleatoria } from './dibujoAvatar'
import './SelectorAvatar.css'

const PROPUESTAS = 8

interface SelectorAvatarProps {
  valor: string
  onCambiar: (semilla: string) => void
}

function nuevasPropuestas(cantidad: number) {
  return Array.from({ length: cantidad }, semillaAleatoria)
}

/**
 * Avatar grande con el elegido y una cuadrícula de propuestas para tocar.
 * El primer lugar siempre es el avatar con el que se abrió el formulario, para poder volver a él.
 * "Ver otros" cambia las demás propuestas.
 */
export function SelectorAvatar({ valor, onCambiar }: SelectorAvatarProps) {
  const [inicial] = useState(valor)
  const [otras, setOtras] = useState(() => nuevasPropuestas(PROPUESTAS - 1))
  const propuestas = [inicial, ...otras]

  return (
    <div className="selector-avatar">
      <div className="selector-avatar-actual">
        <Avatar semilla={valor} tamano={96} />
      </div>
      <div className="selector-avatar-opciones" role="group" aria-label="Elegir avatar">
        {propuestas.map((semilla, indice) => (
          <button
            key={semilla}
            type="button"
            className="selector-avatar-opcion"
            aria-label={`Avatar ${indice + 1}`}
            aria-pressed={semilla === valor}
            onClick={() => onCambiar(semilla)}
          >
            <Avatar semilla={semilla} tamano={52} />
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-secondary selector-avatar-otros" onClick={() => setOtras(nuevasPropuestas(PROPUESTAS - 1))}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-2.6-6.4" />
          <path d="M21 4v5h-5" />
        </svg>
        Ver otros
      </button>
    </div>
  )
}
