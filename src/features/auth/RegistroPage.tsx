import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { notificar } from '../../lib/notificar'
import { useValorDiferido } from '../../lib/useValorDiferido'
import { semillaAleatoria } from '../usuarios/dibujoAvatar'
import { SelectorAvatar } from '../usuarios/SelectorAvatar'
import type { Theme } from '../theme/useTheme'
import { useUsuarioDisponible } from './api'
import { CampoContrasena } from './CampoContrasena'
import { errorDeUsuario, MINIMO_CLAVE, normalizarUsuario } from './nombreDeUsuario'
import { PantallaAcceso } from './PantallaAcceso'
import { useAuth } from './useAuth'

const MAX_NOMBRE = 80
/** Espera tras la última tecla antes de revisar si el nombre de usuario está libre. */
const ESPERA_DISPONIBLE_MS = 400

interface RegistroPageProps {
  theme: Theme
  onToggleTheme: () => void
}

/** Crear una cuenta: queda pendiente hasta que un admin la apruebe (decisión 0021). */
export function RegistroPage({ theme, onToggleTheme }: RegistroPageProps) {
  const { registrarse } = useAuth()
  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  // Arranca con un avatar al azar, que se puede cambiar aquí o después en Mi perfil.
  const [avatarSemilla, setAvatarSemilla] = useState(semillaAleatoria)
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [intentoEnviar, setIntentoEnviar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatoUsuario = usuario ? errorDeUsuario(usuario) : null
  const usuarioDiferido = useValorDiferido(usuario, ESPERA_DISPONIBLE_MS)
  const disponible = useUsuarioDisponible(usuarioDiferido, {
    habilitado: usuarioDiferido === usuario && Boolean(usuario) && !formatoUsuario,
  })
  const ocupado = disponible.data === false && usuarioDiferido === usuario

  const errores = {
    nombre: !nombre.trim() ? 'Escribe tu nombre.' : null,
    usuario: !usuario ? 'Elige un nombre de usuario.' : (formatoUsuario ?? (ocupado ? 'Ese nombre de usuario ya existe. Elige otro.' : null)),
    password: password.length < MINIMO_CLAVE ? `Usa al menos ${MINIMO_CLAVE} caracteres.` : null,
    confirmacion: !confirmacion ? 'Repite la contraseña.' : confirmacion !== password ? 'Las contraseñas no coinciden.' : null,
  }
  // Los errores de formato se muestran mientras se escribe; los de campos vacíos, al intentar enviar.
  const visibles = {
    nombre: intentoEnviar ? errores.nombre : null,
    usuario: intentoEnviar || usuario ? errores.usuario : null,
    password: intentoEnviar ? errores.password : null,
    // La confirmación se revisa cuando ya se escribió completa.
    confirmacion: intentoEnviar || (confirmacion && confirmacion.length >= password.length) ? errores.confirmacion : null,
  }
  const ayudaUsuario =
    !usuario || formatoUsuario
      ? 'Con él entras a KIRA. Minúsculas sin tildes, números, punto, guion o guion bajo.'
      : disponible.isFetching || usuarioDiferido !== usuario
        ? 'Revisando si está disponible…'
        : disponible.data
          ? 'Está disponible.'
          : undefined

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setIntentoEnviar(true)
    setError(null)
    if (Object.values(errores).some(Boolean)) return

    setEnviando(true)
    const resultado = await registrarse({ nombre, usuario, password, avatarSemilla })
    setEnviando(false)
    if (resultado.error) setError(resultado.error)
    else {
      notificar.exito('Cuenta creada', { descripcion: 'Un admin debe aprobarla antes de que puedas ver el mapa.' })
    }
  }

  return (
    <PantallaAcceso theme={theme} onToggleTheme={onToggleTheme} subtitulo="Crear una cuenta">
      <p className="alert alert-info">Después de crearla, un admin del equipo debe aprobar tu cuenta.</p>

      <form className="login-form" onSubmit={alEnviar} noValidate>
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className="field-input"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            placeholder="Como te conoce el equipo"
            maxLength={MAX_NOMBRE}
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            aria-invalid={visibles.nombre ? true : undefined}
            aria-describedby={visibles.nombre ? 'registro-nombre-error' : undefined}
          />
          {visibles.nombre && (
            <p id="registro-nombre-error" className="field-error">
              {visibles.nombre}
            </p>
          )}
        </label>

        <label className="field">
          <span className="field-label">Nombre de usuario</span>
          <input
            className="field-input"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Ej.: ana.gomez"
            maxLength={30}
            value={usuario}
            onChange={(evento) => setUsuario(normalizarUsuario(evento.target.value))}
            aria-invalid={visibles.usuario ? true : undefined}
            aria-describedby="registro-usuario-ayuda"
          />
          <p id="registro-usuario-ayuda" className={visibles.usuario ? 'field-error' : 'field-ayuda'} aria-live="polite">
            {visibles.usuario ?? ayudaUsuario}
          </p>
        </label>

        <div className="field">
          <span className="field-label">Tu avatar</span>
          <SelectorAvatar valor={avatarSemilla} onCambiar={setAvatarSemilla} />
        </div>

        <CampoContrasena
          id="registro-password"
          etiqueta="Contraseña"
          valor={password}
          onCambiar={setPassword}
          autoComplete="new-password"
          error={visibles.password}
          ayuda={`Mínimo ${MINIMO_CLAVE} caracteres.`}
        />

        <CampoContrasena
          id="registro-confirmacion"
          etiqueta="Repite la contraseña"
          valor={confirmacion}
          onCambiar={setConfirmacion}
          autoComplete="new-password"
          error={visibles.confirmacion}
        />

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="login-alterno">
        ¿Ya tienes cuenta? <Link to="/">Ingresar</Link>
      </p>
    </PantallaAcceso>
  )
}
