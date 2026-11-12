import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SIN_PERMISO } from '../../lib/errores'
import { supabase } from '../../lib/supabase'

/** Una tarea del checklist de un fragmento. */
export interface Tarea {
  id: string
  fragmentoId: string
  texto: string
  /** Cuentas encargadas (opcional: puede no haber ninguna). */
  responsableIds: string[]
  hecha: boolean
  /** Cuándo se marcó como hecha (momento ISO), o null si está pendiente. */
  hechaEn: string | null
  /** Quién la marcó como hecha. */
  hechaPor: string | null
}

/** Un fragmento del calendario (un rango de fechas libre) con su checklist. */
export interface Fragmento {
  id: string
  /** Opcional: sin título se muestra el rango de fechas. */
  titulo: string | null
  /** 'AAAA-MM-DD' */
  fechaInicio: string
  /** 'AAAA-MM-DD' */
  fechaFin: string
  tareas: Tarea[]
}

export const CLAVE_CRONOGRAMA = ['cronograma'] as const

/**
 * Todos los fragmentos con sus tareas. Son pocos datos, así que se traen juntos. Quedan por fecha de
 * inicio y las tareas en el orden en que se crearon.
 */
export function useCronograma() {
  return useQuery({
    queryKey: CLAVE_CRONOGRAMA,
    queryFn: async (): Promise<Fragmento[]> => {
      const [fragmentos, tareas, responsables] = await Promise.all([
        supabase.from('cronograma_fragmentos').select('id, titulo, fecha_inicio, fecha_fin').order('fecha_inicio', { ascending: true }),
        supabase.from('cronograma_tareas').select('id, fragmento_id, texto, hecha_en, hecha_por').order('created_at', { ascending: true }),
        supabase.from('cronograma_tarea_responsables').select('tarea_id, usuario_id'),
      ])
      if (fragmentos.error) throw fragmentos.error
      if (tareas.error) throw tareas.error
      if (responsables.error) throw responsables.error

      const responsablesDe = new Map<string, string[]>()
      for (const fila of responsables.data) responsablesDe.set(fila.tarea_id, [...(responsablesDe.get(fila.tarea_id) ?? []), fila.usuario_id])

      const porFragmento = new Map<string, Tarea[]>()
      for (const fila of tareas.data) {
        const lista = porFragmento.get(fila.fragmento_id) ?? []
        lista.push({
          id: fila.id,
          fragmentoId: fila.fragmento_id,
          texto: fila.texto,
          responsableIds: responsablesDe.get(fila.id) ?? [],
          hecha: fila.hecha_en !== null,
          hechaEn: fila.hecha_en,
          hechaPor: fila.hecha_por,
        })
        porFragmento.set(fila.fragmento_id, lista)
      }
      return fragmentos.data.map((fila) => ({
        id: fila.id,
        titulo: fila.titulo,
        fechaInicio: fila.fecha_inicio,
        fechaFin: fila.fecha_fin,
        tareas: porFragmento.get(fila.id) ?? [],
      }))
    },
  })
}

function useAlCambiar() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: CLAVE_CRONOGRAMA })
}

export interface DatosFragmento {
  titulo: string
  fechaInicio: string
  fechaFin: string
}

/** Crear o editar un fragmento. */
export function useGuardarFragmento() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async ({ id, titulo, fechaInicio, fechaFin }: DatosFragmento & { id?: string }) => {
      const fila = { titulo: titulo.trim().replace(/\s+/g, ' ') || null, fecha_inicio: fechaInicio, fecha_fin: fechaFin }
      if (id) {
        const { error } = await supabase.from('cronograma_fragmentos').update(fila).eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('cronograma_fragmentos').insert(fila)
      if (error) throw error
    },
    onSuccess,
  })
}

/** Borra un fragmento con todas sus tareas. Es planeación, no histórico de campo: se borra de verdad. */
export function useBorrarFragmento() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('cronograma_fragmentos').delete().eq('id', id).select('id')
      if (error) throw error
      if (data.length === 0) throw SIN_PERMISO
    },
    onSuccess,
  })
}

export interface DatosTarea {
  texto: string
  responsableIds: string[]
}

/**
 * Agregar una tarea a un fragmento, o editar su texto y sus responsables. Al editar solo se tocan los
 * responsables que cambiaron (como los participantes de un estudio).
 */
export function useGuardarTarea() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async ({
      id,
      fragmentoId,
      texto,
      responsableIds,
      anteriores = [],
    }: DatosTarea & { id?: string; fragmentoId: string; anteriores?: string[] }) => {
      const textoLimpio = texto.trim().replace(/\s+/g, ' ')
      let tareaId = id
      if (tareaId) {
        const { error } = await supabase.from('cronograma_tareas').update({ texto: textoLimpio }).eq('id', tareaId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('cronograma_tareas').insert({ texto: textoLimpio, fragmento_id: fragmentoId }).select('id').single()
        if (error) throw error
        tareaId = data.id
      }
      const quitar = anteriores.filter((usuarioId) => !responsableIds.includes(usuarioId))
      const agregar = responsableIds.filter((usuarioId) => !anteriores.includes(usuarioId))
      if (quitar.length > 0) {
        const { error } = await supabase.from('cronograma_tarea_responsables').delete().eq('tarea_id', tareaId).in('usuario_id', quitar)
        if (error) throw error
      }
      if (agregar.length > 0) {
        const { error } = await supabase.from('cronograma_tarea_responsables').insert(agregar.map((usuarioId) => ({ tarea_id: tareaId, usuario_id: usuarioId })))
        if (error) throw error
      }
    },
    onSuccess,
  })
}

/**
 * Marca o desmarca una tarea. Devuelve la función que lo hace: la casilla cambia al instante (antes de
 * hablar con el servidor) y, si falla, vuelve a como estaba. Se usa mucho en celular, donde esperar la
 * red entre toque y toque se siente lento. El cambio se aplica en el mismo momento del toque, porque
 * una casilla controlada que se actualiza un instante después parpadea.
 */
export function useMarcarTarea() {
  const queryClient = useQueryClient()
  const mutacion = useMutation({
    mutationFn: async ({ id, hecha }: { id: string; hecha: boolean }) => {
      const { data, error } = await supabase
        .from('cronograma_tareas')
        .update({ hecha_en: hecha ? new Date().toISOString() : null })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (data.length === 0) throw SIN_PERMISO
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CLAVE_CRONOGRAMA }),
  })

  return (id: string, hecha: boolean, alFallar: (error: unknown) => void) => {
    const anterior = queryClient.getQueryData<Fragmento[]>(CLAVE_CRONOGRAMA)
    queryClient.setQueryData<Fragmento[]>(CLAVE_CRONOGRAMA, (fragmentos) =>
      fragmentos?.map((fragmento) => ({
        ...fragmento,
        tareas: fragmento.tareas.map((tarea) => (tarea.id === id ? { ...tarea, hecha, hechaEn: hecha ? (tarea.hechaEn ?? new Date().toISOString()) : null } : tarea)),
      })),
    )
    mutacion.mutate(
      { id, hecha },
      {
        onError: (error) => {
          if (anterior) queryClient.setQueryData(CLAVE_CRONOGRAMA, anterior)
          alFallar(error)
        },
      },
    )
  }
}

export function useBorrarTarea() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('cronograma_tareas').delete().eq('id', id).select('id')
      if (error) throw error
      if (data.length === 0) throw SIN_PERMISO
    },
    onSuccess,
  })
}
