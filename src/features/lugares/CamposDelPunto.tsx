import type { CamposPunto } from './api'
import { SelectorCategoria } from './SelectorCategoria'
import { erroresDePunto } from './validarPunto'

const MAX_NOMBRE = 80
const MAX_DESCRIPCION = 1000

interface CamposDelPuntoProps {
  campos: CamposPunto
  onCambiar: (campos: CamposPunto) => void
  /** Los errores se muestran después del primer intento de guardar. */
  mostrarErrores: boolean
}

/** Los datos de un punto, para crearlo o editarlo. */
export function CamposDelPunto({ campos, onCambiar, mostrarErrores }: CamposDelPuntoProps) {
  const cambiar = (campo: keyof CamposPunto) => (valor: string | null) => onCambiar({ ...campos, [campo]: valor })
  const errores = erroresDePunto(campos)

  return (
    <div className="formulario">
      <Campo
        etiqueta="Nombre"
        id="punto-nombre"
        error={mostrarErrores ? errores.nombre : null}
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
        error={mostrarErrores ? errores.telefono : null}
        valor={campos.contactoTelefono}
        onCambiar={cambiar('contactoTelefono')}
        placeholder="Ej.: 300 123 4567"
      />
      <label className="field">
        <span className="field-label">
          Descripción<span className="field-opcional"> (opcional)</span>
        </span>
        <textarea
          className="field-input field-textarea"
          rows={3}
          maxLength={MAX_DESCRIPCION}
          autoCapitalize="sentences"
          placeholder="Ej.: Abre de lunes a sábado. Vende al por mayor."
          value={campos.descripcion}
          onChange={(evento) => cambiar('descripcion')(evento.target.value)}
        />
      </label>
    </div>
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
