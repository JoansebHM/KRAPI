import { fechaLocal } from '../estudios/campos'
import type { Fragmento } from './api'

const MS_DIA = 86_400_000

/** Días de diferencia entre dos fechas 'AAAA-MM-DD' (b − a). */
function diasEntre(a: string, b: string) {
  const [anioA, mesA, diaA] = a.split('-').map(Number)
  const [anioB, mesB, diaB] = b.split('-').map(Number)
  return Math.round((Date.UTC(anioB, mesB - 1, diaB) - Date.UTC(anioA, mesA - 1, diaA)) / MS_DIA)
}

/**
 * Cuántos puntos de porcentaje puede ir el avance de las tareas por debajo del tiempo transcurrido antes
 * de decir que un fragmento va atrasado. Sin margen, el primer día de cualquier fragmento ya saldría
 * "atrasado" solo porque todavía no se alcanzó a marcar nada.
 */
export const MARGEN_ATRASO = 15

/** Cómo va un fragmento frente a su fecha de entrega (su fecha de fin). */
export type EstadoFragmento = 'sin-tareas' | 'completo' | 'por-empezar' | 'al-dia' | 'atrasado' | 'vencido'

export const TEXTO_DE_ESTADO: Record<EstadoFragmento, string> = {
  'sin-tareas': 'Sin tareas',
  completo: 'Completo',
  'por-empezar': 'Por empezar',
  'al-dia': 'Al día',
  atrasado: 'Atrasado',
  vencido: 'Vencido con pendientes',
}

/** Porcentaje (0 a 100) de un fragmento que ya pasó a `hoy`: 0 si no empieza, 100 si ya terminó. */
export function tiempoTranscurrido(fragmento: Pick<Fragmento, 'fechaInicio' | 'fechaFin'>, hoy: string) {
  if (hoy < fragmento.fechaInicio) return 0
  if (hoy > fragmento.fechaFin) return 100
  const duracion = diasEntre(fragmento.fechaInicio, fragmento.fechaFin) + 1
  return Math.round(((diasEntre(fragmento.fechaInicio, hoy) + 1) / duracion) * 100)
}

/** Porcentaje (0 a 100) de tareas hechas de un fragmento, 0 si no tiene. */
export function avanceDeTareas(fragmento: Pick<Fragmento, 'tareas'>) {
  const total = fragmento.tareas.length
  return total === 0 ? 0 : Math.round((fragmento.tareas.filter((tarea) => tarea.hecha).length / total) * 100)
}

export function estadoDeFragmento(fragmento: Fragmento, hoy: string): EstadoFragmento {
  const total = fragmento.tareas.length
  if (total === 0) return 'sin-tareas'
  if (fragmento.tareas.every((tarea) => tarea.hecha)) return 'completo'
  if (hoy > fragmento.fechaFin) return 'vencido'
  if (hoy < fragmento.fechaInicio) return 'por-empezar'
  return avanceDeTareas(fragmento) < tiempoTranscurrido(fragmento, hoy) - MARGEN_ATRASO ? 'atrasado' : 'al-dia'
}

/** Una fila de la gráfica: un fragmento con su avance, su tiempo y su estado. */
export interface FilaDeFragmento {
  fragmento: Fragmento
  /** % de tareas hechas. */
  avance: number
  /** % del tiempo del fragmento que ya pasó. */
  tiempo: number
  estado: EstadoFragmento
}

export interface ResumenDelCronograma {
  tareas: number
  hechas: number
  /** % de tareas hechas de todas. */
  porcentaje: number
  /** Tareas pendientes en fragmentos cuya fecha de entrega ya pasó. */
  vencidas: number
  /** Fragmentos ya vencidos que todavía tienen tareas pendientes. */
  fragmentosVencidos: number
  /** Tareas hechas hasta la fecha de fin de su fragmento (inclusive). */
  aTiempo: number
  /** Tareas hechas después de la fecha de fin de su fragmento. */
  tarde: number
  /** El fragmento en curso con la entrega más cercana, si hay alguno. */
  enCurso: (FilaDeFragmento & { diasRestantes: number }) | null
  filas: FilaDeFragmento[]
}

/** Las cifras y la gráfica del cronograma. Es pura: recibe la fecha de hoy ('AAAA-MM-DD') para poder probarla. */
export function resumirCronograma(fragmentos: Fragmento[], hoy = fechaLocal()): ResumenDelCronograma {
  const filas = fragmentos.map((fragmento) => ({
    fragmento,
    avance: avanceDeTareas(fragmento),
    tiempo: tiempoTranscurrido(fragmento, hoy),
    estado: estadoDeFragmento(fragmento, hoy),
  }))
  const tareas = fragmentos.flatMap((fragmento) => fragmento.tareas)
  const hechas = tareas.filter((tarea) => tarea.hecha)

  // Una tarea se entrega a tiempo si se marcó hasta el día de fin de su fragmento (en hora local).
  let aTiempo = 0
  let tarde = 0
  for (const fragmento of fragmentos) {
    for (const tarea of fragmento.tareas) {
      if (!tarea.hecha || !tarea.hechaEn) continue
      if (fechaLocal(new Date(tarea.hechaEn)) <= fragmento.fechaFin) aTiempo++
      else tarde++
    }
  }

  const vencidos = fragmentos.filter((fragmento) => fragmento.fechaFin < hoy && fragmento.tareas.some((tarea) => !tarea.hecha))
  const enCurso =
    filas
      .filter(({ fragmento }) => fragmento.fechaInicio <= hoy && hoy <= fragmento.fechaFin)
      .sort((a, b) => a.fragmento.fechaFin.localeCompare(b.fragmento.fechaFin))
      .map((fila) => ({ ...fila, diasRestantes: diasEntre(hoy, fila.fragmento.fechaFin) }))[0] ?? null

  return {
    tareas: tareas.length,
    hechas: hechas.length,
    porcentaje: tareas.length === 0 ? 0 : Math.round((hechas.length / tareas.length) * 100),
    vencidas: vencidos.reduce((total, fragmento) => total + fragmento.tareas.filter((tarea) => !tarea.hecha).length, 0),
    fragmentosVencidos: vencidos.length,
    aTiempo,
    tarde,
    enCurso,
    filas,
  }
}
