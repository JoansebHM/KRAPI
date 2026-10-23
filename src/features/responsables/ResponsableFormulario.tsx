import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { normalizar } from '../../lib/texto'
import { semillaDe, useActualizarResponsable, useCrearResponsable, type Responsable } from './api'
import { semillaAleatoria } from './Avatar'
import { SelectorAvatar } from './SelectorAvatar'

const MAX_NOMBRE = 80
const DUPLICADO = 'Ya hay un responsable con ese nombre.'

interface ResponsableFormularioProps {
  /** Si se pasa, se edita esa persona; si no, se crea una nueva. */
  responsable?: Responsable
  existentes: Responsable[]
  onCerrar: () => void
  onEliminar?: (responsable: Responsable) => void
}

export function ResponsableFormulario({ responsable, existentes, onCerrar, onEliminar }: ResponsableFormularioProps) {
  const [nombre, setNombre] = useState(responsable?.nombre ?? '')
  // Las personas nuevas arrancan con un avatar al azar, que se puede cambiar.
  const [avatarSemilla, setAvatarSemilla] = useState(() => (responsable ? semillaDe(responsable) : semillaAleatoria()))
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const crear = useCrearResponsable()
  const actualizar = useActualizarResponsable()
  const guardando = crear.isPending || actualizar.isPending

  const nombreLimpio = nombre.trim()
  const repetido = existentes.some(
    (otro) => otro.id !== responsable?.id && normalizar(otro.nombre) === normalizar(nombreLimpio),
  )
  const error = !nombreLimpio ? 'Escribe el nombre.' : repetido ? DUPLICADO : null
  const mostrarError = error && (intentoGuardar || repetido)

  async function guardar() {
    setIntentoGuardar(true)
    if (error) return
    try {
      if (responsable) {
        await actualizar.mutateAsync({ id: responsable.id, nombre, avatarSemilla })
        notificar.exito('Cambios guardados', { descripcion: `Se actualizó a ${nombreLimpio}.` })
      } else {
        await crear.mutateAsync({ nombre, avatarSemilla })
        notificar.exito('Responsable agregado', { descripcion: `${nombreLimpio} ya se puede elegir en los estudios.` })
      }
      onCerrar()
    } catch (errorGuardar) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(errorGuardar, { duplicado: DUPLICADO }) })
    }
  }

  return (
    <Dialog
      titulo={responsable ? 'Editar responsable' : 'Nuevo responsable'}
      onCerrar={guardando ? undefined : onCerrar}
      onSubmit={() => void guardar()}
      acciones={
        <>
          {/* Al editar se enfoca el botón y no el campo, para que en celular no salte el teclado. */}
          <button type="submit" className="btn btn-primary btn-block" disabled={guardando} data-autofocus={responsable ? true : undefined}>
            {guardando ? 'Guardando…' : responsable ? 'Guardar cambios' : 'Agregar responsable'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          {responsable && onEliminar && (
            <button
              type="button"
              className="btn-texto btn-texto-peligro"
              onClick={() => onEliminar(responsable)}
              disabled={guardando}
            >
              Eliminar responsable
            </button>
          )}
        </>
      }
    >
      <div className="formulario">
        <div className="field">
          <span className="field-label">Avatar</span>
          <SelectorAvatar valor={avatarSemilla} onCambiar={setAvatarSemilla} />
        </div>

        <label className="field">
          <span className="field-label">Nombre completo</span>
          <input
            className="field-input"
            type="text"
            placeholder="Ej.: María Gómez"
            maxLength={MAX_NOMBRE}
            autoCapitalize="words"
            autoComplete="off"
            enterKeyHint="done"
            value={nombre}
            aria-invalid={Boolean(mostrarError)}
            aria-describedby={mostrarError ? 'responsable-nombre-error' : undefined}
            onChange={(evento) => setNombre(evento.target.value)}
          />
          {mostrarError && (
            <p id="responsable-nombre-error" className="field-error">
              {error}
            </p>
          )}
        </label>
      </div>
    </Dialog>
  )
}
