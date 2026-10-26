import { mostrarFecha, mostrarHora } from '../estudios/campos'
import { estadoDe, yaEmpezo, type Participacion, type Salida } from './api'

/** "30 oct 2026 · 2:00 p. m." */
export const cuandoEs = (salida: Salida) => `${mostrarFecha(salida.fecha)} · ${mostrarHora(salida.horaInicio)}`

/** Cómo va una persona en su zona, en palabras. */
export function textoDeEstado(salida: Salida, participacion: Participacion) {
  const estado = estadoDe(salida, participacion)
  if (estado === 'cancelada') return 'Salida cancelada'
  if (estado === 'sin-reportar') return yaEmpezo(salida) ? 'Sin reportar' : 'Programada'
  const termino = participacion.horaFin ? ` · terminó ${mostrarHora(participacion.horaFin)}` : ''
  return estado === 'completa' ? `Completa${termino}` : `${participacion.porcentaje} %${termino}`
}
