import type { CamposEstudio, Estudio } from './api'

/** Responsables del último estudio guardado desde este dispositivo. */
const CLAVE_ULTIMOS_RESPONSABLES = 'krapi-ultimos-responsables'

export function ultimosResponsables(): string[] {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_ULTIMOS_RESPONSABLES) ?? '[]')
    return Array.isArray(guardados) ? guardados.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function recordarResponsables(ids: string[]) {
  try {
    localStorage.setItem(CLAVE_ULTIMOS_RESPONSABLES, JSON.stringify(ids))
  } catch {
    // Sin almacenamiento (por ejemplo, navegación privada): la próxima vez vendrán vacíos.
  }
}

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** Fecha local 'AAAA-MM-DD' (no UTC: a las 8 p. m. en Colombia ya sería mañana en UTC). */
export function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`
}

/**
 * Campos de un estudio nuevo: hoy, desde ahora hasta dentro de una hora, con el responsable vinculado a la
 * cuenta ("Este soy yo") y los del último estudio de este dispositivo que todavía existen (si aún no se
 * conocen los existentes, sin responsables).
 */
export function estudioNuevo(
  responsablesExistentes: string[] | undefined,
  responsablePropio: string | null = null,
  ahora = new Date(),
): CamposEstudio {
  const inicio = `${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`
  // Si la hora siguiente pasa de la medianoche, el fin queda en 23:59 (el estudio es de un solo día).
  const fin = ahora.getHours() < 23 ? `${dosDigitos(ahora.getHours() + 1)}:${dosDigitos(ahora.getMinutes())}` : '23:59'
  return {
    titulo: '',
    fecha: fechaLocal(ahora),
    horaInicio: inicio,
    horaFin: fin,
    responsableIds: [...new Set([responsablePropio, ...ultimosResponsables()])].filter(
      (id): id is string => id !== null && Boolean(responsablesExistentes?.includes(id)),
    ),
    entrevistado: '',
    notas: [],
  }
}

export function camposDe(estudio: Estudio): CamposEstudio {
  return {
    titulo: estudio.titulo,
    fecha: estudio.fecha,
    horaInicio: estudio.horaInicio,
    horaFin: estudio.horaFin,
    responsableIds: estudio.responsableIds,
    entrevistado: estudio.entrevistado ?? '',
    notas: [...estudio.notas],
  }
}

const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })

/** '2026-10-30' → '30 oct 2026' (más corto que el formato de es-CO, '30 de oct de 2026'). */
export function mostrarFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const partes = Object.fromEntries(formatoFecha.formatToParts(new Date(anio, mes - 1, dia)).map(({ type, value }) => [type, value]))
  return `${partes.day} ${partes.month.replace('.', '')} ${partes.year}`
}

/** Fecha y hora guardadas por la base de datos (ISO, en UTC) → '30 oct 2026' en la hora local. */
export function mostrarFechaDe(momento: string) {
  return mostrarFecha(fechaLocal(new Date(momento)))
}

/** Si un registro se editó después de crearlo (no cuenta el primer minuto, cuando se guardan sus partes). */
export function fueEditado(creadoEn: string, actualizadoEn: string) {
  return new Date(actualizadoEn).getTime() - new Date(creadoEn).getTime() > 60 * 1000
}

/** '14:00' → '2:00 p. m.'. */
export function mostrarHora(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return formatoHora.format(new Date(2000, 0, 1, h, m))
}
