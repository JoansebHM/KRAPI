import { AVISO_ANTES_MS, DURACION_MAXIMA_MS, INACTIVIDAD_MAXIMA_MS } from '../../config/session'

/**
 * Lógica pura de la política de sesión: dado el momento actual, la última actividad y el
 * inicio de sesión, decide si la sesión sigue, si hay que avisar o si hay que cerrarla.
 *
 * El plan gratuito de Supabase no permite limitar sesiones desde el servidor, así que la app
 * aplica estas reglas en el dispositivo.
 */

export type MotivoCierre =
  | 'inactividad'
  | 'duracion_maxima'
  | 'manual'
  | 'todos_los_dispositivos'
  | 'remoto'
  | 'cuenta_desactivada'

export type EstadoSesion =
  | { tipo: 'activa' }
  | { tipo: 'aviso'; restanteMs: number }
  | { tipo: 'cerrar'; motivo: 'inactividad' | 'duracion_maxima' }

interface Marcas {
  ahora: number
  ultimaActividad: number
  inicio: number
}

export function evaluarSesion({ ahora, ultimaActividad, inicio }: Marcas): EstadoSesion {
  if (ahora - inicio >= DURACION_MAXIMA_MS) return { tipo: 'cerrar', motivo: 'duracion_maxima' }

  const inactivo = ahora - ultimaActividad
  if (inactivo >= INACTIVIDAD_MAXIMA_MS) return { tipo: 'cerrar', motivo: 'inactividad' }

  const restanteMs = INACTIVIDAD_MAXIMA_MS - inactivo
  if (restanteMs <= AVISO_ANTES_MS) return { tipo: 'aviso', restanteMs }

  return { tipo: 'activa' }
}

/* ----- Marcas guardadas en el navegador (compartidas entre pestañas) ----- */

const CLAVE_INICIO = 'krapi-sesion-inicio'
const CLAVE_ACTIVIDAD = 'krapi-sesion-actividad'

function leer(clave: string): number | null {
  try {
    const valor = Number(localStorage.getItem(clave))
    return Number.isFinite(valor) && valor > 0 ? valor : null
  } catch {
    return null
  }
}

function escribir(clave: string, valor: number) {
  try {
    localStorage.setItem(clave, String(valor))
  } catch {
    // Sin almacenamiento disponible: la política se aplica solo mientras la pestaña siga abierta.
  }
}

/** Lee las marcas guardadas. Si faltan (por ejemplo, se borró el almacenamiento), arranca desde ahora. */
export function leerMarcas(ahora = Date.now()) {
  const inicio = leer(CLAVE_INICIO) ?? ahora
  const ultimaActividad = leer(CLAVE_ACTIVIDAD) ?? ahora
  escribir(CLAVE_INICIO, inicio)
  escribir(CLAVE_ACTIVIDAD, ultimaActividad)
  return { inicio, ultimaActividad }
}

export function registrarInicio(ahora = Date.now()) {
  escribir(CLAVE_INICIO, ahora)
  escribir(CLAVE_ACTIVIDAD, ahora)
}

export function registrarActividad(ahora = Date.now()) {
  escribir(CLAVE_ACTIVIDAD, ahora)
}

export function borrarMarcas() {
  try {
    localStorage.removeItem(CLAVE_INICIO)
    localStorage.removeItem(CLAVE_ACTIVIDAD)
  } catch {
    // Nada que borrar.
  }
}
