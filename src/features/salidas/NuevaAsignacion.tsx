import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { ZONA_INVALIDA } from '../zonas/api'
import { DibujarZona } from '../zonas/DibujarZona'
import type { Esquina } from '../zonas/geometria'
import { useGuardarAsignacion } from './api'
import { FormularioAsignacion } from './FormularioAsignacion'

/** Un admin dibuja una zona de asignación para la salida y elige quiénes la cubren. */
export function NuevaAsignacion() {
  const { id: salidaId } = useParams()
  const navigate = useNavigate()
  const guardar = useGuardarAsignacion()
  const [esquinas, setEsquinas] = useState<Esquina[] | null>(null)

  async function alGuardar({ nombre, participanteIds }: { nombre: string; participanteIds: string[] }) {
    try {
      await guardar.mutateAsync({ salidaId: salidaId!, nombre, participanteIds, esquinas: esquinas! })
      notificar.exito('Zona asignada', { descripcion: `«${nombre.trim()}» quedó en la salida.` })
      navigate(`/salidas/${salidaId}`)
    } catch (error) {
      notificar.error('No se pudo asignar la zona', {
        descripcion: mensajeErrorDatos(error, { invalido: ZONA_INVALIDA, sinPermiso: 'Solo un admin puede asignar zonas.' }),
      })
    }
  }

  return (
    <>
      <DibujarZona cancelarA={`/salidas/${salidaId}`} textoTerminar="Terminar" onTerminar={setEsquinas} />
      {esquinas && <FormularioAsignacion titulo="Zona asignada" onGuardar={alGuardar} textoGuardar="Asignar zona" onCerrar={() => setEsquinas(null)} />}
    </>
  )
}
