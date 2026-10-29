import type { Bloque, Guia, Pregunta } from './guias'

export interface PreguntaConBloque {
  pregunta: Pregunta
  bloque: Bloque
  /** Si viene de un módulo (Policía, Turistas…) y no del tronco común. */
  esDeModulo: boolean
}

/** El módulo elegido de la guía, o el primero si no hay uno válido. `undefined` si la guía no tiene módulos. */
export function moduloDe(guia: Guia, moduloId?: string | null) {
  const opciones = guia.modulos?.opciones
  if (!opciones) return undefined
  return opciones.find((opcion) => opcion.id === moduloId) ?? opciones[0]
}

/**
 * Las preguntas de una guía en el orden de la entrevista: primero las imprescindibles (★) y luego las
 * complementarias; en cada grupo, las del tronco común y después las del módulo elegido.
 */
export function ordenarPreguntas(guia: Guia, moduloId?: string | null) {
  const modulo = moduloDe(guia, moduloId)
  const todas: PreguntaConBloque[] = [
    ...guia.bloques.flatMap((bloque) => bloque.preguntas.map((pregunta) => ({ pregunta, bloque, esDeModulo: false }))),
    ...(modulo ? modulo.bloque.preguntas.map((pregunta) => ({ pregunta, bloque: modulo.bloque, esDeModulo: true })) : []),
  ]
  // El orden de `todas` ya es tronco → módulo, y el filtro conserva el orden.
  return {
    imprescindibles: todas.filter((item) => item.pregunta.imprescindible),
    complementarias: todas.filter((item) => !item.pregunta.imprescindible),
  }
}
