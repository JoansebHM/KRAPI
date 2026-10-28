import { useState } from 'react'
import { Dialog } from '../../components/Dialog'

const MAX_TITULO = 120
const MAX_DESCRIPCION = 1000

interface GuardarBocetoProps {
  guardando: boolean
  onGuardar: (titulo: string, descripcion: string) => void
  onCerrar: () => void
}

/** Pide el título (obligatorio) y la descripción (opcional) del boceto antes de guardarlo. */
export function GuardarBoceto({ guardando, onGuardar, onCerrar }: GuardarBocetoProps) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const error = titulo.trim() ? null : 'Escribe un título.'

  function guardar() {
    setIntentoGuardar(true)
    if (!error) onGuardar(titulo, descripcion)
  }

  return (
    <Dialog
      titulo="Guardar boceto"
      onCerrar={guardando ? undefined : onCerrar}
      onSubmit={guardar}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar boceto'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={guardando}>
            Seguir dibujando
          </button>
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">Título</span>
          <input
            className="field-input"
            type="text"
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="next"
            placeholder="Ej.: Ruta del bus 133 por la 10"
            maxLength={MAX_TITULO}
            value={titulo}
            aria-invalid={intentoGuardar && Boolean(error)}
            aria-describedby={intentoGuardar && error ? 'boceto-titulo-error' : undefined}
            onChange={(evento) => setTitulo(evento.target.value)}
          />
          {intentoGuardar && error && (
            <p id="boceto-titulo-error" className="field-error">
              {error}
            </p>
          )}
        </label>
        <label className="field">
          <span className="field-label">
            Descripción<span className="field-opcional"> (opcional)</span>
          </span>
          <textarea
            className="field-input field-textarea"
            rows={3}
            maxLength={MAX_DESCRIPCION}
            autoCapitalize="sentences"
            placeholder="Ej.: Pasa cada 15 minutos entre las 6 y las 9 a. m."
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
          />
        </label>
      </div>
    </Dialog>
  )
}
