import { useNavigate, useParams } from 'react-router'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useRedibujarZona, ZONA_INVALIDA } from './api'
import { DibujarZona } from './DibujarZona'
import type { Esquina } from './geometria'

/** Cambiar la forma de una zona: se redibuja completa con la mira. */
export function RedibujarZona() {
  const { id } = useParams()
  const navigate = useNavigate()
  const redibujar = useRedibujarZona()

  async function guardar(esquinas: Esquina[]) {
    try {
      await redibujar.mutateAsync({ id: id!, esquinas })
      notificar.exito('Forma guardada', { descripcion: 'La zona quedó con su nueva forma.' })
      navigate(`/lugares/${id}`)
    } catch (error) {
      notificar.error('No se pudo guardar la forma', { descripcion: mensajeErrorDatos(error, { invalido: ZONA_INVALIDA }) })
    }
  }

  return <DibujarZona cancelarA={`/lugares/${id}`} textoTerminar="Guardar forma" onTerminar={(esquinas) => void guardar(esquinas)} ocupado={redibujar.isPending} />
}
