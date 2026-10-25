import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import type { CamposPunto } from './api'
import { CamposDelPunto } from './CamposDelPunto'
import { hayErroresDePunto } from './validarPunto'

interface FormularioPuntoProps {
  /** Los datos viven en la pantalla de crear, para no perderlos si se vuelve a ubicar. */
  campos: CamposPunto
  onCambiar: (campos: CamposPunto) => void
  onVolver: () => void
  /** Pasa al estudio (el lugar se guarda junto con él). */
  onSiguiente: () => void
  /** Guarda solo el lugar, sin estudio. */
  onSoloGuardar: () => Promise<void>
}

export function FormularioPunto({ campos, onCambiar, onVolver, onSiguiente, onSoloGuardar }: FormularioPuntoProps) {
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const hayErrores = hayErroresDePunto(campos)

  /** Revisa los campos y, si están bien, ejecuta la acción elegida. */
  function siEsValido(accion: () => void) {
    setIntentoGuardar(true)
    if (!hayErrores) accion()
  }

  async function soloGuardar() {
    setGuardando(true)
    try {
      await onSoloGuardar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog
      titulo="Nuevo lugar"
      onCerrar={guardando ? undefined : onVolver}
      onSubmit={() => siEsValido(onSiguiente)}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={guardando}>
            Siguiente: el estudio
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => siEsValido(() => void soloGuardar())} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Solo guardar el lugar'}
          </button>
          <button type="button" className="btn-texto" onClick={onVolver} disabled={guardando}>
            Volver a ubicar
          </button>
        </>
      }
    >
      <CamposDelPunto campos={campos} onCambiar={onCambiar} mostrarErrores={intentoGuardar} />
    </Dialog>
  )
}

