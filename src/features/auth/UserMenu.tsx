import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { Avatar } from '../usuarios/Avatar'
import { semillaDe } from '../usuarios/api'
import { useAuth } from './useAuth'
import './UserMenu.css'

/** Menú de la cuenta: nombre y usuario, mi perfil, cerrar sesión y cerrar sesión en todos los dispositivos. */
export function UserMenu() {
  const { perfil, cerrarSesion, cerrarSesionEnTodos } = useAuth()
  const navegar = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [confirmarTodos, setConfirmarTodos] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar el menú al tocar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return
    const alTocarFuera = (evento: PointerEvent) => {
      if (!menuRef.current?.contains(evento.target as Node)) setAbierto(false)
    }
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('pointerdown', alTocarFuera)
    document.addEventListener('keydown', alPresionar)
    return () => {
      document.removeEventListener('pointerdown', alTocarFuera)
      document.removeEventListener('keydown', alPresionar)
    }
  }, [abierto])

  async function alConfirmarTodos() {
    setProcesando(true)
    setError(null)
    const resultado = await cerrarSesionEnTodos()
    setProcesando(false)
    if (resultado.error) setError(resultado.error)
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Cuenta"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((valor) => !valor)}
      >
        {perfil ? <Avatar semilla={semillaDe(perfil)} tamano={32} /> : <UserIcon />}
      </button>

      {abierto && (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-cuenta">
            <p className="user-menu-nombre">{perfil?.nombre}</p>
            <p className="user-menu-usuario">
              {perfil?.usuario}
              {perfil?.rol === 'admin' && ' · admin'}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={() => {
              setAbierto(false)
              navegar('/perfil')
            }}
          >
            Mi perfil
          </button>
          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={() => {
              setAbierto(false)
              void cerrarSesion()
            }}
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            role="menuitem"
            className="user-menu-item user-menu-item-danger"
            onClick={() => {
              setAbierto(false)
              setConfirmarTodos(true)
            }}
          >
            Cerrar sesión en todos los dispositivos
          </button>
        </div>
      )}

      {confirmarTodos && (
        <Dialog
          titulo="¿Cerrar sesión en todos los dispositivos?"
          onCerrar={procesando ? undefined : () => setConfirmarTodos(false)}
          acciones={
            <>
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={() => void alConfirmarTodos()}
                disabled={procesando}
              >
                {procesando ? 'Cerrando…' : 'Sí, cerrar en todos'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => setConfirmarTodos(false)}
                disabled={procesando}
              >
                Cancelar
              </button>
            </>
          }
        >
          <p>
            Tu cuenta se cerrará en todos los dispositivos donde hayas entrado, incluido este. Las cuentas de los
            demás no cambian. En los otros dispositivos puede tardar hasta una hora en aplicarse.
          </p>
          <p>Úsalo si perdiste un celular o si crees que alguien más conoce tu contraseña.</p>
          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
        </Dialog>
      )}
    </div>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}
