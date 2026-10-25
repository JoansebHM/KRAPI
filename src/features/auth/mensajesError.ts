import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'

/** Traduce los errores de Supabase Auth a mensajes entendibles en español. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof AuthRetryableFetchError || error instanceof TypeError) {
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
  }
  if (error instanceof AuthApiError) {
    if (error.code === 'invalid_credentials') return 'El usuario o la contraseña no son correctos.'
    if (error.status === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    if (error.code === 'user_already_exists') return 'Ese nombre de usuario ya existe. Elige otro.'
    if (error.code === 'weak_password') return 'La contraseña es muy débil. Usa al menos 10 caracteres.'
    if (error.code === 'signup_disabled') return 'El registro de cuentas está desactivado. Avísale a un admin.'
    if (error.code === 'email_not_confirmed') return 'Este usuario no está confirmado. Avísale al administrador.'
    if (error.code === 'email_provider_disabled') {
      return 'El inicio de sesión con correo está desactivado en Supabase. Avísale al administrador.'
    }
  }
  return 'No se pudo completar la acción. Inténtalo de nuevo.'
}
