import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Point, Polygon } from 'geojson'
import { SIN_PERMISO } from '../../lib/errores'
import { supabase } from '../../lib/supabase'
import type { Enums } from '../../types/database'
import { CLAVE_CATEGORIAS } from '../categorias/api'

interface LugarBase {
  id: string
  nombre: string
  estado: Enums<'estado_ubicacion'>
  /** Solo los puntos y los elementos tienen categoría; NULL = sin categoría (marcador neutro). */
  categoriaId: string | null
}

export type Punto = LugarBase & { tipo: 'punto'; geometria: Point }
/** Una zona puede tener un tipo (comercial, residencial…) que le da su color en el mapa. */
export type Zona = LugarBase & { tipo: 'zona'; geometria: Polygon; tipoZonaId: string | null }
/** Algo del barrio que se ubica y se documenta pero no se estudia: una caneca, un poste… (decisión 0028). */
export type Elemento = LugarBase & { tipo: 'elemento'; geometria: Point }
export type Lugar = Punto | Zona | Elemento

export const CLAVE_LUGARES = ['lugares'] as const

/** Lugares visibles (no archivados) con su geometría, para el mapa. */
export function useLugares() {
  return useQuery({
    queryKey: CLAVE_LUGARES,
    queryFn: async (): Promise<Lugar[]> => {
      const { data, error } = await supabase.rpc('lugares_mapa')
      if (error) throw error
      // La función devuelve POINT para los puntos y los elementos, y POLYGON para las zonas (lo exige la base de datos).
      return data.map(
        ({ id, tipo, nombre, estado, categoria_id, tipo_zona_id, geojson }) =>
          ({
            id,
            tipo,
            nombre,
            estado,
            categoriaId: categoria_id ?? null,
            tipoZonaId: tipo_zona_id ?? null,
            geometria: geojson as unknown as Lugar['geometria'],
          }) as Lugar,
      )
    },
  })
}

/** Distancia (en metros) por debajo de la cual se pregunta si es el mismo lugar. */
export const METROS_POSIBLE_DUPLICADO = 15

export interface LugarCercano {
  id: string
  nombre: string
  estado: Enums<'estado_ubicacion'>
  distanciaM: number
}

/** Puntos a menos de 15 m de la coordenada, para avisar de un posible duplicado antes de crear uno. */
export async function buscarCercanos(lng: number, lat: number): Promise<LugarCercano[]> {
  const { data, error } = await supabase.rpc('ubicaciones_cercanas', { lng, lat, metros: METROS_POSIBLE_DUPLICADO })
  if (error) throw error
  return data.map(({ id, nombre, estado, distancia_m }) => ({ id, nombre, estado, distanciaM: distancia_m }))
}

/** Lo que se llena en el formulario de un punto. */
export interface CamposPunto {
  nombre: string
  categoriaId: string | null
  direccion: string
  complemento: string
  contactoNombre: string
  contactoTelefono: string
  descripcion: string
}

export const PUNTO_VACIO: CamposPunto = {
  nombre: '',
  categoriaId: null,
  direccion: '',
  complemento: '',
  contactoNombre: '',
  contactoTelefono: '',
  descripcion: '',
}

export type DatosPunto = CamposPunto & { lng: number; lat: number }

/** Texto limpio o NULL si quedó vacío. */
const opcional = (texto: string) => texto.trim().replace(/\s+/g, ' ') || null

/** Columnas de ubicaciones que se llenan con el formulario de un punto. */
function columnasDePunto(campos: CamposPunto) {
  return {
    nombre: campos.nombre.trim().replace(/\s+/g, ' '),
    categoria_id: campos.categoriaId,
    direccion: opcional(campos.direccion),
    complemento: opcional(campos.complemento),
    contacto_nombre: opcional(campos.contactoNombre),
    contacto_telefono: opcional(campos.contactoTelefono),
    // La descripción puede tener varias líneas: solo se quitan los espacios de los extremos.
    descripcion: campos.descripcion.trim() || null,
  }
}

export function useCrearPunto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: DatosPunto) => {
      const { data, error } = await supabase
        .from('ubicaciones')
        .insert({
          tipo: 'punto',
          // PostGIS acepta la geometría como texto (EWKT), con su sistema de coordenadas.
          geom: `SRID=4326;POINT(${datos.lng} ${datos.lat})`,
          ...columnasDePunto(datos),
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_LUGARES })
      // Las categorías muestran cuántas ubicaciones las usan.
      void queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS })
    },
  })
}

