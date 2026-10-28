import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { borrarArchivos, enlacesTemporales, PROVEEDOR } from '../../lib/almacenamiento'
import { SIN_PERMISO } from '../../lib/errores'
import { supabase } from '../../lib/supabase'
import { claveLugar } from '../lugares/api'
import type { TipoArchivo, TipoEvidencia } from './archivos'

/** De quién es una evidencia: de un estudio o de un elemento del mapa, que no tiene estudios (decisión 0028). */
export interface DuenoEvidencia {
  tipo: 'estudio' | 'elemento'
  id: string
}

/** La columna de evidencias que apunta al dueño. */
const columnaDe = ({ tipo, id }: DuenoEvidencia) => (tipo === 'estudio' ? { estudio_id: id } : { ubicacion_id: id })

export interface Evidencia {
  id: string
  dueno: DuenoEvidencia
  tipo: TipoEvidencia
  titulo: string | null
  texto: string | null
  urlExterna: string | null
  archivo: { ruta: string; nombre: string; mime: string; bytes: number } | null
  /** Enlace temporal para abrir el archivo (expira en una hora). */
  enlace: string | null
  creadaEn: string
  /** Quién la subió (NULL = antes de las cuentas individuales). */
  creadaPor: string | null
}

export const claveEvidencias = ({ tipo, id }: DuenoEvidencia) => ['evidencias', tipo, id] as const

/**
 * Recarga las evidencias de su dueño. Si es un elemento, también su ficha: cuántas evidencias tiene
 * decide si se puede borrar.
 */
export async function alCambiarEvidencias(queryClient: QueryClient, dueno: DuenoEvidencia) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: claveEvidencias(dueno) }),
    dueno.tipo === 'elemento' && queryClient.invalidateQueries({ queryKey: claveLugar(dueno.id) }),
  ])
}

/** Los enlaces temporales duran una hora: se renuevan antes de que expiren. */
const VIGENCIA_ENLACES_MS = 50 * 60 * 1000

/** Evidencias de un estudio o de un elemento, de la más reciente a la más antigua, con un enlace para abrir cada archivo. */
export function useEvidencias(dueno: DuenoEvidencia) {
  return useQuery({
    queryKey: claveEvidencias(dueno),
    staleTime: VIGENCIA_ENLACES_MS,
    refetchInterval: VIGENCIA_ENLACES_MS,
    queryFn: async (): Promise<Evidencia[]> => {
      const { data, error } = await supabase
        .from('evidencias')
        .select('id, tipo, titulo, texto, url_externa, archivo_path, archivo_nombre, archivo_mime, archivo_bytes, created_at, creado_por')
        .match(columnaDe(dueno))
        .order('created_at', { ascending: false })
      if (error) throw error
      const rutas = data.map((fila) => fila.archivo_path).filter((ruta) => ruta !== null)
      const enlaces = await enlacesTemporales(rutas)
      return data.map((fila) => ({
        id: fila.id,
        dueno,
        tipo: fila.tipo,
        titulo: fila.titulo,
        texto: fila.texto,
        urlExterna: fila.url_externa,
        archivo: fila.archivo_path
          ? { ruta: fila.archivo_path, nombre: fila.archivo_nombre ?? '', mime: fila.archivo_mime ?? '', bytes: fila.archivo_bytes ?? 0 }
          : null,
        enlace: fila.archivo_path ? (enlaces.get(fila.archivo_path) ?? null) : null,
        creadaEn: fila.created_at,
        creadaPor: fila.creado_por,
      }))
    },
  })
}

export interface ArchivoSubido {
  dueno: DuenoEvidencia
  tipo: TipoArchivo
  ruta: string
  nombre: string
  mime: string
  bytes: number
}

/** Agrega un video de SharePoint como evidencia: se guarda el enlace, no el archivo (decisión 0010). */
export function useAgregarVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ dueno, enlace, titulo }: { dueno: DuenoEvidencia; enlace: string; titulo: string }) => {
      const { error } = await supabase.from('evidencias').insert({
        ...columnaDe(dueno),
        tipo: 'video',
        titulo: titulo.trim().replace(/\s+/g, ' ') || null,
        url_externa: enlace,
        proveedor: 'sharepoint',
      })
      if (error) throw error
    },
    onSuccess: (_resultado, { dueno }) => alCambiarEvidencias(queryClient, dueno),
  })
}

/**
 * Registra en la tabla un archivo ya subido. Si no se puede, borra el archivo
 * para no dejarlo huérfano en el bucket.
 */
export async function registrarArchivo({ dueno, tipo, ruta, nombre, mime, bytes }: ArchivoSubido) {
  const { error } = await supabase.from('evidencias').insert({
    ...columnaDe(dueno),
    tipo,
    archivo_path: ruta,
    archivo_nombre: nombre,
    archivo_mime: mime,
    archivo_bytes: bytes,
    proveedor: PROVEEDOR,
  })
  if (error) {
    await borrarArchivos([ruta]).catch(() => {})
    throw error
  }
}

/**
 * Borra de verdad una evidencia equivocada: primero la fila y después su archivo.
 * En ese orden, si falla el archivo queda un archivo sin uso, pero nunca una evidencia sin archivo.
 */
export function useBorrarEvidencia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (evidencia: Evidencia) => {
      const { data: borradas, error } = await supabase.from('evidencias').delete().eq('id', evidencia.id).select('id')
      if (error) throw error
      if (borradas.length === 0) throw SIN_PERMISO
      if (evidencia.archivo) await borrarArchivos([evidencia.archivo.ruta]).catch(() => {})
    },
    onSuccess: (_resultado, { dueno }) => alCambiarEvidencias(queryClient, dueno),
  })
}
