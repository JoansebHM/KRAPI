import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useCrearPunto, type CamposPunto } from './api'
import { SelectorCategoria } from './SelectorCategoria'

const MAX_NOMBRE = 80
/** La misma regla que ubicaciones_telefono_valido en la base de datos. */
const TELEFONO_VALIDO = /^\+?[0-9 ()-]{7,20}$/

interface FormularioPuntoProps {
  posicion: [number, number]
  /** Los datos viven en la pantalla de crear, para no perderlos si se vuelve a ubicar. */
  campos: CamposPunto
  onCambiar: (campos: CamposPunto) => void
  onVolver: () => void
  onGuardado: (id: string, nombre: string) => void
}

export function FormularioPunto({ posicion, campos, onCambiar, onVolver, onGuardado }: FormularioPuntoProps) {
  const crear = useCrearPunto()
  const [intentoGuardar, setIntentoGuardar] = useState(false)

  const cambiar = (campo: keyof CamposPunto) => (valor: string | null) => onCambiar({ ...campos, [campo]: valor })

  const telefono = campos.contactoTelefono.trim()
  const errores = {
    nombre: campos.nombre.trim() ? null : 'Escribe el nombre del lugar.',
    telefono: !telefono || TELEFONO_VALIDO.test(telefono) ? null : 'Escribe solo números, espacios, paréntesis o guiones (7 a 20).',
  }
  const hayErrores = Object.values(errores).some(Boolean)

  async function guardar() {
    setIntentoGuardar(true)
    if (hayErrores) return
    try {
      const [lng, lat] = posicion
      const id = await crear.mutateAsync({ ...campos, contactoTelefono: telefono, lng, lat })
      onGuardado(id, campos.nombre.trim())
    } catch (error) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <Dialog
      titulo="Nuevo lugar"
      onCerrar={crear.isPending ? undefined : onVolver}
      onSubmit={() => void guardar()}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={crear.isPending}>
            {crear.isPending ? 'Guardando…' : 'Guardar lugar'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onVolver} disabled={crear.isPending}>
            Volver a ubicar
          </button>
        </>
      }
    >
      <div className="formulario">
        <Campo
          etiqueta="Nombre"
          id="punto-nombre"
          error={intentoGuardar ? errores.nombre : null}
          valor={campos.nombre}
          onCambiar={cambiar('nombre')}
          placeholder="Ej.: Tienda Don Pepe"
          maxLength={MAX_NOMBRE}
          autoCapitalize="words"
        />

        <div className="field">
          <span className="field-label">Categoría</span>
          <SelectorCategoria valor={campos.categoriaId} onCambiar={cambiar('categoriaId')} />
        </div>

        <Campo etiqueta="Dirección" opcional id="punto-direccion" valor={campos.direccion} onCambiar={cambiar('direccion')} placeholder="Ej.: Calle 10 # 43E-20" />
        <Campo
          etiqueta="Complemento"
          opcional
          id="punto-complemento"
          valor={campos.complemento}
          onCambiar={cambiar('complemento')}
          placeholder="Ej.: Local 102, segundo piso"
        />
        <Campo
          etiqueta="Nombre del contacto"
          opcional
          id="punto-contacto"
          valor={campos.contactoNombre}
          onCambiar={cambiar('contactoNombre')}
          placeholder="Ej.: Administradora"
          autoCapitalize="words"
        />
        <Campo
          etiqueta="Teléfono del contacto"
          opcional
          id="punto-telefono"
          tipo="tel"
          error={intentoGuardar ? errores.telefono : null}
          valor={campos.contactoTelefono}
          onCambiar={cambiar('contactoTelefono')}
          placeholder="Ej.: 300 123 4567"
        />
      </div>
    </Dialog>
  )
}

interface CampoProps {
  etiqueta: string
  id: string
  valor: string
  onCambiar: (valor: string) => void
  placeholder?: string
  opcional?: boolean
  error?: string | null
  tipo?: 'text' | 'tel'
  maxLength?: number
  autoCapitalize?: 'sentences' | 'words'
}

function Campo({ etiqueta, id, valor, onCambiar, placeholder, opcional, error, tipo = 'text', maxLength = 120, autoCapitalize = 'sentences' }: CampoProps) {
  return (
    <label className="field">
      <span className="field-label">
        {etiqueta}
        {opcional && <span className="field-opcional"> (opcional)</span>}
      </span>
      <input
        className="field-input"
        type={tipo}
        inputMode={tipo === 'tel' ? 'tel' : undefined}
        autoComplete={tipo === 'tel' ? 'tel' : 'off'}
        autoCapitalize={tipo === 'tel' ? 'off' : autoCapitalize}
        enterKeyHint="next"
        placeholder={placeholder}
        maxLength={maxLength}
        value={valor}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(evento) => onCambiar(evento.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </label>
  )
}
