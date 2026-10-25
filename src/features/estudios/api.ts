import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { CLAVE_USUARIOS, useUsuarios } from '../usuarios/api'
import { estudioNuevo, recordarParticipantes } from './campos'

export interface Estudio {
  id: string
  ubicacionId: string
  /** 'AAAA-MM-DD' */
  fecha: string
  /** 'HH:MM' */
  horaInicio: string
  horaFin: string
  titulo: string
  /** Apuntes de la visita, en el orden en que se escribieron. */
  notas: string[]
  entrevistado: string | null
  /** Cuentas que participaron. */
  participanteIds: string[]
  /** Nombres de quienes participaron antes de las cuentas individuales y no tenían cuenta. */
  participantesAnteriores: string[]
  /** Cuántas evidencias tiene. */
  evidencias: number
  /** Quién lo registró y quién lo editó por última vez (NULL = antes de las cuentas individuales). */
  creadoPor: string | null
  actualizadoPor: string | null
  creadoEn: string
  actualizadoEn: string
}

/** Lo que se llena en el formulario de un estudio. */
export interface CamposEstudio {
  titulo: string
  fecha: string
  horaInicio: string
  horaFin: string
  participanteIds: string[]
  entrevistado: string
  /** Una entrada por nota. Las vacías no se guardan. */
  notas: string[]
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
        .select(
          'id, ubicacion_id, fecha, hora_inicio, hora_fin, titulo, notas, entrevistado, created_at, updated_at, creado_por, actualizado_por, participantes_anteriores, estudio_participantes(usuario_id), evidencias(count)',
        )
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
          notas: fila.notas,
          entrevistado: fila.entrevistado,
          participanteIds: fila.estudio_participantes.map((p) => p.usuario_id),
          participantesAnteriores: fila.participantes_anteriores,
          evidencias: fila.evidencias[0]?.count ?? 0,
          creadoPor: fila.creado_por,
          actualizadoPor: fila.actualizado_por,
          creadoEn: fila.created_at,
          actualizadoEn: fila.updated_at,
        }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio))
    },
  })
}

/** Prepara los campos de un estudio nuevo en el momento de abrir el formulario. */
export function useCamposEstudioNuevo() {
  const { data: cuentas } = useUsuarios()
  const { perfil } = useAuth()
  const activas = cuentas?.filter((cuenta) => cuenta.estado === 'activo').map((cuenta) => cuenta.id)
  return () => estudioNuevo(activas, perfil?.id ?? null)
}

/** Las notas sin espacios en los extremos y sin las vacías. */
export const limpiarNotas = (notas: string[]) => notas.map((nota) => nota.trim()).filter(Boolean)

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
    notas: limpiarNotas(campos.notas),
  }
}

async function ponerParticipantes(estudioId: string, participanteIds: string[]) {
  if (participanteIds.length === 0) return
  const { error } = await supabase
    .from('estudio_participantes')
    .insert(participanteIds.map((usuarioId) => ({ estudio_id: estudioId, usuario_id: usuarioId })))
  if (error) throw error
}

export type DatosEstudio = CamposEstudio & { ubicacionId: string; id?: string }

/** Crea o actualiza un estudio con sus participantes. */
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
          await ponerParticipantes(data.id, campos.participanteIds)
        } catch (errorParticipantes) {
          // Recién creado y sin evidencias: se puede borrar para no dejar un estudio a medias.
          await supabase.from('estudios').delete().eq('id', data.id)
          throw errorParticipantes
        }
        return data.id
      }

      const { data: anteriores, error: errorAnteriores } = await supabase
        .from('estudio_participantes')
        .select('usuario_id')
        .eq('estudio_id', id)
      if (errorAnteriores) throw errorAnteriores

      const { error } = await supabase.from('estudios').update(filaEstudio(campos)).eq('id', id)
      if (error) throw error

      const { error: errorBorrar } = await supabase.from('estudio_participantes').delete().eq('estudio_id', id)
      if (errorBorrar) throw errorBorrar
      try {
        await ponerParticipantes(id, campos.participanteIds)
      } catch (errorParticipantes) {
        // Deja los participantes como estaban.
        await ponerParticipantes(id, anteriores.map((p) => p.usuario_id))
        throw errorParticipantes
      }
      return id
    },
    onSuccess: (_id, { id, ubicacionId, participanteIds }) => {
      // El próximo estudio nuevo de este dispositivo vendrá con los mismos participantes.
      if (!id) recordarParticipantes(participanteIds)
      void queryClient.invalidateQueries({ queryKey: claveEstudios(ubicacionId) })
      void queryClient.invalidateQueries({ queryKey: CLAVE_USUARIOS })
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
