import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { esquinasDe, type Esquina } from '../zonas/geometria'
import { ZONA_INVALIDA } from '../zonas/api'
import { DibujarZona } from '../zonas/DibujarZona'
import { useGuardarAsignacion, useSalidas, type Asignacion, type Salida } from './api'
import { FormularioAsignacion } from './FormularioAsignacion'
import { cuandoEs } from './textos'

/**
 * Un admin dibuja una zona de asignación para la salida y elige quiénes la cubren. Si el mismo
 * cuadrante ya se asignó en otra salida, puede reusar su forma en vez de dibujarla de nuevo.
 */
export function NuevaAsignacion() {
  const { id: salidaId } = useParams()
  const navigate = useNavigate()
  const guardar = useGuardarAsignacion()
  const { data: salidas } = useSalidas()
  const [esquinas, setEsquinas] = useState<Esquina[] | null>(null)
  const [heredado, setHeredado] = useState<{ nombre: string; zonaId: string | null } | null>(null)
  const [descartarAnteriores, setDescartarAnteriores] = useState(false)

  // Asignaciones de otras salidas: para poder usar su forma sin volver a dibujarla.
  const anteriores = (salidas ?? [])
    .filter((salida) => salida.id !== salidaId)
    .flatMap((salida) => salida.asignaciones.map((asignacion) => ({ asignacion, salida })))
    .sort((a, b) => b.salida.fecha.localeCompare(a.salida.fecha) || b.salida.horaInicio.localeCompare(a.salida.horaInicio))

  function usarAnterior({ asignacion }: { asignacion: Asignacion; salida: Salida }) {
    setEsquinas(esquinasDe(asignacion.forma.coordinates[0]))
    setHeredado({ nombre: asignacion.nombre, zonaId: asignacion.zonaId })
  }

  async function alGuardar({ nombre, participanteIds }: { nombre: string; participanteIds: string[] }) {
    try {
      await guardar.mutateAsync({ salidaId: salidaId!, nombre, participanteIds, esquinas: esquinas!, zonaId: heredado?.zonaId ?? null })
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
      <DibujarZona
        cancelarA={`/salidas/${salidaId}`}
        textoTerminar="Terminar"
        onTerminar={(nuevasEsquinas) => {
          setHeredado(null)
          setEsquinas(nuevasEsquinas)
        }}
      />
      {!esquinas && !descartarAnteriores && anteriores.length > 0 && (
        <Dialog
          titulo="¿Ya se cubrió esta zona antes?"
          onCerrar={() => setDescartarAnteriores(true)}
          acciones={
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setDescartarAnteriores(true)}>
              Dibujar una zona nueva
            </button>
          }
        >
          <p>Si el cuadrante es el mismo de una salida anterior, úsalo aquí en vez de volver a dibujarlo.</p>
          <ul className="lista">
            {anteriores.map((item) => (
              <li key={item.asignacion.id}>
                <button type="button" className="lista-item" onClick={() => usarAnterior(item)}>
                  <span className="lista-item-textos">
                    <span className="lista-item-titulo">{item.asignacion.nombre}</span>
                    <span className="lista-item-detalle">
                      {item.salida.nombre} · {cuandoEs(item.salida)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
      {esquinas && (
        <FormularioAsignacion
          titulo="Zona asignada"
          nombreInicial={heredado?.nombre}
          onGuardar={alGuardar}
          textoGuardar="Asignar zona"
          onCerrar={() => setEsquinas(null)}
        />
      )}
    </>
  )
}
