/**
 * Presencia (decisión 0036): quién tiene KIRA abierta ahora. Funciones puras del cálculo, para
 * probarlas aparte del canal de Realtime.
 */

/** Nombre del canal privado de Realtime. La política RLS de la migración `presencia` usa el mismo. */
export const CANAL_PRESENCIA = 'presencia'

/** Si la app queda oculta más de este tiempo (otra pestaña, pantalla apagada), la persona deja de figurar en línea. */
export const GRACIA_OCULTA_MS = 60 * 1000

/**
 * Ids de las cuentas en línea a partir del estado de presencia de Realtime. La clave de cada
 * entrada es el id de la cuenta y su valor, una entrada por pestaña o dispositivo abierto: varias
 * pestañas de la misma cuenta cuentan como una sola persona.
 */
export function idsEnLinea(estado: Record<string, readonly unknown[]>): string[] {
  return Object.entries(estado)
    .filter(([, conexiones]) => conexiones.length > 0)
    .map(([id]) => id)
}
