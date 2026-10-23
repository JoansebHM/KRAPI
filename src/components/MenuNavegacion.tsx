import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router'
import './MenuNavegacion.css'

interface MenuNavegacionProps {
  abierto: boolean
  onCerrar: () => void
}

const SECCIONES = [
  { ruta: '/', texto: 'Mapa', icono: <IconoMapa /> },
]

/** Menú lateral con las secciones de la app. */
export function MenuNavegacion({ abierto, onCerrar }: MenuNavegacionProps) {
  const { pathname } = useLocation()

  // Al cambiar de sección, el menú se cierra solo.
  useEffect(() => {
    onCerrar()
  }, [pathname, onCerrar])

  useEffect(() => {
    if (!abierto) return
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [abierto, onCerrar])

  return (
    <>
      <div className={`menu-fondo${abierto ? ' menu-fondo-visible' : ''}`} onClick={onCerrar} aria-hidden="true" />
      <nav className={`menu${abierto ? ' menu-abierto' : ''}`} aria-label="Secciones" aria-hidden={!abierto} inert={!abierto}>
        <div className="menu-marca">KRAPI</div>
        <ul className="menu-lista">
          {SECCIONES.map(({ ruta, texto, icono }) => (
            <li key={ruta}>
              <NavLink to={ruta} end className={({ isActive }) => `menu-item${isActive ? ' menu-item-activo' : ''}`}>
                {icono}
                <span>{texto}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

/** Botón ☰ que abre el menú. */
export function BotonMenu({ onAbrir }: { onAbrir: () => void }) {
  return (
    <button type="button" className="icon-btn" aria-label="Abrir menú" onClick={onAbrir}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  )
}

const icono = {
  viewBox: '0 0 24 24',
  width: 22,
  height: 22,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function IconoMapa() {
  return (
    <svg {...icono}>
      <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4Z" />
      <path d="M9 4v13M15 6.5v13" />
    </svg>
  )
}
