/** Traduce errores de la base de datos (PostgREST) a mensajes entendibles en español. */

interface ErrorConCodigo {
  code?: string
  message?: string
}

interface Contexto {
  /** Mensaje cuando ya existe un registro igual (por ejemplo, un nombre repetido). */
  duplicado?: string
  /** Mensaje cuando la cuenta no tiene permiso para la acción (por ejemplo, borrar algo de otra persona). */
  sinPermiso?: string
  /** Mensaje cuando la base de datos rechaza un dato por una de sus reglas (por ejemplo, una zona fuera de Manila). */
  invalido?: string
}

/**
 * Error para cuando un borrado no borró nada. Si las políticas RLS no dejan borrar una fila,
 * Supabase no responde con error: simplemente borra 0 filas.
 */
export const SIN_PERMISO: ErrorConCodigo = { code: '42501', message: 'No se borró ninguna fila' }

export function mensajeErrorDatos(error: unknown, contexto: Contexto = {}): string {
  if (error instanceof TypeError || (error as ErrorConCodigo)?.message?.includes('Failed to fetch')) {
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
  }
  const codigo = (error as ErrorConCodigo)?.code
  switch (codigo) {
    case '23505':
      return contexto.duplicado ?? 'Ya existe un registro igual.'
    case '23514':
    case '23502':
      return contexto.invalido ?? 'Algún dato no es válido. Revisa el formulario.'
    case '42501':
      return contexto.sinPermiso ?? 'No tienes permiso para hacer esto.'
    case 'PGRST301':
    case 'PGRST303':
      return 'Tu sesión ya no es válida. Vuelve a iniciar sesión.'
    default:
      return 'No se pudo completar la acción. Inténtalo de nuevo.'
  }
}
