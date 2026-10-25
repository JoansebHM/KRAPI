import { useState, type FormEvent } from 'react'
import { notificar } from '../../lib/notificar'
import type { Theme } from '../theme/useTheme'
import { CampoContrasena } from './CampoContrasena'
import { PantallaAcceso } from './PantallaAcceso'
import { useAuth } from './useAuth'
import type { MotivoCierre } from './politicaSesion'

const MENSAJES_CIERRE: Record<MotivoCierre, string | null> = {
  inactividad: 'Se cerró la sesión porque se detectó inactividad.',
  duracion_maxima: 'Por seguridad, la sesión se cierra cada 7 días. Vuelve a ingresar.',
  todos_los_dispositivos: 'Se cerró la sesión en todos los dispositivos.',
  remoto: 'La sesión se cerró. Vuelve a ingresar.',
  manual: null,
}

interface LoginPageProps {
  theme: Theme
  onToggleTheme: () => void
}

export function LoginPage({ theme, onToggleTheme }: LoginPageProps) {
  const { iniciarSesion, motivoCierre } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aviso = motivoCierre ? MENSAJES_CIERRE[motivoCierre] : null

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    const resultado = await iniciarSesion(email, password)
    setEnviando(false)
    if (resultado.error) setError(resultado.error)
    else notificar.exito('Sesión iniciada', { descripcion: 'Bienvenido a KIRA.' })
  }

  return (
    <PantallaAcceso theme={theme} onToggleTheme={onToggleTheme} subtitulo="Geovisor del barrio Manila">
      {aviso && !error && (
        <p className="alert alert-info" role="status">
          {aviso}
        </p>
      )}

      <form className="login-form" onSubmit={alEnviar} noValidate={false}>
        <label className="field">
          <span className="field-label">Correo</span>
          <input
            className="field-input"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nombre@ejemplo.com"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
        </label>

        <CampoContrasena
          id="login-password"
          etiqueta="Contraseña"
          valor={password}
          onCambiar={setPassword}
          autoComplete="current-password"
          placeholder="Tu contraseña"
        />

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

    </PantallaAcceso>
  )
}
