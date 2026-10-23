import { esClaro } from '../../lib/color'
import { iconoDe } from './iconos'
import './IconoCategoria.css'

interface IconoCategoriaProps {
  icono: string | null | undefined
  color: string
  /** Diámetro del círculo en píxeles. */
  tamano?: number
}

/** Círculo del color de la categoría con su ícono, como se verá en el mapa. */
export function IconoCategoria({ icono, color, tamano = 40 }: IconoCategoriaProps) {
  const { Icono } = iconoDe(icono)
  return (
    <span
      className="icono-categoria"
      style={{ width: tamano, height: tamano, background: color, color: esClaro(color) ? '#0a0a0c' : '#ffffff' }}
      aria-hidden="true"
    >
      <Icono size={Math.round(tamano * 0.52)} strokeWidth={2.2} />
    </span>
  )
}
