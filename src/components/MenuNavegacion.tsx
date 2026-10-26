import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAuth } from '../features/auth/useAuth'
import { estadoDe, useSalidas, yaEmpezo } from '../features/salidas/api'
import { useUsuarios } from '../features/usuarios/api'
import { PoweredBy } from './PoweredBy'
import './MenuNavegacion.css'

interface MenuNavegacionProps {
  abierto: boolean
  onCerrar: () => void
}

const SECCIONES = [
  { ruta: '/', texto: 'Mapa', icono: <IconoMapa /> },
  { ruta: '/categorias', texto: 'Categorías', icono: <IconoEtiqueta /> },
  { ruta: '/tipos-de-zona', texto: 'Tipos de zona', icono: <IconoZona /> },
  { ruta: '/salidas', texto: 'Salidas', icono: <IconoSalidas /> },
]

/** Menú lateral con las secciones de la app. En celular se abre encima con ☰ y se cierra al elegir. */
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
        <div className="menu-marca">
          <span className="menu-marca-nombre">KIRA</span>
          <PoweredBy />
        </div>
        <ListaSecciones />
      </nav>
    </>
  )
}

/** Menú fijo a la izquierda, debajo de la barra superior. Solo en computador. */
export function MenuFijo() {
  return (
    <nav className="menu menu-fijo" aria-label="Secciones">
      <ListaSecciones />
    </nav>
  )
}

/** Las secciones de la app: Mapa, Categorías, Tipos de zona, Salidas, Mis asignaciones, Usuarios (admins) y Documentación. */
function ListaSecciones() {
  const { esAdmin, perfil } = useAuth()
  // Cuántas zonas asignadas a la cuenta faltan por reportar (de salidas de hoy o anteriores).
  const { data: salidas } = useSalidas()
  const porReportar = (salidas ?? []).reduce(
    (total, salida) =>
      total +
      salida.asignaciones.filter((asignacion) =>
        asignacion.participantes.some((p) => p.usuarioId === perfil?.id && estadoDe(salida, p) === 'sin-reportar' && yaEmpezo(salida)),
      ).length,
    0,
  )
  // Solo un admin ve "Usuarios", con cuántas cuentas esperan aprobación.
  const { data: usuarios } = useUsuarios({ habilitado: esAdmin })
  const pendientes = usuarios?.filter((usuario) => usuario.estado === 'pendiente').length ?? 0

  return (
    <ul className="menu-lista">
      {SECCIONES.map(({ ruta, texto, icono }) => (
        <li key={ruta}>
          <NavLink to={ruta} end className={({ isActive }) => `menu-item${isActive ? ' menu-item-activo' : ''}`}>
            {icono}
            <span>{texto}</span>
          </NavLink>
        </li>
      ))}
      <li>
        <NavLink to="/mis-asignaciones" className={({ isActive }) => `menu-item${isActive ? ' menu-item-activo' : ''}`}>
          <IconoMisAsignaciones />
          <span>Mis asignaciones</span>
          {porReportar > 0 && (
            <span className="menu-contador" aria-label={`${porReportar} por reportar`}>
              {porReportar}
            </span>
          )}
        </NavLink>
      </li>
      {esAdmin && (
        <li>
          <NavLink to="/usuarios" className={({ isActive }) => `menu-item${isActive ? ' menu-item-activo' : ''}`}>
            <IconoCuenta />
            <span>Usuarios</span>
            {pendientes > 0 && (
              <span className="menu-contador" aria-label={`${pendientes} por aprobar`}>
                {pendientes}
              </span>
            )}
          </NavLink>
        </li>
      )}
      <li>
        <a href="/docs" className="menu-item">
          <IconoDocumentacion />
          <span>Documentación</span>
        </a>
      </li>
    </ul>
  )
}

interface BotonMenuProps {
  onTocar: () => void
  /** En computador el botón oculta o muestra el menú fijo; en celular lo abre encima. */
  menuFijoVisible?: boolean
}

/** Botón ☰ de la barra superior. */
export function BotonMenu({ onTocar, menuFijoVisible }: BotonMenuProps) {
  const etiqueta = menuFijoVisible === undefined ? 'Abrir menú' : menuFijoVisible ? 'Ocultar menú' : 'Mostrar menú'
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={etiqueta}
      title={etiqueta}
      aria-expanded={menuFijoVisible}
      onClick={onTocar}
    >
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

function IconoEtiqueta() {
  return (
    <svg {...icono}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  )
}

function IconoZona() {
  return (
    <svg {...icono}>
      <path d="M4 7 10 4l10 4-2 11-12 1Z" />
    </svg>
  )
}

function IconoSalidas() {
  return (
    <svg {...icono}>
      <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4Z" />
      <path d="M9 4v13M15 6.5v13" />
    </svg>
  )
}

function IconoMisAsignaciones() {
  return (
    <svg {...icono}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 9-6.7" />
      <path d="m15 18 2 2 4-4" />
    </svg>
  )
}

function IconoCuenta() {
  return (
    <svg {...icono}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
      <path d="m16.5 12.5 1.5 1.5 3-3" />
    </svg>
  )
}

function IconoDocumentacion() {
  return (
    <svg {...icono}>
      <path d="M4 3.5h10l5 5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.5Z" />
      <path d="M14 3.5V9h5M8 13h7M8 17h7" />
    </svg>
  )
}
