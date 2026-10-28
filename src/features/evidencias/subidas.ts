import { useSyncExternalStore } from 'react'
import { ErrorAlmacenamiento, subirArchivo, type MotivoError } from '../../lib/almacenamiento'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { queryClient } from '../../lib/queryClient'
import { alCambiarEvidencias, registrarArchivo, type DuenoEvidencia } from './api'
import { clasificar, excedeTamano, MENSAJE_MUY_GRANDE, rutaArchivo, type TipoArchivo } from './archivos'
import { comprimirFoto } from './comprimir'

/**
 * Cola de subidas de evidencias. Vive fuera de los componentes para que una subida siga
 * aunque se cierre la página del estudio, y se vea su avance al volver.
 * Los archivos se suben de a uno, en el orden en que se eligieron.
 */

export interface Subida {
  id: string
  dueno: DuenoEvidencia
  nombre: string
  tipo: TipoArchivo | null
  estado: 'en-cola' | 'preparando' | 'subiendo' | 'error'
  /** De 0 a 1. */
  avance: number
  error?: string
  /** Falso si reintentar no sirve (por ejemplo, un tipo de archivo no permitido). */
  reintentable: boolean
  archivo: File
}

let subidas: Subida[] = []
const oyentes = new Set<() => void>()
const cancelaciones = new Map<string, AbortController>()
let subiendo = false

function cambiar(nuevas: Subida[]) {
  subidas = nuevas
  oyentes.forEach((oyente) => oyente())
}

function actualizar(id: string, cambios: Partial<Subida>) {
  cambiar(subidas.map((s) => (s.id === id ? { ...s, ...cambios } : s)))
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

const SIN_SUBIDAS: Subida[] = []

/** Subidas de un estudio o de un elemento (en cola, en curso o con error). */
export function useSubidas(dueno: DuenoEvidencia): Subida[] {
  const todas = useSyncExternalStore(suscribir, () => subidas)
  const delDueno = todas.filter((s) => s.dueno.tipo === dueno.tipo && s.dueno.id === dueno.id)
  return delDueno.length > 0 ? delDueno : SIN_SUBIDAS
}

/** Agrega archivos a la cola. Los que no se pueden subir quedan con su error a la vista. */
export function agregarArchivos(dueno: DuenoEvidencia, archivos: File[]) {
  const nuevas = archivos.map((archivo): Subida => {
    const clasificacion = clasificar(archivo)
    const base = { id: crypto.randomUUID(), dueno, nombre: archivo.name, avance: 0, archivo }
    if ('error' in clasificacion) return { ...base, tipo: null, estado: 'error', error: clasificacion.error, reintentable: false }
    return { ...base, tipo: clasificacion.tipo, estado: 'en-cola', reintentable: true }
  })
  cambiar([...subidas, ...nuevas])
  void procesar()
}

export function reintentar(id: string) {
  actualizar(id, { estado: 'en-cola', avance: 0, error: undefined })
  void procesar()
}

/** Cancela una subida en curso o quita una de la lista. */
export function quitar(id: string) {
  cancelaciones.get(id)?.abort()
  cambiar(subidas.filter((s) => s.id !== id))
}

async function procesar() {
  if (subiendo) return
  subiendo = true
  try {
    let siguiente: Subida | undefined
    while ((siguiente = subidas.find((s) => s.estado === 'en-cola'))) {
      await subir(siguiente)
    }
  } finally {
    subiendo = false
  }
}

async function subir({ id, dueno, archivo: original }: Subida) {
  const clasificacion = clasificar(original)
  if ('error' in clasificacion) return
  const cancelacion = new AbortController()
  cancelaciones.set(id, cancelacion)
  try {
    actualizar(id, { estado: 'preparando' })
    const archivo = clasificacion.tipo === 'foto' ? await comprimirFoto(original) : original
    const mime = archivo === original ? clasificacion.mime : archivo.type
    if (excedeTamano(archivo.size)) {
      actualizar(id, { estado: 'error', error: MENSAJE_MUY_GRANDE, reintentable: false })
      return
    }

    const ruta = rutaArchivo(dueno, archivo.name)
    actualizar(id, { estado: 'subiendo' })
    let porcentaje = 0
    await subirArchivo(ruta, archivo, mime, {
      signal: cancelacion.signal,
      onProgreso: (avance) => {
        // Se actualiza la pantalla solo cuando cambia el porcentaje entero.
        if (Math.floor(avance * 100) === porcentaje) return
        porcentaje = Math.floor(avance * 100)
        actualizar(id, { avance })
      },
    })
    if (cancelacion.signal.aborted) return
    await registrarArchivo({ dueno, tipo: clasificacion.tipo, ruta, nombre: archivo.name, mime, bytes: archivo.size })

    // Primero se recarga la lista, para que la evidencia aparezca antes de quitar su subida.
    await alCambiarEvidencias(queryClient, dueno).catch(() => {})
    cambiar(subidas.filter((s) => s.id !== id))
  } catch (error) {
    if (error instanceof ErrorAlmacenamiento && error.motivo === 'cancelado') return
    if (!subidas.some((s) => s.id === id)) return
    const mensaje = mensajeDeError(error)
    const reintentable = !(error instanceof ErrorAlmacenamiento && (error.motivo === 'muy-grande' || error.motivo === 'tipo-no-permitido'))
    actualizar(id, { estado: 'error', error: mensaje, reintentable })
    notificar.error(`No se pudo subir «${original.name}»`, { descripcion: mensaje })
  } finally {
    cancelaciones.delete(id)
  }
}

const MENSAJES: Record<MotivoError, string> = {
  'muy-grande': MENSAJE_MUY_GRANDE,
  'tipo-no-permitido': 'Este tipo de archivo no se puede subir.',
  'sin-conexion': 'No hay conexión con el servidor. Revisa tu internet y reintenta.',
  'sin-sesion': 'Tu sesión ya no es válida. Vuelve a iniciar sesión.',
  cancelado: 'Se canceló la subida.',
  otro: 'No se pudo completar la subida. Reintenta.',
}

function mensajeDeError(error: unknown) {
  return error instanceof ErrorAlmacenamiento ? MENSAJES[error.motivo] : mensajeErrorDatos(error)
}

// Avisa antes de cerrar o recargar la pestaña si hay archivos subiendo.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (evento) => {
    if (subidas.some((s) => s.estado !== 'error')) evento.preventDefault()
  })
}
