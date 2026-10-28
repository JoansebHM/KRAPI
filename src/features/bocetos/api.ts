import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { borrarArchivos, enlacesTemporales, ErrorAlmacenamiento, subirArchivo } from '../../lib/almacenamiento'
import { mensajeErrorDatos, SIN_PERMISO } from '../../lib/errores'
import { supabase } from '../../lib/supabase'
import type { Json } from '../../types/database'
import type { Captura } from './capturar'
import { trazosAGeoJSON, type Trazo } from './trazos'

export interface Boceto {
  id: string
  titulo: string
  descripcion: string | null
  imagenPath: string
  miniaturaPath: string
  ancho: number
  alto: number
  creadoEn: string
  /** Quién lo hizo (NULL = antes de las cuentas individuales). */
  creadoPor: string | null
  /** Enlace temporal de la miniatura (expira en una hora). */
  miniatura: string | null
}

export const CLAVE_BOCETOS = ['bocetos'] as const

/** Los enlaces temporales duran una hora: se renuevan antes de que expiren. */
const VIGENCIA_ENLACES_MS = 50 * 60 * 1000

/** Los bocetos, del más reciente al más antiguo, sin sus trazos (que pesan) y con el enlace de su miniatura. */
export function useBocetos() {
  return useQuery({
    queryKey: CLAVE_BOCETOS,
    staleTime: VIGENCIA_ENLACES_MS,
    refetchInterval: VIGENCIA_ENLACES_MS,
    queryFn: async (): Promise<Boceto[]> => {
      const { data, error } = await supabase
        .from('bocetos')
        .select('id, titulo, descripcion, imagen_path, miniatura_path, ancho, alto, created_at, creado_por')
        .order('created_at', { ascending: false })
      if (error) throw error
      const enlaces = await enlacesTemporales(data.map((fila) => fila.miniatura_path))
      return data.map((fila) => ({
        id: fila.id,
        titulo: fila.titulo,
        descripcion: fila.descripcion,
        imagenPath: fila.imagen_path,
        miniaturaPath: fila.miniatura_path,
        ancho: fila.ancho,
        alto: fila.alto,
        creadoEn: fila.created_at,
        creadoPor: fila.creado_por,
        miniatura: enlaces.get(fila.miniatura_path) ?? null,
      }))
    },
  })
}

/** Enlace temporal de la imagen completa de un boceto, para verla o descargarla. */
export function useEnlaceDeImagen(ruta: string) {
  return useQuery({
    queryKey: ['boceto-imagen', ruta],
    staleTime: VIGENCIA_ENLACES_MS,
    queryFn: async () => (await enlacesTemporales([ruta])).get(ruta) ?? null,
  })
}

export interface DatosBoceto {
  titulo: string
  descripcion: string
  trazos: Trazo[]
  captura: Captura
}

/**
 * Guarda un boceto: sube la imagen y la miniatura y después crea su fila (como las evidencias: si la
 * fila falla, borra los archivos para no dejarlos sin uso). Devuelve su id.
 */
export function useGuardarBoceto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ titulo, descripcion, trazos, captura }: DatosBoceto) => {
      const id = crypto.randomUUID()
      const imagenPath = `bocetos/${id}/imagen.png`
      const miniaturaPath = `bocetos/${id}/miniatura.jpg`
      await subirArchivo(imagenPath, captura.imagen, 'image/png')
      try {
        await subirArchivo(miniaturaPath, captura.miniatura, 'image/jpeg')
      } catch (error) {
        await borrarArchivos([imagenPath]).catch(() => {})
        throw error
      }
      const { error } = await supabase.from('bocetos').insert({
        id,
        titulo: titulo.trim().replace(/\s+/g, ' '),
        descripcion: descripcion.trim() || null,
        // Es un FeatureCollection de GeoJSON: la columna es jsonb.
        trazos: trazosAGeoJSON(trazos) as unknown as Json,
        imagen_path: imagenPath,
        miniatura_path: miniaturaPath,
        ancho: captura.ancho,
        alto: captura.alto,
      })
      if (error) {
        await borrarArchivos([imagenPath, miniaturaPath]).catch(() => {})
        throw error
      }
      return id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_BOCETOS }),
  })
}

/**
 * Borra de verdad un boceto: primero la fila y después sus archivos. En ese orden, si falla un archivo
 * queda uno sin uso, pero nunca un boceto sin su imagen.
 */
export function useBorrarBoceto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (boceto: Boceto) => {
      const { data: borrados, error } = await supabase.from('bocetos').delete().eq('id', boceto.id).select('id')
      if (error) throw error
      if (borrados.length === 0) throw SIN_PERMISO
      await borrarArchivos([boceto.imagenPath, boceto.miniaturaPath]).catch(() => {})
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_BOCETOS }),
  })
}

/** Mensaje para el equipo cuando falla guardar o borrar: la imagen (Storage) o los datos. */
export function mensajeDeError(error: unknown, sinPermiso?: string) {
  if (error instanceof ErrorAlmacenamiento) {
    switch (error.motivo) {
      case 'sin-conexion':
        return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
      case 'sin-sesion':
        return 'Tu sesión ya no es válida. Vuelve a iniciar sesión.'
      case 'muy-grande':
        return 'La imagen es demasiado grande.'
      default:
        return 'No se pudo subir la imagen. Inténtalo de nuevo.'
    }
  }
  return mensajeErrorDatos(error, { sinPermiso })
}
