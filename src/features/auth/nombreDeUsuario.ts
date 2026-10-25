/**
 * Las cuentas no tienen correo (decisión 0021): se entra con un nombre de usuario. Supabase Auth
 * exige un correo, así que la app lo convierte en un correo interno que nadie ve ni recibe nada.
 * El trigger crear_perfil de la base de datos aplica las mismas reglas.
 */

export const DOMINIO_CUENTAS = 'usuarios.kira.invalid'
export const MINIMO_CLAVE = 10
const FORMATO_USUARIO = /^[a-z0-9._-]{3,30}$/

/** Quita espacios y pasa a minúsculas, que es como se guarda. */
export const normalizarUsuario = (texto: string) => texto.trim().toLowerCase()

/** Qué tiene de malo el nombre de usuario (ya normalizado), o null si sirve. */
export function errorDeUsuario(usuario: string): string | null {
  if (usuario.length < 3) return 'Usa al menos 3 caracteres.'
  if (usuario.length > 30) return 'Usa máximo 30 caracteres.'
  if (!FORMATO_USUARIO.test(usuario)) return 'Usa solo letras sin tildes, números, punto, guion o guion bajo.'
  return null
}

/** Correo interno con el que se entra a Supabase. */
export function correoParaEntrar(texto: string) {
  return `${normalizarUsuario(texto)}@${DOMINIO_CUENTAS}`
}
