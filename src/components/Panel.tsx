import type { ReactNode } from 'react'
import { Link } from 'react-router'
import './Panel.css'

interface PanelProps {
  titulo: string
  subtitulo?: string
  children: ReactNode
  /** Contenido fijo al final del panel, por ejemplo el botón "Nueva". */
  pie?: ReactNode
}

/**
 * Pantalla que se abre sobre el mapa. En celular ocupa todo el espacio bajo la barra;
 * en pantallas grandes es un panel lateral y el mapa sigue visible.
 */
export function Panel({ titulo, subtitulo, children, pie }: PanelProps) {
  return (
    <section className="panel" aria-labelledby="panel-titulo">
      <header className="panel-header">
        <Link to="/" className="icon-btn panel-volver" aria-label="Volver al mapa">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </Link>
        <div className="panel-titulos">
          <h1 id="panel-titulo" className="panel-titulo">
            {titulo}
          </h1>
          {subtitulo && <p className="panel-subtitulo">{subtitulo}</p>}
        </div>
      </header>
      <div className="panel-contenido">{children}</div>
      {pie && <div className="panel-pie">{pie}</div>}
    </section>
  )
}
