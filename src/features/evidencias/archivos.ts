import type { Database } from '../../types/database'

export type TipoEvidencia = Database['public']['Enums']['tipo_evidencia']
export type TipoArchivo = Extract<TipoEvidencia, 'foto' | 'audio' | 'documento'>

/** Máximo por archivo: el límite del bucket en el plan gratuito de Supabase. */
export const MAX_BYTES = 50 * 1024 * 1024

/**
 * Tipos que acepta el bucket `evidencias` (ver la migración bucket_evidencias), con la extensión
 * que los identifica cuando el navegador no informa el tipo.
 */
const TIPOS: Record<string, { tipo: TipoArchivo; extensiones: string[] }> = {
  'image/jpeg': { tipo: 'foto', extensiones: ['jpg', 'jpeg'] },
  'image/png': { tipo: 'foto', extensiones: ['png'] },
  'image/webp': { tipo: 'foto', extensiones: ['webp'] },
  'image/heic': { tipo: 'foto', extensiones: ['heic'] },
  'image/heif': { tipo: 'foto', extensiones: ['heif'] },
  'audio/mpeg': { tipo: 'audio', extensiones: ['mp3'] },
  'audio/mp4': { tipo: 'audio', extensiones: ['m4a', 'mp4'] },
  'audio/x-m4a': { tipo: 'audio', extensiones: [] },
  'audio/aac': { tipo: 'audio', extensiones: ['aac'] },
  'audio/wav': { tipo: 'audio', extensiones: ['wav'] },
  'audio/x-wav': { tipo: 'audio', extensiones: [] },
  'audio/webm': { tipo: 'audio', extensiones: ['webm', 'weba'] },
  'audio/ogg': { tipo: 'audio', extensiones: ['ogg', 'oga', 'opus'] },
  'application/pdf': { tipo: 'documento', extensiones: ['pdf'] },
  'application/msword': { tipo: 'documento', extensiones: ['doc'] },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { tipo: 'documento', extensiones: ['docx'] },
  'application/vnd.ms-excel': { tipo: 'documento', extensiones: ['xls'] },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { tipo: 'documento', extensiones: ['xlsx'] },
}

/** Valor del atributo `accept` para elegir cualquier archivo que se puede subir. */
export const ACEPTA_ARCHIVOS = [
  'image/*',
  'audio/*',
  ...Object.keys(TIPOS).filter((mime) => mime.startsWith('application/')),
  ...Object.values(TIPOS).flatMap(({ extensiones }) => extensiones.map((e) => `.${e}`)),
].join(',')

export type Clasificacion = { tipo: TipoArchivo; mime: string } | { error: string }

const extensionDe = (nombre: string) => nombre.split('.').pop()?.toLowerCase() ?? ''

/** Decide qué tipo de evidencia es un archivo, o por qué no se puede subir. */
export function clasificar(archivo: File): Clasificacion {
  // 'audio/webm;codecs=opus' → 'audio/webm'
  const informado = archivo.type.split(';')[0].trim().toLowerCase()
  const extension = extensionDe(archivo.name)
  const mime = TIPOS[informado]
    ? informado
    : Object.keys(TIPOS).find((m) => TIPOS[m].extensiones.includes(extension))

  if (!mime) {
    if (informado.startsWith('video/')) return { error: 'Los videos se agregan por enlace, no como archivo.' }
    return { error: 'Solo se pueden subir fotos, audios, PDF, Word o Excel.' }
  }
  if (archivo.size === 0) return { error: 'El archivo está vacío.' }
  return { tipo: TIPOS[mime].tipo, mime }
}

export function excedeTamano(bytes: number) {
  return bytes > MAX_BYTES
}

export const MENSAJE_MUY_GRANDE = `Pesa más de ${MAX_BYTES / 1024 / 1024} MB, el máximo permitido.`

/** Nombre seguro para la ruta en el bucket: sin tildes, espacios ni símbolos. */
export function nombreSeguro(nombre: string) {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|-+$/g, '')
  return limpio.slice(-80) || 'archivo'
}

/** Ruta del archivo en el bucket: `<estudio_id>/<uuid>-<nombre>`. */
export function rutaArchivo(estudioId: string, nombre: string) {
  return `${estudioId}/${crypto.randomUUID()}-${nombreSeguro(nombre)}`
}

const formatoMB = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

/** 1536 → "2 KB", 2_400_000 → "2,3 MB". */
export function mostrarTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${formatoMB.format(bytes / 1024 / 1024)} MB`
}

export const NOMBRE_TIPO: Record<TipoEvidencia, string> = {
  foto: 'Foto',
  audio: 'Audio',
  documento: 'Documento',
  texto: 'Texto',
  video: 'Video',
}
