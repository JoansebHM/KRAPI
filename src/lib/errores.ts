/** Traduce errores de la base de datos (PostgREST) a mensajes entendibles en español. */

interface ErrorConCodigo {
  code?: string
  message?: string
}

interface Contexto {
  /** Mensaje cuando ya existe un registro igual (por ejemplo, un nombre repetido). */
  duplicado?: string
}

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
      return 'Algún dato no es válido. Revisa el formulario.'
    case '42501':
    case 'PGRST301':
    case 'PGRST303':
      return 'Tu sesión ya no es válida. Vuelve a iniciar sesión.'
    default:
      return 'No se pudo completar la acción. Inténtalo de nuevo.'
  }
}
