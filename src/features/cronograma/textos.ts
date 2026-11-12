import { fechaLocal, mostrarFecha } from '../estudios/campos'
import type { Fragmento } from './api'

/** "3 nov 2026 – 12 nov 2026", o una sola fecha si el fragmento dura un día. */
export function rangoDe(fragmento: Pick<Fragmento, 'fechaInicio' | 'fechaFin'>) {
  if (fragmento.fechaInicio === fragmento.fechaFin) return mostrarFecha(fragmento.fechaInicio)
  return `${mostrarFecha(fragmento.fechaInicio)} – ${mostrarFecha(fragmento.fechaFin)}`
}

/** Lo que se ve como título: el propio, o el rango de fechas si no tiene. */
export const tituloDe = (fragmento: Fragmento) => fragmento.titulo ?? rangoDe(fragmento)

/** Si hoy cae dentro del fragmento. */
export const estaEnCurso = (fragmento: Fragmento, hoy = fechaLocal()) => fragmento.fechaInicio <= hoy && hoy <= fragmento.fechaFin

/** Cómo va el checklist: cuántas tareas están hechas. */
export function avanceDe(fragmento: Fragmento) {
  const total = fragmento.tareas.length
  const hechas = fragmento.tareas.filter((tarea) => tarea.hecha).length
  return { total, hechas, porcentaje: total === 0 ? 0 : Math.round((hechas / total) * 100) }
}

/** Separa los fragmentos: en curso, próximos (el más cercano primero) y anteriores (el más reciente primero). */
export function agruparFragmentos(fragmentos: Fragmento[], hoy = fechaLocal()) {
  return {
    enCurso: fragmentos.filter((f) => estaEnCurso(f, hoy)),
    proximos: fragmentos.filter((f) => f.fechaInicio > hoy),
    anteriores: fragmentos.filter((f) => f.fechaFin < hoy).reverse(),
  }
}
