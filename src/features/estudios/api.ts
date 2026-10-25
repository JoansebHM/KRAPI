import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { CLAVE_RESPONSABLES, useResponsables } from '../responsables/api'
import { estudioNuevo, recordarResponsables } from './campos'

export interface Estudio {
  id: string
  ubicacionId: string
  /** 'AAAA-MM-DD' */
  fecha: string
  /** 'HH:MM' */
  horaInicio: string
  horaFin: string
  titulo: string
  descripcion: string | null
  entrevistado: string | null
  responsableIds: string[]
}

/** Lo que se llena en el formulario de un estudio. */
export interface CamposEstudio {
  titulo: string
  fecha: string
  horaInicio: string
  horaFin: string
  responsableIds: string[]
  entrevistado: string
  descripcion: string
}

export const MAX_ENTREVISTADO = 120

export const claveEstudios = (ubicacionId: string) => ['estudios', ubicacionId] as const

/** Postgres devuelve las horas como 'HH:MM:SS'; la app trabaja con 'HH:MM'. */
const hora = (valor: string) => valor.slice(0, 5)

/** Estudios visibles (no archivados) de un lugar, del más reciente al más antiguo. */
export function useEstudios(ubicacionId: string | undefined) {
  return useQuery({
    queryKey: claveEstudios(ubicacionId ?? ''),
    enabled: Boolean(ubicacionId),
    queryFn: async (): Promise<Estudio[]> => {
      const { data, error } = await supabase
        .from('estudios')
        .select('id, ubicacion_id, fecha, hora_inicio, hora_fin, titulo, descripcion, entrevistado, estudio_responsables(responsable_id)')
        .eq('ubicacion_id', ubicacionId!)
        .is('archivado_en', null)
      if (error) throw error
      return data
        .map((fila) => ({
          id: fila.id,
          ubicacionId: fila.ubicacion_id,
          fecha: fila.fecha,
          horaInicio: hora(fila.hora_inicio),
          horaFin: hora(fila.hora_fin),
          titulo: fila.titulo,
          descripcion: fila.descripcion,
          entrevistado: fila.entrevistado,
          responsableIds: fila.estudio_responsables.map((r) => r.responsable_id),
        }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio))
    },
  })
}

/** Prepara los campos de un estudio nuevo en el momento de abrir el formulario. */
export function useCamposEstudioNuevo() {
  const { data: responsables } = useResponsables()
  const { perfil } = useAuth()
  return () => estudioNuevo(responsables?.map((r) => r.id), perfil?.responsable_id)
}

/** Texto limpio o NULL si quedó vacío. */
const opcional = (texto: string) => texto.trim().replace(/\s+/g, ' ') || null

function filaEstudio(campos: CamposEstudio) {
  return {
    titulo: campos.titulo.trim().replace(/\s+/g, ' '),
    fecha: campos.fecha,
    hora_inicio: campos.horaInicio,
    hora_fin: campos.horaFin,
    entrevistado: opcional(campos.entrevistado),
    // Las notas conservan sus saltos de línea.
    descripcion: campos.descripcion.trim() || null,
  }
}

async function ponerResponsables(estudioId: string, responsableIds: string[]) {
  if (responsableIds.length === 0) return
  const { error } = await supabase
    .from('estudio_responsables')
    .insert(responsableIds.map((responsableId) => ({ estudio_id: estudioId, responsable_id: responsableId })))
  if (error) throw error
}

export type DatosEstudio = CamposEstudio & { ubicacionId: string; id?: string }

/** Crea o actualiza un estudio con sus responsables. */
export function useGuardarEstudio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ubicacionId, ...campos }: DatosEstudio): Promise<string> => {
      if (!id) {
        const { data, error } = await supabase
          .from('estudios')
          .insert({ ...filaEstudio(campos), ubicacion_id: ubicacionId })
          .select('id')
          .single()
        if (error) throw error
        try {
          await ponerResponsables(data.id, campos.responsableIds)
        } catch (errorResponsables) {
          // Recién creado y sin evidencias: se puede borrar para no dejar un estudio a medias.
          await supabase.from('estudios').delete().eq('id', data.id)
          throw errorResponsables
        }
        return data.id
      }

      const { data: anteriores, error: errorAnteriores } = await supabase
        .from('estudio_responsables')
        .select('responsable_id')
        .eq('estudio_id', id)
      if (errorAnteriores) throw errorAnteriores

      const { error } = await supabase.from('estudios').update(filaEstudio(campos)).eq('id', id)
      if (error) throw error

      const { error: errorBorrar } = await supabase.from('estudio_responsables').delete().eq('estudio_id', id)
      if (errorBorrar) throw errorBorrar
      try {
        await ponerResponsables(id, campos.responsableIds)
      } catch (errorResponsables) {
        // Deja los responsables como estaban.
        await ponerResponsables(id, anteriores.map((r) => r.responsable_id))
        throw errorResponsables
      }
      return id
    },
    onSuccess: (_id, { id, ubicacionId, responsableIds }) => {
      // El próximo estudio nuevo de este dispositivo vendrá con los mismos responsables.
      if (!id) recordarResponsables(responsableIds)
      void queryClient.invalidateQueries({ queryKey: claveEstudios(ubicacionId) })
      // La lista de responsables muestra en cuántos estudios aparece cada uno.
      void queryClient.invalidateQueries({ queryKey: CLAVE_RESPONSABLES })
    },
  })
}

/** Archiva (o, con `archivar: false`, recupera) un estudio. No se borran: se conserva el histórico. */
export function useArchivarEstudio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, archivar }: { id: string; ubicacionId: string; archivar: boolean }) => {
      const { error } = await supabase
        .from('estudios')
        .update({ archivado_en: archivar ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_resultado, { ubicacionId }) => queryClient.invalidateQueries({ queryKey: claveEstudios(ubicacionId) }),
  })
}
