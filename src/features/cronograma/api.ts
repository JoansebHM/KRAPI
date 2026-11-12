import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SIN_PERMISO } from '../../lib/errores'
import { supabase } from '../../lib/supabase'

/** Una tarea del checklist de un fragmento. */
export interface Tarea {
  id: string
  fragmentoId: string
  texto: string
  /** Cuenta encargada (opcional). */
  responsableId: string | null
  hecha: boolean
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
      const [fragmentos, tareas] = await Promise.all([
        supabase.from('cronograma_fragmentos').select('id, titulo, fecha_inicio, fecha_fin').order('fecha_inicio', { ascending: true }),
        supabase.from('cronograma_tareas').select('id, fragmento_id, texto, responsable_id, hecha_en, hecha_por').order('created_at', { ascending: true }),
      ])
      if (fragmentos.error) throw fragmentos.error
      if (tareas.error) throw tareas.error

      const porFragmento = new Map<string, Tarea[]>()
      for (const fila of tareas.data) {
        const lista = porFragmento.get(fila.fragmento_id) ?? []
        lista.push({
          id: fila.id,
          fragmentoId: fila.fragmento_id,
          texto: fila.texto,
          responsableId: fila.responsable_id,
          hecha: fila.hecha_en !== null,
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
  responsableId: string | null
}

/** Agregar una tarea a un fragmento, o editar su texto y su responsable. */
export function useGuardarTarea() {
  const onSuccess = useAlCambiar()
  return useMutation({
    mutationFn: async ({ id, fragmentoId, texto, responsableId }: DatosTarea & { id?: string; fragmentoId: string }) => {
      const fila = { texto: texto.trim().replace(/\s+/g, ' '), responsable_id: responsableId }
      if (id) {
        const { error } = await supabase.from('cronograma_tareas').update(fila).eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('cronograma_tareas').insert({ ...fila, fragmento_id: fragmentoId })
      if (error) throw error
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
      fragmentos?.map((fragmento) => ({ ...fragmento, tareas: fragmento.tareas.map((tarea) => (tarea.id === id ? { ...tarea, hecha } : tarea)) })),
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
