import { SelectorCategoria } from '../lugares/SelectorCategoria'
import type { CamposElemento } from './api'

const MAX_NOMBRE = 80
const MAX_DESCRIPCION = 1000

interface CamposDelElementoProps {
  campos: CamposElemento
  onCambiar: (campos: CamposElemento) => void
}

/** Los datos de un elemento, para crearlo o editarlo: nombre (opcional), categoría y descripción. */
export function CamposDelElemento({ campos, onCambiar }: CamposDelElementoProps) {
  return (
    <div className="formulario">
      <label className="field">
        <span className="field-label">
          Nombre<span className="field-opcional"> (opcional)</span>
        </span>
        <input
          className="field-input"
          type="text"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="next"
          placeholder="Sin nombre se muestra la categoría"
          maxLength={MAX_NOMBRE}
          value={campos.nombre}
          onChange={(evento) => onCambiar({ ...campos, nombre: evento.target.value })}
        />
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
