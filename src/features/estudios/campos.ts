import type { CamposEstudio, Estudio } from './api'

/** Participantes del último estudio guardado desde este dispositivo. */
const CLAVE_ULTIMOS_PARTICIPANTES = 'krapi-ultimos-participantes'

export function ultimosParticipantes(): string[] {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_ULTIMOS_PARTICIPANTES) ?? '[]')
    return Array.isArray(guardados) ? guardados.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function recordarParticipantes(ids: string[]) {
  try {
    localStorage.setItem(CLAVE_ULTIMOS_PARTICIPANTES, JSON.stringify(ids))
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
 * Campos de un estudio nuevo: hoy, desde ahora hasta dentro de una hora, con la cuenta propia y los
 * participantes del último estudio de este dispositivo que siguen activos (si aún no se conocen las
 * cuentas activas, solo la propia).
 */
export function estudioNuevo(
  cuentasActivas: string[] | undefined,
  cuentaPropia: string | null = null,
  ahora = new Date(),
  salidaId: string | null = null,
): CamposEstudio {
  const inicio = `${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`
  // Si la hora siguiente pasa de la medianoche, el fin queda en 23:59 (el estudio es de un solo día).
  const fin = ahora.getHours() < 23 ? `${dosDigitos(ahora.getHours() + 1)}:${dosDigitos(ahora.getMinutes())}` : '23:59'
  return {
    fecha: fechaLocal(ahora),
    horaInicio: inicio,
    horaFin: fin,
    participanteIds: [...new Set([cuentaPropia, ...ultimosParticipantes()])].filter(
      (id): id is string => id !== null && (id === cuentaPropia || Boolean(cuentasActivas?.includes(id))),
    ),
    entrevistado: '',
    notas: [],
    salidaId,
  }
}

export function camposDe(estudio: Estudio): CamposEstudio {
  return {
    fecha: estudio.fecha,
    horaInicio: estudio.horaInicio,
    horaFin: estudio.horaFin,
    participanteIds: estudio.participanteIds,
    entrevistado: estudio.entrevistado ?? '',
    notas: [...estudio.notas],
    salidaId: estudio.salidaId,
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

/** Cómo se identifica un estudio, ya que no tiene título: "30 oct 2026 · 2:00 p. m.". */
export function cuandoFue(estudio: Pick<Estudio, 'fecha' | 'horaInicio'>) {
  return `${mostrarFecha(estudio.fecha)} · ${mostrarHora(estudio.horaInicio)}`
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
