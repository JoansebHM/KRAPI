import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { camposDePunto, useActualizarPunto, type DetalleLugar } from './api'
import { CamposDelPunto } from './CamposDelPunto'
import { hayErroresDePunto } from './validarPunto'

/** Editar los datos de un punto desde su ficha. La posición se cambia con "Mover". */
export function EditarPunto({ lugar, onCerrar }: { lugar: DetalleLugar; onCerrar: () => void }) {
  const [campos, setCampos] = useState(() => camposDePunto(lugar))
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const actualizar = useActualizarPunto()

  async function guardar() {
    setIntentoGuardar(true)
    if (hayErroresDePunto(campos)) return
    try {
      await actualizar.mutateAsync({ id: lugar.id, campos })
      notificar.exito('Cambios guardados', { descripcion: `«${campos.nombre.trim()}» quedó actualizado.` })
      onCerrar()
    } catch (error) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <Dialog
      titulo="Editar lugar"
      onCerrar={actualizar.isPending ? undefined : onCerrar}
      onSubmit={() => void guardar()}
      acciones={
        <>
          {/* Se enfoca el botón y no el primer campo, para que en celular no salte el teclado. */}
          <button type="submit" className="btn btn-primary btn-block" disabled={actualizar.isPending} data-autofocus>
            {actualizar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={actualizar.isPending}>
            Cancelar
          </button>
        </>
      }
    >
      <CamposDelPunto campos={campos} onCambiar={setCampos} mostrarErrores={intentoGuardar} />
    </Dialog>
  )
}
