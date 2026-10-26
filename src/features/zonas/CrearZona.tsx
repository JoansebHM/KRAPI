import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useSalidas } from '../salidas/api'
import { useCrearZona, ZONA_INVALIDA, ZONA_VACIA, type CamposZona } from './api'
import { DibujarZona } from './DibujarZona'
import { FormularioZona } from './FormularioZona'
import { esquinasDe, type Esquina } from './geometria'

/**
 * Crear una zona: se dibuja con la mira y luego se llenan sus datos. Los estudios se agregan desde su ficha.
 * Con `?asignacion=id` la zona sale de una zona asignada en una salida: trae su forma y su nombre, y no se
 * dibuja. Si esa asignación ya estaba ligada a una zona del mapa, no se crea otra: se va a agregarle un estudio.
 */
export function CrearZona() {
  const [parametros] = useSearchParams()
  const asignacionId = parametros.get('asignacion')
  const { data: salidas } = useSalidas()

  if (!asignacionId) return <NuevaZona />
  if (!salidas) return null
  const asignacion = salidas.flatMap((salida) => salida.asignaciones).find((a) => a.id === asignacionId)
  if (!asignacion) return <NuevaZona />
  if (asignacion.zonaId) return <Navigate to={`/lugares/${asignacion.zonaId}?estudio=nuevo&salida=${asignacion.salidaId}`} replace />
  return (
    <NuevaZona
      inicial={{ esquinas: esquinasDe(asignacion.forma.coordinates[0]), nombre: asignacion.nombre }}
      volverA={`/salidas/${asignacion.salidaId}`}
      asignacionId={asignacion.id}
    />
  )
}

function NuevaZona({
  inicial,
  volverA = '/',
  asignacionId,
}: {
  inicial?: { esquinas: Esquina[]; nombre: string }
  volverA?: string
  asignacionId?: string
}) {
  const navigate = useNavigate()
  const crear = useCrearZona()
  const [esquinas, setEsquinas] = useState<Esquina[] | null>(inicial?.esquinas ?? null)
  const [campos, setCampos] = useState<CamposZona>(inicial ? { ...ZONA_VACIA, nombre: inicial.nombre } : ZONA_VACIA)

  async function guardar() {
    try {
      const id = await crear.mutateAsync({ campos, esquinas: esquinas!, asignacionId })
      notificar.exito('Zona guardada', { descripcion: `«${campos.nombre.trim()}» ya está en el mapa.` })
      navigate(`/lugares/${id}`)
    } catch (error) {
      notificar.error('No se pudo guardar la zona', { descripcion: mensajeErrorDatos(error, { invalido: ZONA_INVALIDA }) })
    }
  }

  return (
    <>
      <DibujarZona cancelarA={volverA} textoTerminar="Terminar" onTerminar={setEsquinas} />
      {esquinas && (
        <FormularioZona
          titulo="Nueva zona"
          campos={campos}
          onCambiar={setCampos}
          onGuardar={guardar}
          textoGuardar="Guardar zona"
          // Si la forma vino de una salida, cerrar el formulario vuelve a la salida.
          onCerrar={() => (inicial ? navigate(volverA) : setEsquinas(null))}
        />
      )}
    </>
  )
}
