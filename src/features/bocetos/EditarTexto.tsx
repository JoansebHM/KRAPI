import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { MAX_CARACTERES_TEXTO } from './trazos'

interface EditarTextoProps {
  /** El texto que ya tenía, si se está editando uno. */
  inicial?: string
  onGuardar: (texto: string) => void
  onCerrar: () => void
}

/** Cuadro para escribir un texto nuevo o cambiar el de uno que ya está en la pizarra. */
export function EditarTexto({ inicial, onGuardar, onCerrar }: EditarTextoProps) {
  const editando = inicial !== undefined
  const [texto, setTexto] = useState(inicial ?? '')
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const error = texto.trim() ? null : 'Escribe el texto.'

  function guardar() {
    setIntentoGuardar(true)
    if (!error) onGuardar(texto.trim())
  }

  return (
    <Dialog
      titulo={editando ? 'Editar texto' : 'Nuevo texto'}
      onCerrar={onCerrar}
      onSubmit={guardar}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block">
            {editando ? 'Guardar cambios' : 'Agregar texto'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">Texto</span>
          <textarea
            className="field-input field-textarea"
            rows={3}
            maxLength={MAX_CARACTERES_TEXTO}
            autoCapitalize="sentences"
            placeholder="Ej.: Parada del bus 133"
            value={texto}
            aria-invalid={intentoGuardar && Boolean(error)}
            aria-describedby={intentoGuardar && error ? 'texto-error' : 'texto-ayuda'}
            onChange={(evento) => setTexto(evento.target.value)}
          />
          {intentoGuardar && error ? (
            <p id="texto-error" className="field-error">
              {error}
            </p>
          ) : (
            <p id="texto-ayuda" className="field-ayuda">
              {texto.length} de {MAX_CARACTERES_TEXTO} caracteres. Un salto de línea parte el texto en dos.
            </p>
          )}
        </label>
      </div>
    </Dialog>
  )
}
