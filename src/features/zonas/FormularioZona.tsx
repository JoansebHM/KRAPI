import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import type { CamposZona } from './api'
import { SelectorTipoZona } from './SelectorTipoZona'
import '../tiposZona/TiposZonaPage.css'

const MAX_NOMBRE = 80
const MAX_DESCRIPCION = 1000

interface FormularioZonaProps {
  titulo: string
  campos: CamposZona
  onCambiar: (campos: CamposZona) => void
  onGuardar: () => Promise<void>
  textoGuardar: string
  onCerrar: () => void
  /** Al editar se enfoca el botón y no el primer campo, para que en celular no salte el teclado. */
  editando?: boolean
}

/** Datos de una zona: nombre, tipo y descripción. */
export function FormularioZona({ titulo, campos, onCambiar, onGuardar, textoGuardar, onCerrar, editando }: FormularioZonaProps) {
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const error = campos.nombre.trim() ? null : 'Escribe el nombre de la zona.'

  async function guardar() {
    setIntentoGuardar(true)
    if (error) return
    setGuardando(true)
    try {
      await onGuardar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog
      titulo={titulo}
      onCerrar={guardando ? undefined : onCerrar}
      onSubmit={() => void guardar()}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={guardando} data-autofocus={editando ? true : undefined}>
            {guardando ? 'Guardando…' : textoGuardar}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className="field-input"
            type="text"
            placeholder="Ej.: Manzana del parque"
            maxLength={MAX_NOMBRE}
            autoCapitalize="sentences"
            value={campos.nombre}
            aria-invalid={intentoGuardar && error ? true : undefined}
            aria-describedby={intentoGuardar && error ? 'zona-nombre-error' : undefined}
            onChange={(evento) => onCambiar({ ...campos, nombre: evento.target.value })}
          />
          {intentoGuardar && error && (
            <p id="zona-nombre-error" className="field-error">
              {error}
            </p>
          )}
        </label>
        <div className="field">
          <span className="field-label">
            Tipo<span className="field-opcional"> (de qué es la zona)</span>
          </span>
          <SelectorTipoZona valor={campos.tipoZonaId} onCambiar={(tipoZonaId) => onCambiar({ ...campos, tipoZonaId })} />
        </div>
        <label className="field">
          <span className="field-label">
            Descripción<span className="field-opcional"> (opcional)</span>
          </span>
          <textarea
            className="field-input field-textarea"
            rows={3}
            maxLength={MAX_DESCRIPCION}
            placeholder="Ej.: Cuadra con locales a ambos lados de la calle."
            value={campos.descripcion}
            onChange={(evento) => onCambiar({ ...campos, descripcion: evento.target.value })}
          />
        </label>
      </div>
    </Dialog>
  )
}
