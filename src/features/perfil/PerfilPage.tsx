import { useState, type FormEvent } from 'react'
import { AuthApiError } from '@supabase/supabase-js'
import { Panel } from '../../components/Panel'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import type { Perfil } from '../auth/api'
import { CampoContrasena } from '../auth/CampoContrasena'
import { mensajeDeError } from '../auth/mensajesError'
import { MINIMO_CLAVE } from '../auth/nombreDeUsuario'
import { useAuth } from '../auth/useAuth'
import { semillaDe } from '../usuarios/api'
import { SelectorAvatar } from '../usuarios/SelectorAvatar'
import { useActualizarPerfil, useCambiarContrasena } from './api'
import './PerfilPage.css'

const MAX_NOMBRE = 80

/** Mi perfil: nombre, avatar y cambiar la contraseña. */
export function PerfilPage() {
  const { perfil } = useAuth()
  // App solo muestra esta página con la cuenta activa, así que el perfil ya está cargado.
  if (!perfil) return null
  return (
    <Panel titulo="Mi perfil" subtitulo={`${perfil.usuario} · ${perfil.rol === 'admin' ? 'Admin' : 'Miembro'}`}>
      <DatosDelPerfil perfil={perfil} />
      <CambiarContrasena />
    </Panel>
  )
}

function DatosDelPerfil({ perfil }: { perfil: Perfil }) {
  const [nombre, setNombre] = useState(perfil.nombre)
  const [avatarSemilla, setAvatarSemilla] = useState(() => semillaDe(perfil))
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const actualizar = useActualizarPerfil(perfil.id)

  const error = !nombre.trim() ? 'Escribe tu nombre.' : null
  const sinCambios = nombre.trim() === perfil.nombre && avatarSemilla === semillaDe(perfil)

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setIntentoGuardar(true)
    if (error) return
    try {
      await actualizar.mutateAsync({ nombre, avatarSemilla })
      notificar.exito('Perfil actualizado')
    } catch (errorGuardar) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(errorGuardar) })
    }
  }

  return (
    <form className="perfil-seccion" onSubmit={guardar} aria-labelledby="perfil-datos-titulo">
      <h2 id="perfil-datos-titulo" className="perfil-seccion-titulo">
        Tus datos
      </h2>

      <label className="field">
        <span className="field-label">Nombre</span>
        <input
          className="field-input"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={MAX_NOMBRE}
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          aria-invalid={intentoGuardar && error ? true : undefined}
          aria-describedby={intentoGuardar && error ? 'perfil-nombre-error' : undefined}
        />
        {intentoGuardar && error && (
          <p id="perfil-nombre-error" className="field-error">
            {error}
          </p>
        )}
      </label>

      <div className="field">
        <span className="field-label">Tu avatar</span>
        <p className="field-ayuda">Así te ve el equipo en los estudios y en las asignaciones.</p>
        <SelectorAvatar valor={avatarSemilla} onCambiar={setAvatarSemilla} />
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={actualizar.isPending || sinCambios}>
        {actualizar.isPending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}

function CambiarContrasena() {
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [intentoEnviar, setIntentoEnviar] = useState(false)
  const cambiar = useCambiarContrasena()

  const errores = {
    password: password.length < MINIMO_CLAVE ? `Usa al menos ${MINIMO_CLAVE} caracteres.` : null,
    confirmacion: !confirmacion ? 'Repite la contraseña.' : confirmacion !== password ? 'Las contraseñas no coinciden.' : null,
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setIntentoEnviar(true)
    if (errores.password || errores.confirmacion) return
    try {
      await cambiar.mutateAsync(password)
      setPassword('')
      setConfirmacion('')
      setIntentoEnviar(false)
      notificar.exito('Contraseña cambiada', {
        descripcion: 'Si alguien más la conocía, cierra la sesión en todos los dispositivos desde el menú de la cuenta.',
      })
    } catch (error) {
      const mismaClave = error instanceof AuthApiError && error.code === 'same_password'
      notificar.error('No se pudo cambiar la contraseña', {
        descripcion: mismaClave ? 'La nueva contraseña debe ser distinta de la actual.' : mensajeDeError(error),
      })
    }
  }

  return (
    <form className="perfil-seccion" onSubmit={alEnviar} noValidate aria-labelledby="perfil-clave-titulo">
      <h2 id="perfil-clave-titulo" className="perfil-seccion-titulo">
        Cambiar la contraseña
      </h2>
      <CampoContrasena
        id="perfil-password"
        etiqueta="Nueva contraseña"
        valor={password}
        onCambiar={setPassword}
        autoComplete="new-password"
        error={intentoEnviar ? errores.password : null}
        ayuda={`Mínimo ${MINIMO_CLAVE} caracteres.`}
      />
      <CampoContrasena
        id="perfil-confirmacion"
        etiqueta="Repite la nueva contraseña"
        valor={confirmacion}
        onCambiar={setConfirmacion}
        autoComplete="new-password"
        error={intentoEnviar || (confirmacion && confirmacion.length >= password.length) ? errores.confirmacion : null}
      />
      <button type="submit" className="btn btn-secondary btn-block" disabled={cambiar.isPending}>
        {cambiar.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}
