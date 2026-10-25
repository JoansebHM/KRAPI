import type { Theme } from '../theme/useTheme'
import type { Perfil } from './api'
import { PantallaAcceso } from './PantallaAcceso'
import { useAuth } from './useAuth'

const TEXTOS: Record<Exclude<Perfil['estado'], 'activo'>, { titulo: string; detalle: string }> = {
  pendiente: {
    titulo: 'Tu cuenta está esperando aprobación',
    detalle: 'Un admin del equipo debe aprobarla. Cuando lo haga, entrarás al mapa sin hacer nada más.',
  },
  rechazado: {
    titulo: 'Tu cuenta no fue aprobada',
    detalle: 'Si crees que es un error, habla con un admin del equipo.',
  },
  desactivado: {
    titulo: 'Tu cuenta está desactivada',
    detalle: 'Si crees que es un error, habla con un admin del equipo.',
  },
}

interface CuentaNoActivaProps {
  theme: Theme
  onToggleTheme: () => void
}

/**
 * Lo que ve una cuenta con sesión que no puede usar la app: pendiente, rechazada, desactivada o
 * cuyo perfil no se pudo cargar. RLS ya le niega los datos; esto se lo explica.
 */
export function CuentaNoActiva({ theme, onToggleTheme }: CuentaNoActivaProps) {
  const { perfil, errorPerfil, recargarPerfil, cerrarSesion } = useAuth()
  const texto =
    errorPerfil || !perfil || perfil.estado === 'activo'
      ? { titulo: 'No se pudo revisar tu cuenta', detalle: 'Revisa tu conexión e inténtalo de nuevo.' }
      : TEXTOS[perfil.estado]
  const puedeReintentar = errorPerfil || perfil?.estado === 'pendiente'

  return (
    <PantallaAcceso theme={theme} onToggleTheme={onToggleTheme} subtitulo="Geovisor del barrio Manila">
      <section className="cuenta-estado" aria-labelledby="cuenta-estado-titulo">
        <h2 id="cuenta-estado-titulo" className="cuenta-estado-titulo">
          {texto.titulo}
        </h2>
        {perfil && (
          <p className="cuenta-estado-quien">
            {perfil.nombre} · <span className="cuenta-estado-usuario">{perfil.usuario}</span>
          </p>
        )}
        <p className="cuenta-estado-detalle">{texto.detalle}</p>
      </section>

      <div className="login-form">
        {puedeReintentar && (
          <button type="button" className="btn btn-primary btn-block" onClick={recargarPerfil}>
            {errorPerfil ? 'Reintentar' : 'Revisar ahora'}
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={() => void cerrarSesion()}>
          Salir
        </button>
      </div>
    </PantallaAcceso>
  )
}
