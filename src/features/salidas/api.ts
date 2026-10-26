import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Polygon } from 'geojson'
import { SIN_PERMISO } from '../../lib/errores'
import { supabase } from '../../lib/supabase'
import { fechaLocal } from '../estudios/campos'
import { ewktPoligono, type Esquina } from '../zonas/geometria'

export interface Salida {
  id: string
  nombre: string
  /** 'AAAA-MM-DD' */
  fecha: string
  /** 'HH:MM' */
  horaInicio: string
  cancelada: boolean
  asignaciones: Asignacion[]
}

/** Una zona que se asigna en una salida, con quiénes la cubren. */
export interface Asignacion {
  id: string
  salidaId: string
  nombre: string
  forma: Polygon
  participantes: Participacion[]
}

/** Una persona asignada a una zona y su reporte (si ya lo hizo). */
export interface Participacion {
  asignacionId: string
  usuarioId: string
  /** 'HH:MM' o null si aún no reporta. */
  horaFin: string | null
  porcentaje: number | null
}

export const PORCENTAJES = [0, 25, 50, 75, 100] as const

export const CLAVE_SALIDAS = ['salidas'] as const

const hora = (valor: string) => valor.slice(0, 5)

/**
 * Todas las salidas con sus zonas y participantes. Son pocos datos, así que se traen juntos y de
 * aquí salen la lista, el detalle, "Mis asignaciones" y las zonas del mapa.
 */
export function useSalidas() {
  return useQuery({
    queryKey: CLAVE_SALIDAS,
    queryFn: async (): Promise<Salida[]> => {
      const [salidas, asignaciones, participantes] = await Promise.all([
        supabase.from('salidas').select('id, nombre, fecha, hora_inicio, cancelada_en'),
        supabase.from('asignaciones').select('id, salida_id, nombre, forma'),
        supabase.from('asignacion_participantes').select('asignacion_id, usuario_id, hora_fin, porcentaje'),
      ])
      if (salidas.error) throw salidas.error
      if (asignaciones.error) throw asignaciones.error
      if (participantes.error) throw participantes.error

      const porAsignacion = new Map<string, Participacion[]>()
      for (const fila of participantes.data) {
        const lista = porAsignacion.get(fila.asignacion_id) ?? []
        lista.push({ asignacionId: fila.asignacion_id, usuarioId: fila.usuario_id, horaFin: fila.hora_fin ? hora(fila.hora_fin) : null, porcentaje: fila.porcentaje })
        porAsignacion.set(fila.asignacion_id, lista)
      }
      const porSalida = new Map<string, Asignacion[]>()
      for (const fila of asignaciones.data) {
        const lista = porSalida.get(fila.salida_id) ?? []
        lista.push({ id: fila.id, salidaId: fila.salida_id, nombre: fila.nombre, forma: fila.forma as unknown as Polygon, participantes: porAsignacion.get(fila.id) ?? [] })
        porSalida.set(fila.salida_id, lista)
      }
      return salidas.data
        .map((fila) => ({
          id: fila.id,
          nombre: fila.nombre,
          fecha: fila.fecha,
          horaInicio: hora(fila.hora_inicio),
          cancelada: fila.cancelada_en !== null,
          asignaciones: (porSalida.get(fila.id) ?? []).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio))
    },
  })
}

/** Cómo va una persona en una zona. */
export type EstadoParticipacion = 'cancelada' | 'sin-reportar' | 'completa' | 'incompleta'

export function estadoDe(salida: Salida, participacion: Participacion): EstadoParticipacion {
  if (salida.cancelada) return 'cancelada'
  if (participacion.porcentaje === null) return 'sin-reportar'
  return participacion.porcentaje === 100 ? 'completa' : 'incompleta'
}

/** Si la salida es hoy o ya pasó (desde ese momento se puede reportar). */
export const yaEmpezo = (salida: Salida) => salida.fecha <= fechaLocal()

function useAlCambiar() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: CLAVE_SALIDAS })
}

export interface DatosSalida {
  nombre: string
  fecha: string
  horaInicio: string
}

/** Crear o editar una salida (solo admins). Devuelve su id. */
export function useGuardarSalida() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async ({ id, nombre, fecha, horaInicio }: DatosSalida & { id?: string }) => {
      const fila = { nombre: nombre.trim().replace(/\s+/g, ' '), fecha, hora_inicio: horaInicio }
      if (id) {
        const { error } = await supabase.from('salidas').update(fila).eq('id', id)
        if (error) throw error
        return id
      }
      const { data, error } = await supabase.from('salidas').insert(fila).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess,
  })
}

/** Cancela (o reactiva) una salida. No se borra: queda en el histórico. */
export function useCancelarSalida() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async ({ id, cancelar }: { id: string; cancelar: boolean }) => {
      const { error } = await supabase
        .from('salidas')
        .update({ cancelada_en: cancelar ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess,
  })
}

export interface DatosAsignacion {
  salidaId: string
  nombre: string
  participanteIds: string[]
}

/**
 * Crear una zona de asignación (con su forma) o editar su nombre y sus participantes. Al editar,
 * quienes siguen asignados conservan su reporte.
 */
export function useGuardarAsignacion() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async ({ id, salidaId, nombre, participanteIds, esquinas, anteriores = [] }: DatosAsignacion & { id?: string; esquinas?: Esquina[]; anteriores?: string[] }) => {
      const nombreLimpio = nombre.trim().replace(/\s+/g, ' ')
      let asignacionId = id
      if (asignacionId) {
        const { error } = await supabase.from('asignaciones').update({ nombre: nombreLimpio }).eq('id', asignacionId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('asignaciones')
          .insert({ salida_id: salidaId, nombre: nombreLimpio, geom: ewktPoligono(esquinas!) })
          .select('id')
          .single()
        if (error) throw error
        asignacionId = data.id
      }
      const quitar = anteriores.filter((usuarioId) => !participanteIds.includes(usuarioId))
      const agregar = participanteIds.filter((usuarioId) => !anteriores.includes(usuarioId))
      if (quitar.length > 0) {
        const { error } = await supabase.from('asignacion_participantes').delete().eq('asignacion_id', asignacionId).in('usuario_id', quitar)
        if (error) throw error
      }
      if (agregar.length > 0) {
        const { error } = await supabase
          .from('asignacion_participantes')
          .insert(agregar.map((usuarioId) => ({ asignacion_id: asignacionId!, usuario_id: usuarioId })))
        if (error) throw error
      }
      return asignacionId
    },
    onSuccess,
  })
}

export function useQuitarAsignacion() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('asignaciones').delete().eq('id', id).select('id')
      if (error) throw error
      if (data.length === 0) throw SIN_PERMISO
    },
    onSuccess,
  })
}

/** Cada persona reporta a qué hora terminó y qué porcentaje cubrió (un admin puede corregirlo). */
export function useReportar() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async ({ asignacionId, usuarioId, horaFin, porcentaje }: { asignacionId: string; usuarioId: string; horaFin: string; porcentaje: number }) => {
      const { data, error } = await supabase
        .from('asignacion_participantes')
        .update({ hora_fin: horaFin, porcentaje, reportado_en: new Date().toISOString() })
        .eq('asignacion_id', asignacionId)
        .eq('usuario_id', usuarioId)
        .select('asignacion_id')
      if (error) throw error
      if (data.length === 0) throw SIN_PERMISO
    },
    onSuccess,
  })
}
