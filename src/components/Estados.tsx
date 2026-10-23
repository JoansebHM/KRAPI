import type { ReactNode } from 'react'
import './Estados.css'

interface EstadoVacioProps {
  icono: ReactNode
  titulo: string
  descripcion?: string
  accion?: ReactNode
}

/** Mensaje para listas vacías o búsquedas sin resultados. */
export function EstadoVacio({ icono, titulo, descripcion, accion }: EstadoVacioProps) {
  return (
    <div className="estado-vacio">
      <div className="estado-vacio-icono">{icono}</div>
      <p className="estado-vacio-titulo">{titulo}</p>
      {descripcion && <p className="estado-vacio-descripcion">{descripcion}</p>}
      {accion}
    </div>
  )
}

/** Filas de relleno mientras cargan los datos. */
export function ListaCargando({ filas = 4 }: { filas?: number }) {
  return (
    <ul className="lista-cargando" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, indice) => (
        <li key={indice} className="lista-cargando-fila">
          <span className="esqueleto esqueleto-circulo" />
          <span className="lista-cargando-textos">
            <span className="esqueleto esqueleto-linea" />
            <span className="esqueleto esqueleto-linea esqueleto-corta" />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div className="estado-vacio" role="alert">
      <p className="estado-vacio-titulo">{mensaje}</p>
      <button type="button" className="btn btn-secondary" onClick={onReintentar}>
        Reintentar
      </button>
    </div>
  )
}
