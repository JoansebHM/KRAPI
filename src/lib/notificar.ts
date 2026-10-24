import { toast } from 'sonner'

/**
 * Única forma de mostrar notificaciones en KIRA. Así todas se ven y se comportan igual.
 *
 *   notificar.exito('Categoría creada')
 *   notificar.error('No se pudo guardar', { descripcion: 'Revisa tu conexión.' })
 *   notificar.exito('Categoría eliminada', { accion: { texto: 'Deshacer', alHacer: restaurar } })
 */

interface Opciones {
  descripcion?: string
  accion?: { texto: string; alHacer: () => void }
  /** Para reemplazar una notificación existente, por ejemplo una de "cargando". */
  id?: string | number
}

const DURACION_MS = 4000
const DURACION_ERROR_MS = 6000
/** Con acción se deja más tiempo, para alcanzar a tocar "Deshacer". */
const DURACION_CON_ACCION_MS = 7000

function opcionesSonner({ descripcion, accion, id }: Opciones = {}, duracion = DURACION_MS) {
  return {
    id,
    description: descripcion,
    duration: accion ? DURACION_CON_ACCION_MS : duracion,
    action: accion ? { label: accion.texto, onClick: accion.alHacer } : undefined,
  }
}

export const notificar = {
  exito: (titulo: string, opciones?: Opciones) => toast.success(titulo, opcionesSonner(opciones)),
  error: (titulo: string, opciones?: Opciones) => toast.error(titulo, opcionesSonner(opciones, DURACION_ERROR_MS)),
  info: (titulo: string, opciones?: Opciones) => toast.info(titulo, opcionesSonner(opciones)),
  aviso: (titulo: string, opciones?: Opciones) => toast.warning(titulo, opcionesSonner(opciones, DURACION_ERROR_MS)),
  /** Muestra una notificación de carga y devuelve su id para reemplazarla con exito() o error(). */
  cargando: (titulo: string) => toast.loading(titulo),
  cerrar: (id?: string | number) => toast.dismiss(id),
}
