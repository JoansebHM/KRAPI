import { useState, type FormEvent } from 'react'
import { PoweredBy } from '../../components/PoweredBy'
import { notificar } from '../../lib/notificar'
import { ThemeToggle } from '../theme/ThemeToggle'
import type { Theme } from '../theme/useTheme'
import { useAuth } from './useAuth'
import type { MotivoCierre } from './politicaSesion'
import './LoginPage.css'

const MENSAJES_CIERRE: Record<MotivoCierre, string | null> = {
  inactividad: 'Se cerró la sesión porque la app estuvo 2 horas sin usarse.',
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
  const [verPassword, setVerPassword] = useState(false)
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
    else notificar.exito('Sesión iniciada', { descripcion: 'Bienvenido a KRAPI.' })
  }

  return (
    <div className="login">
      <div className="login-theme">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <main className="login-card">
        <header className="login-header">
          <h1 className="login-brand">KRAPI</h1>
          <PoweredBy tamano="mediano" />
          <p className="login-subtitle">Geovisor del barrio Manila</p>
        </header>

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

          <div className="field">
            <label className="field-label" htmlFor="login-password">
              Contraseña
            </label>
            <div className="login-password">
              <input
                id="login-password"
                className="field-input"
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                required
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setVerPassword((valor) => !valor)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verPassword}
              >
                {verPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </main>
    </div>
  )
}
