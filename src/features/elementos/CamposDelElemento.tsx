import { SelectorCategoria } from '../lugares/SelectorCategoria'
import { errorDeNombre, type CamposElemento } from './api'

const MAX_NOMBRE = 80
const MAX_DESCRIPCION = 1000

interface CamposDelElementoProps {
  campos: CamposElemento
  onCambiar: (campos: CamposElemento) => void
  /** Los errores se muestran después del primer intento de guardar. */
  mostrarErrores: boolean
}

/** Los datos de un elemento, para crearlo o editarlo: nombre, categoría y descripción. */
export function CamposDelElemento({ campos, onCambiar, mostrarErrores }: CamposDelElementoProps) {
  const error = mostrarErrores ? errorDeNombre(campos) : null

  return (
    <div className="formulario">
      <label className="field">
        <span className="field-label">Nombre</span>
        <input
          className="field-input"
          type="text"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="next"
          placeholder="Ej.: Caneca de la esquina"
          maxLength={MAX_NOMBRE}
          value={campos.nombre}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'elemento-nombre-error' : undefined}
          onChange={(evento) => onCambiar({ ...campos, nombre: evento.target.value })}
        />
        {error && (
          <p id="elemento-nombre-error" className="field-error">
            {error}
          </p>
        )}
      </label>

      <div className="field">
        <span className="field-label">Categoría</span>
        <SelectorCategoria para="elementos" valor={campos.categoriaId} onCambiar={(categoriaId) => onCambiar({ ...campos, categoriaId })} />
      </div>

      <label className="field">
        <span className="field-label">
          Descripción<span className="field-opcional"> (opcional)</span>
        </span>
        <textarea
          className="field-input field-textarea"
          rows={3}
          maxLength={MAX_DESCRIPCION}
          autoCapitalize="sentences"
          placeholder="Ej.: Está rota y la recogen los martes."
          value={campos.descripcion}
          onChange={(evento) => onCambiar({ ...campos, descripcion: evento.target.value })}
        />
      </label>
    </div>
  )
}
