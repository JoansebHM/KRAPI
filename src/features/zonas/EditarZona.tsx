import { useState } from 'react'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import type { DetalleLugar } from '../lugares/api'
import { useActualizarZona, type CamposZona } from './api'
import { FormularioZona } from './FormularioZona'

/** Editar nombre, tipo y descripción de una zona. La forma se cambia con "Redibujar". */
export function EditarZona({ lugar, onCerrar }: { lugar: DetalleLugar; onCerrar: () => void }) {
  const [campos, setCampos] = useState<CamposZona>({
    nombre: lugar.nombre,
    tipoZonaId: lugar.tipoZonaId,
    descripcion: lugar.descripcion ?? '',
  })
  const actualizar = useActualizarZona()

  async function guardar() {
    try {
      await actualizar.mutateAsync({ id: lugar.id, campos })
      notificar.exito('Cambios guardados', { descripcion: `«${campos.nombre.trim()}» quedó actualizada.` })
      onCerrar()
    } catch (error) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return <FormularioZona titulo="Editar zona" campos={campos} onCambiar={setCampos} onGuardar={guardar} textoGuardar="Guardar cambios" onCerrar={onCerrar} editando />
}
