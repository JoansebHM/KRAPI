/** Reglas de la sesión del usuario compartido. Cambiarlas aquí cambia el comportamiento en toda la app. */

const MINUTO = 60 * 1000
const HORA = 60 * MINUTO
const DIA = 24 * HORA

/** Sin usar la app durante este tiempo, la sesión se cierra. */
export const INACTIVIDAD_MAXIMA_MS = 2 * HORA

/** Cuánto antes de cerrar por inactividad se muestra el aviso para seguir conectado. */
export const AVISO_ANTES_MS = 1 * MINUTO

/** Pasado este tiempo desde que se inició sesión, se pide la contraseña de nuevo. */
export const DURACION_MAXIMA_MS = 7 * DIA
