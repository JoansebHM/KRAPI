import { Link } from 'react-router'
import './CrearPunto.css'

/** Botón flotante "+" del mapa para registrar un lugar. */
export function BotonNuevoLugar() {
  return (
    <Link to="/lugares/nuevo" className="fab fab-mapa">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Nuevo lugar
    </Link>
  )
}
