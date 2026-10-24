import { env } from '../config/env'
import { supabase } from './supabase'

/**
 * Único punto de acceso a los archivos de las evidencias. El resto de la app solo usa
 * estas funciones, así que cambiar de proveedor (por ejemplo, a SharePoint) solo toca este archivo.
 *
 * Hoy los archivos viven en el bucket privado `evidencias` de Supabase.
 */

const BUCKET = 'evidencias'

/** Proveedor que se guarda en `evidencias.proveedor` junto a cada archivo. */
export const PROVEEDOR = 'supabase' as const

export type MotivoError = 'muy-grande' | 'tipo-no-permitido' | 'sin-conexion' | 'sin-sesion' | 'cancelado' | 'otro'

export class ErrorAlmacenamiento extends Error {
  motivo: MotivoError

  constructor(motivo: MotivoError) {
    super(motivo)
    this.name = 'ErrorAlmacenamiento'
    this.motivo = motivo
  }
}

interface OpcionesSubida {
  /** Avance de 0 a 1. */
  onProgreso?: (avance: number) => void
  signal?: AbortSignal
}

/**
 * Sube un archivo. Usa XMLHttpRequest y no el cliente de Supabase porque es la única forma
 * de conocer el avance de la subida en el navegador.
 */
export async function subirArchivo(ruta: string, archivo: Blob, tipo: string, { onProgreso, signal }: OpcionesSubida = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ErrorAlmacenamiento('sin-sesion')
  if (signal?.aborted) throw new ErrorAlmacenamiento('cancelado')

  const url = `${env.supabase.url}/storage/v1/object/${BUCKET}/${ruta.split('/').map(encodeURIComponent).join('/')}`

  await new Promise<void>((resolver, rechazar) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', env.supabase.publishableKey)
    xhr.setRequestHeader('Content-Type', tipo)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('cache-control', 'max-age=3600')
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) onProgreso?.(evento.loaded / evento.total)
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolver() : rechazar(new ErrorAlmacenamiento(motivoDeRespuesta(xhr))))
    xhr.onerror = () => rechazar(new ErrorAlmacenamiento('sin-conexion'))
    xhr.onabort = () => rechazar(new ErrorAlmacenamiento('cancelado'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(archivo)
  })
}

function motivoDeRespuesta(xhr: XMLHttpRequest): MotivoError {
  if (xhr.status === 413) return 'muy-grande'
  if (xhr.status === 401 || xhr.status === 403) return 'sin-sesion'
  // Storage responde 400 con un mensaje para el tipo no permitido y el tamaño excedido.
  const texto = xhr.responseText.toLowerCase()
  if (texto.includes('mime type')) return 'tipo-no-permitido'
  if (texto.includes('exceeded the maximum allowed size')) return 'muy-grande'
  return 'otro'
}

/** Borra archivos. No falla si alguno ya no existe. */
export async function borrarArchivos(rutas: string[]) {
  if (rutas.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(rutas)
  if (error) throw error
}

/** Enlaces temporales para ver o descargar archivos privados (por defecto, una hora). */
export async function enlacesTemporales(rutas: string[], segundos = 3600): Promise<Map<string, string>> {
  if (rutas.length === 0) return new Map()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(rutas, segundos)
  if (error) throw error
  const enlaces = new Map<string, string>()
  for (const { path, signedUrl } of data) if (path && signedUrl) enlaces.set(path, signedUrl)
  return enlaces
}
