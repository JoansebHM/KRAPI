/**
 * Correo de contacto opcional para los avisos (decisión 0035). No es el de entrar: se entra con el
 * nombre de usuario. La base de datos aplica el mismo formato (`correo_o_nulo` y la restricción de
 * `contactos`).
 */

const FORMATO_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MAX_CORREO = 254

/** Quita espacios y pasa a minúsculas, que es como se guarda. */
export const normalizarCorreo = (texto: string) => texto.trim().toLowerCase()

/** Qué tiene de malo el correo, o null si sirve o está vacío (es opcional). */
export function errorDeCorreo(texto: string): string | null {
  const correo = normalizarCorreo(texto)
  if (!correo) return null
  if (correo.length > MAX_CORREO || !FORMATO_CORREO.test(correo)) return 'Escribe un correo válido, como nombre@ejemplo.com.'
  return null
}
