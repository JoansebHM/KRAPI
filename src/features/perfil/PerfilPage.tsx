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
import { Avatar } from '../responsables/Avatar'
import { semillaDe, useResponsables } from '../responsables/api'
import { useUsuarios } from '../usuarios/api'
import { useActualizarPerfil, useCambiarContrasena } from './api'
import './PerfilPage.css'

const MAX_NOMBRE = 80

/** Mi perfil: nombre, "Este soy yo" y cambiar la contraseña. */
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
  const [responsableId, setResponsableId] = useState(perfil.responsable_id)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const actualizar = useActualizarPerfil(perfil.id)
  const { data: responsables, isPending: cargandoResponsables } = useResponsables()
  const { data: cuentas } = useUsuarios()

  // Responsables que ya son de otra cuenta: id → nombre de usuario de esa cuenta.
  const tomados = new Map(
    (cuentas ?? []).filter((cuenta) => cuenta.id !== perfil.id && cuenta.responsable_id).map((cuenta) => [cuenta.responsable_id!, cuenta.usuario]),
  )
  const error = !nombre.trim() ? 'Escribe tu nombre.' : null
  const sinCambios = nombre.trim() === perfil.nombre && responsableId === perfil.responsable_id

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setIntentoGuardar(true)
    if (error) return
    try {
      await actualizar.mutateAsync({ nombre, responsableId })
      notificar.exito('Perfil actualizado')
    } catch (errorGuardar) {
      notificar.error('No se pudo guardar', {
        descripcion: mensajeErrorDatos(errorGuardar, { duplicado: 'Ese responsable ya está vinculado a otra cuenta.' }),
      })
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

      <fieldset className="field perfil-este-soy-yo">
        <legend className="field-label">Este soy yo</legend>
        <p className="field-ayuda">
          El responsable que eres en los estudios. Vendrá marcado cuando registres un estudio nuevo.
        </p>
        {cargandoResponsables ? (
          <p className="chips-nota">Cargando responsables…</p>
        ) : !responsables?.length ? (
          <p className="chips-nota">Aún no hay responsables. Puedes crearlos desde el menú, en Responsables.</p>
        ) : (
          <div className="chips">
            <button type="button" className="chip perfil-chip-ninguno" aria-pressed={responsableId === null} onClick={() => setResponsableId(null)}>
              <span>Ninguno</span>
            </button>
            {responsables.map((responsable) => {
              const deOtraCuenta = tomados.get(responsable.id)
              return (
                <button
                  key={responsable.id}
                  type="button"
                  className={`chip${deOtraCuenta ? ' perfil-chip-tomado' : ''}`}
                  aria-pressed={responsableId === responsable.id}
                  aria-disabled={deOtraCuenta ? true : undefined}
                  onClick={() => !deOtraCuenta && setResponsableId(responsable.id)}
                >
                  <Avatar semilla={semillaDe(responsable)} tamano={32} />
                  <span>
                    {responsable.nombre}
                    {deOtraCuenta && <span className="perfil-chip-detalle"> · cuenta de {deOtraCuenta}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </fieldset>

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