/** Todo lo de un lugar para su ficha, también si está archivado (lugares_mapa solo trae los visibles). */
export interface DetalleLugar {
  id: string
  tipo: Enums<'tipo_ubicacion'>
  /** El nombre para mostrar: el propio o, en un elemento sin nombre, el de su categoría. */
  nombre: string
  /** El nombre que se escribió; NULL en un elemento sin nombre. */
  nombrePropio: string | null
  descripcion: string | null
  direccion: string | null
  complemento: string | null
  contactoNombre: string | null
  contactoTelefono: string | null
  categoriaId: string | null
  /** Solo zonas: de qué es la zona. */
  tipoZonaId: string | null
  estado: Enums<'estado_ubicacion'>
  archivadaEn: string | null
  creadoPor: string | null
  /** Cuántos estudios tiene, contando los archivados: solo se borra de verdad un lugar sin estudios. */
  estudios: number
  /** Solo elementos: cuántas evidencias tiene. Un elemento con evidencias no se borra, se archiva. */
  evidencias: number
}

export const claveLugar = (id: string) => ['lugar', id] as const

export function useLugar(id: string | undefined) {
  return useQuery({
    queryKey: claveLugar(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<DetalleLugar | null> => {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select(
          'id, tipo, nombre, descripcion, direccion, complemento, contacto_nombre, contacto_telefono, categoria_id, tipo_zona_id, estado, archivada_en, creado_por, estudios(count), evidencias(count)',
        )
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      // Un elemento sin nombre se muestra con el de su categoría.
      let nombre = data.nombre
      if (nombre === null && data.categoria_id) {
        const { data: categoria } = await supabase.from('categorias').select('nombre').eq('id', data.categoria_id).maybeSingle()
        nombre = categoria?.nombre ?? null
      }
      return {
        id: data.id,
        tipo: data.tipo,
        nombre: nombre ?? 'Elemento',
        nombrePropio: data.nombre,
        descripcion: data.descripcion,
        direccion: data.direccion,
        complemento: data.complemento,
        contactoNombre: data.contacto_nombre,
        contactoTelefono: data.contacto_telefono,
        categoriaId: data.categoria_id,
        tipoZonaId: data.tipo_zona_id,
        estado: data.estado,
        archivadaEn: data.archivada_en,
        creadoPor: data.creado_por,
        estudios: data.estudios[0]?.count ?? 0,
        evidencias: data.evidencias[0]?.count ?? 0,
      }
    },
  })
}

export function camposDePunto(lugar: DetalleLugar): CamposPunto {
  return {
    nombre: lugar.nombre,
    categoriaId: lugar.categoriaId,
    direccion: lugar.direccion ?? '',
    complemento: lugar.complemento ?? '',
    contactoNombre: lugar.contactoNombre ?? '',
    contactoTelefono: lugar.contactoTelefono ?? '',
    descripcion: lugar.descripcion ?? '',
  }
}

/** Después de cambiar un lugar se actualizan el mapa, su ficha y los conteos de las categorías. */
export function useAlCambiarLugar() {
  const queryClient = useQueryClient()
  return (_resultado: unknown, { id }: { id: string }) => {
    void queryClient.invalidateQueries({ queryKey: CLAVE_LUGARES })
    void queryClient.invalidateQueries({ queryKey: claveLugar(id) })
    void queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS })
  }
}

export function useActualizarPunto() {
  const onSuccess = useAlCambiarLugar()
  return useMutation({
    mutationFn: async ({ id, campos }: { id: string; campos: CamposPunto }) => {
      const { error } = await supabase.from('ubicaciones').update(columnasDePunto(campos)).eq('id', id)
      if (error) throw error
    },
    onSuccess,
  })
}

export function useMoverPunto() {
  const onSuccess = useAlCambiarLugar()
  return useMutation({
    mutationFn: async ({ id, lng, lat }: { id: string; lng: number; lat: number }) => {
      const { error } = await supabase.from('ubicaciones').update({ geom: `SRID=4326;POINT(${lng} ${lat})` }).eq('id', id)
      if (error) throw error
    },
    onSuccess,
  })
}

/** Activo o cerrado (por ejemplo, un local que cerró). Conserva su histórico. */
export function useCambiarEstadoLugar() {
  const onSuccess = useAlCambiarLugar()
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: Enums<'estado_ubicacion'> }) => {
      const { error } = await supabase.from('ubicaciones').update({ estado }).eq('id', id)
      if (error) throw error
    },
    onSuccess,
  })
}

/** Archivar: desaparece del mapa pero conserva todo y se puede recuperar. */
export function useArchivarLugar() {
  const onSuccess = useAlCambiarLugar()
  return useMutation({
    mutationFn: async ({ id, archivar }: { id: string; archivar: boolean }) => {
      const { error } = await supabase
        .from('ubicaciones')
        .update({ archivada_en: archivar ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess,
  })
}

/**
 * Borra de verdad un lugar creado por error. RLS solo lo deja si no tiene estudios (ni evidencias, si es un
 * elemento) y es de quien lo creó (o un admin).
 */
export function useBorrarLugar() {
  const onSuccess = useAlCambiarLugar()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data: borrados, error } = await supabase.from('ubicaciones').delete().eq('id', id).select('id')
      if (error) throw error
      if (borrados.length === 0) throw SIN_PERMISO
    },
    onSuccess,
  })
}
