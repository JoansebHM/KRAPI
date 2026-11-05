import type { PostgrestError } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useCategorias } from '../categorias/api'
import { fechaLocal } from '../estudios/campos'
import { useLugares } from '../lugares/api'
import { useUsuarios } from '../usuarios/api'
import {
  calcularAnalitica,
  type EstudioParaAnalitica,
  type EvidenciaParaAnalitica,
  type ParticipanteParaAnalitica,
} from './calculos'

/** PostgREST devuelve como máximo 1000 filas por consulta: se lee por páginas para no quedarse corto. */
const FILAS_POR_PAGINA = 1000

async function leerTodo<T>(pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>) {
  const filas: T[] = []
  for (let desde = 0; ; desde += FILAS_POR_PAGINA) {
    const { data, error } = await pagina(desde, desde + FILAS_POR_PAGINA - 1)
    if (error) throw error
    filas.push(...(data ?? []))
    if (!data || data.length < FILAS_POR_PAGINA) return filas
  }
}

interface DatosCrudos {
  estudios: EstudioParaAnalitica[]
  evidencias: EvidenciaParaAnalitica[]
  participantes: ParticipanteParaAnalitica[]
}

/** Solo lo necesario para contar: estudios visibles, sus participantes y todas las evidencias. */
function useDatosCrudos() {
  return useQuery({
    queryKey: ['analitica'],
    // Siempre se abre con cifras al día, pero se muestran al instante las que ya estaban en caché.
    refetchOnMount: 'always',
    queryFn: async (): Promise<DatosCrudos> => {
      const [estudios, evidencias, participantes] = await Promise.all([
        leerTodo((desde, hasta) =>
          supabase.from('estudios').select('id, ubicacion_id, fecha, hora_inicio, notas, entrevistado').is('archivado_en', null).order('id').range(desde, hasta),
        ),
        leerTodo((desde, hasta) =>
          supabase.from('evidencias').select('estudio_id, ubicacion_id, tipo, archivo_bytes, creado_por').order('id').range(desde, hasta),
        ),
        leerTodo((desde, hasta) => supabase.from('estudio_participantes').select('estudio_id, usuario_id').order('estudio_id').range(desde, hasta)),
      ])
      return {
        estudios: estudios.map((fila) => ({
          id: fila.id,
          ubicacionId: fila.ubicacion_id,
          fecha: fila.fecha,
          horaInicio: fila.hora_inicio,
          notas: fila.notas,
          entrevistado: fila.entrevistado,
        })),
        evidencias: evidencias.map((fila) => ({
          estudioId: fila.estudio_id,
          ubicacionId: fila.ubicacion_id,
          tipo: fila.tipo,
          bytes: fila.archivo_bytes,
          creadoPor: fila.creado_por,
        })),
        participantes: participantes.map((fila) => ({ estudioId: fila.estudio_id, usuarioId: fila.usuario_id })),
      }
    },
  })
}

/** Las cifras del avance del levantamiento (pantalla Analítica). */
export function useAnalitica() {
  const crudos = useDatosCrudos()
  const lugares = useLugares()
  const categorias = useCategorias()
  const cuentas = useUsuarios()

  const datos = useMemo(() => {
    if (!crudos.data || !lugares.data || !categorias.data || !cuentas.data) return undefined
    return calcularAnalitica({
      ...crudos.data,
      lugares: lugares.data,
      categorias: categorias.data,
      cuentas: cuentas.data,
      hoy: fechaLocal(),
    })
  }, [crudos.data, lugares.data, categorias.data, cuentas.data])

  const consultas = [crudos, lugares, categorias, cuentas]
  return {
    datos,
    isPending: !datos && consultas.every((consulta) => !consulta.isError),
    isError: consultas.some((consulta) => consulta.isError),
    refetch: () => consultas.forEach((consulta) => void consulta.refetch()),
  }
}
