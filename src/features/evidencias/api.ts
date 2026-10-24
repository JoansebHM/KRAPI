import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { borrarArchivos, enlacesTemporales, PROVEEDOR } from '../../lib/almacenamiento'
import { supabase } from '../../lib/supabase'
import type { TipoArchivo, TipoEvidencia } from './archivos'

export interface Evidencia {
  id: string
  estudioId: string
  tipo: TipoEvidencia
  titulo: string | null
  archivo: { ruta: string; nombre: string; mime: string; bytes: number } | null
  /** Enlace temporal para abrir el archivo (expira en una hora). */
  enlace: string | null
  creadaEn: string
}

export const claveEvidencias = (estudioId: string) => ['evidencias', estudioId] as const

/** Los enlaces temporales duran una hora: se renuevan antes de que expiren. */
const VIGENCIA_ENLACES_MS = 50 * 60 * 1000

/** Evidencias de un estudio, de la más reciente a la más antigua, con un enlace para abrir cada archivo. */
export function useEvidencias(estudioId: string | undefined) {
  return useQuery({
    queryKey: claveEvidencias(estudioId ?? ''),
    enabled: Boolean(estudioId),
    staleTime: VIGENCIA_ENLACES_MS,
    refetchInterval: VIGENCIA_ENLACES_MS,
    queryFn: async (): Promise<Evidencia[]> => {
      const { data, error } = await supabase
        .from('evidencias')
        .select('id, estudio_id, tipo, titulo, archivo_path, archivo_nombre, archivo_mime, archivo_bytes, created_at')
        .eq('estudio_id', estudioId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rutas = data.map((fila) => fila.archivo_path).filter((ruta) => ruta !== null)
      const enlaces = await enlacesTemporales(rutas)
      return data.map((fila) => ({
        id: fila.id,
        estudioId: fila.estudio_id,
        tipo: fila.tipo,
        titulo: fila.titulo,
        archivo: fila.archivo_path
          ? { ruta: fila.archivo_path, nombre: fila.archivo_nombre ?? '', mime: fila.archivo_mime ?? '', bytes: fila.archivo_bytes ?? 0 }
          : null,
        enlace: fila.archivo_path ? (enlaces.get(fila.archivo_path) ?? null) : null,
        creadaEn: fila.created_at,
      }))
    },
  })
}

export interface ArchivoSubido {
  estudioId: string
  tipo: TipoArchivo
  ruta: string
  nombre: string
  mime: string
  bytes: number
}

/**
 * Registra en la tabla un archivo ya subido. Si no se puede, borra el archivo
 * para no dejarlo huérfano en el bucket.
 */
export async function registrarArchivo({ estudioId, tipo, ruta, nombre, mime, bytes }: ArchivoSubido) {
  const { error } = await supabase.from('evidencias').insert({
    estudio_id: estudioId,
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
      const { error } = await supabase.from('evidencias').delete().eq('id', evidencia.id)
      if (error) throw error
      if (evidencia.archivo) await borrarArchivos([evidencia.archivo.ruta]).catch(() => {})
    },
    onSuccess: (_resultado, { estudioId }) => queryClient.invalidateQueries({ queryKey: claveEvidencias(estudioId) }),
  })
}
