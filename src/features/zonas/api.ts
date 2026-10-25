import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SIN_PERMISO } from '../../lib/errores'
import { supabase } from '../../lib/supabase'
import { useAlCambiarLugar } from '../lugares/api'
import { CLAVE_TIPOS_ZONA } from '../tiposZona/api'
import { ewktPoligono, type Esquina } from './geometria'

/** Lo que se llena en el formulario de una zona. */
export interface CamposZona {
  nombre: string
  tipoZonaId: string | null
  descripcion: string
}

export const ZONA_VACIA: CamposZona = { nombre: '', tipoZonaId: null, descripcion: '' }

/** Si la base de datos rechaza la forma (fuera de Manila, lados cruzados o muy pequeña). */
export const ZONA_INVALIDA = 'La zona no es válida: debe quedar dentro de Manila, sin lados que se crucen y con al menos 20 m².'

const columnasDeZona = (campos: CamposZona) => ({
  nombre: campos.nombre.trim().replace(/\s+/g, ' '),
  tipo_zona_id: campos.tipoZonaId,
  descripcion: campos.descripcion.trim() || null,
})

export function useCrearZona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ campos, esquinas }: { campos: CamposZona; esquinas: Esquina[] }) => {
      const { data, error } = await supabase
        .from('ubicaciones')
        .insert({ tipo: 'zona', geom: ewktPoligono(esquinas), ...columnasDeZona(campos) })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lugares'] })
      void queryClient.invalidateQueries({ queryKey: CLAVE_TIPOS_ZONA })
    },
  })
}

export function useActualizarZona() {
  const alCambiar = useAlCambiarLugar()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, campos }: { id: string; campos: CamposZona }) => {
      const { error } = await supabase.from('ubicaciones').update(columnasDeZona(campos)).eq('id', id)
      if (error) throw error
    },
    onSuccess: (resultado, variables) => {
      alCambiar(resultado, variables)
      void queryClient.invalidateQueries({ queryKey: CLAVE_TIPOS_ZONA })
    },
  })
}

/** Cambia la forma de una zona: se redibuja completa con la mira. */
export function useRedibujarZona() {
  const alCambiar = useAlCambiarLugar()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, esquinas }: { id: string; esquinas: Esquina[] }) => {
      const { error } = await supabase.from('ubicaciones').update({ geom: ewktPoligono(esquinas) }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (resultado, variables) => {
      alCambiar(resultado, variables)
      void queryClient.invalidateQueries({ queryKey: claveLocales(variables.id) })
    },
  })
}

export interface LocalEnZona {
  id: string
  nombre: string
  categoriaId: string | null
  cerrado: boolean
  /** 'AAAA-MM-DD' del último estudio visible, o null si no tiene. */
  ultimoEstudio: string | null
}

const claveLocales = (zonaId: string) => ['locales-en-zona', zonaId] as const

/** Puntos que caen dentro de la zona (o sobre su borde), calculado por la geometría. */
export function useLocalesEnZona(zonaId: string) {
  return useQuery({
    queryKey: claveLocales(zonaId),
    queryFn: async (): Promise<LocalEnZona[]> => {
      const { data, error } = await supabase.rpc('locales_en_zona', { zona_id: zonaId })
      if (error) throw error
      return data.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        categoriaId: fila.categoria_id ?? null,
        cerrado: fila.estado === 'cerrada',
        ultimoEstudio: fila.ultimo_estudio ?? null,
      }))
    },
  })
}

export interface Comentario {
  id: string
  texto: string
  creadoPor: string | null
  creadoEn: string
}

const claveComentarios = (zonaId: string) => ['comentarios-zona', zonaId] as const

/** Comentarios de una zona, del más reciente al más antiguo. */
export function useComentariosZona(zonaId: string) {
  return useQuery({
    queryKey: claveComentarios(zonaId),
    queryFn: async (): Promise<Comentario[]> => {
      const { data, error } = await supabase
        .from('comentarios_zona')
        .select('id, texto, creado_por, created_at')
        .eq('ubicacion_id', zonaId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map((fila) => ({ id: fila.id, texto: fila.texto, creadoPor: fila.creado_por, creadoEn: fila.created_at }))
    },
  })
}

export function useComentar(zonaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (texto: string) => {
      const { error } = await supabase.from('comentarios_zona').insert({ ubicacion_id: zonaId, texto: texto.trim() })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveComentarios(zonaId) }),
  })
}

/** Lo borra quien lo escribió o un admin (lo asegura RLS). */
export function useBorrarComentario(zonaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (comentario: Comentario) => {
      const { data: borrados, error } = await supabase.from('comentarios_zona').delete().eq('id', comentario.id).select('id')
      if (error) throw error
      if (borrados.length === 0) throw SIN_PERMISO
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveComentarios(zonaId) }),
  })
}
