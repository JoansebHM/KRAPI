import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { TipoEvidencia } from '../evidencias/archivos'
import type { Lugar } from '../lugares/api'

/** Qué lugares se ven en el mapa, según sus estudios (issue #21). */
export interface FiltrosMapa {
  /** Los elementos (canecas, postes…) se pueden ocultar para ver solo los lugares de estudio. */
  mostrarElementos: boolean
  /** Afecta a los puntos y a los elementos: las zonas no tienen categoría y nunca se ocultan por esto. */
  categoriaIds: string[]
  /** 'AAAA-MM-DD' o null (sin tope). */
  fechaDesde: string | null
  fechaHasta: string | null
  /** 0 (domingo) a 6 (sábado). */
  diasSemana: number[]
  /** 'HH:MM'. Por defecto, todo el día (HORA_DESDE_VACIA–HORA_HASTA_VACIA). */
  horaDesde: string
  horaHasta: string
  tiposEvidencia: TipoEvidencia[]
  /** Cuentas que participaron. */
  participanteIds: string[]
}

export const HORA_DESDE_VACIA = '00:00'
export const HORA_HASTA_VACIA = '23:59'

export const FILTROS_VACIOS: FiltrosMapa = {
  mostrarElementos: true,
  categoriaIds: [],
  fechaDesde: null,
  fechaHasta: null,
  diasSemana: [],
  horaDesde: HORA_DESDE_VACIA,
  horaHasta: HORA_HASTA_VACIA,
  tiposEvidencia: [],
  participanteIds: [],
}

/** Cuántos de los 7 grupos de filtro están puestos (no cuántas opciones se eligieron en cada uno). */
export function contarFiltrosActivos(filtros: FiltrosMapa): number {
  return [
    !filtros.mostrarElementos,
    filtros.categoriaIds.length > 0,
    filtros.fechaDesde !== null || filtros.fechaHasta !== null,
    filtros.diasSemana.length > 0,
    filtros.horaDesde !== HORA_DESDE_VACIA || filtros.horaHasta !== HORA_HASTA_VACIA,
    filtros.tiposEvidencia.length > 0,
    filtros.participanteIds.length > 0,
  ].filter(Boolean).length
}

/** Un estudio, con lo que hace falta de él para los filtros (no su contenido completo). */
export interface EstudioParaFiltro {
  ubicacionId: string
  /** 'AAAA-MM-DD' */
  fecha: string
  /** 'HH:MM' */
  horaInicio: string
  horaFin: string
  participanteIds: string[]
  tiposEvidencia: TipoEvidencia[]
}

const hora = (valor: string) => valor.slice(0, 5)

/** Los estudios visibles (no archivados) de todo el mapa, con lo necesario para filtrar. */
export function useEstudiosParaFiltro() {
  return useQuery({
    queryKey: ['estudios-para-filtro'],
    queryFn: async (): Promise<EstudioParaFiltro[]> => {
      const [estudios, participantes, evidencias] = await Promise.all([
        supabase.from('estudios').select('id, ubicacion_id, fecha, hora_inicio, hora_fin').is('archivado_en', null),
        supabase.from('estudio_participantes').select('estudio_id, usuario_id'),
        // Las evidencias de los elementos no cuentan: no son de un estudio.
        supabase.from('evidencias').select('estudio_id, tipo').not('estudio_id', 'is', null),
      ])
      if (estudios.error) throw estudios.error
      if (participantes.error) throw participantes.error
      if (evidencias.error) throw evidencias.error

      const participantesPorEstudio = new Map<string, string[]>()
      for (const fila of participantes.data) {
        const lista = participantesPorEstudio.get(fila.estudio_id) ?? []
        lista.push(fila.usuario_id)
        participantesPorEstudio.set(fila.estudio_id, lista)
      }
      const tiposPorEstudio = new Map<string, TipoEvidencia[]>()
      for (const fila of evidencias.data) {
        if (!fila.estudio_id) continue
        const lista = tiposPorEstudio.get(fila.estudio_id) ?? []
        lista.push(fila.tipo)
        tiposPorEstudio.set(fila.estudio_id, lista)
      }
      return estudios.data.map((fila) => ({
        ubicacionId: fila.ubicacion_id,
        fecha: fila.fecha,
        horaInicio: hora(fila.hora_inicio),
        horaFin: hora(fila.hora_fin),
        participanteIds: participantesPorEstudio.get(fila.id) ?? [],
        tiposEvidencia: tiposPorEstudio.get(fila.id) ?? [],
      }))
    },
  })
}

/** '2026-10-30' → 5 (viernes), en hora local. Mismo cálculo que fechaLocal() para no desfasarse con UTC. */
function diaDeSemana(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia).getDay()
}

function estudioCumple(estudio: EstudioParaFiltro, filtros: FiltrosMapa): boolean {
  if (filtros.fechaDesde && estudio.fecha < filtros.fechaDesde) return false
  if (filtros.fechaHasta && estudio.fecha > filtros.fechaHasta) return false
  if (filtros.diasSemana.length > 0 && !filtros.diasSemana.includes(diaDeSemana(estudio.fecha))) return false
  // Se cruza con el rango (no que quede totalmente adentro): un estudio de 8 a 10 cumple "después de las 9".
  if (!(estudio.horaInicio < filtros.horaHasta && estudio.horaFin > filtros.horaDesde)) return false
  if (filtros.tiposEvidencia.length > 0 && !estudio.tiposEvidencia.some((tipo) => filtros.tiposEvidencia.includes(tipo))) return false
  if (filtros.participanteIds.length > 0 && !estudio.participanteIds.some((id) => filtros.participanteIds.includes(id))) return false
  return true
}

const hayFiltrosDeEstudio = (filtros: FiltrosMapa) =>
  filtros.fechaDesde !== null ||
  filtros.fechaHasta !== null ||
  filtros.diasSemana.length > 0 ||
  filtros.horaDesde !== HORA_DESDE_VACIA ||
  filtros.horaHasta !== HORA_HASTA_VACIA ||
  filtros.tiposEvidencia.length > 0 ||
  filtros.participanteIds.length > 0

/**
 * Los lugares que quedan después de filtrar. Un punto o un elemento además debe estar en una de las
 * categorías elegidas (las zonas no tienen categoría y no se ven afectadas por ese filtro). Si hay algún
 * otro filtro activo, el lugar se muestra si al menos uno de sus estudios cumple todos a la vez. Esos
 * filtros no afectan a los elementos, que no tienen estudios: se ocultan solo con mostrarElementos.
 */
export function lugaresFiltrados(lugares: Lugar[], estudios: EstudioParaFiltro[], filtros: FiltrosMapa): Lugar[] {
  if (filtros.mostrarElementos && filtros.categoriaIds.length === 0 && !hayFiltrosDeEstudio(filtros)) return lugares

  const estudiosPorLugar = new Map<string, EstudioParaFiltro[]>()
  for (const estudio of estudios) {
    const lista = estudiosPorLugar.get(estudio.ubicacionId) ?? []
    lista.push(estudio)
    estudiosPorLugar.set(estudio.ubicacionId, lista)
  }

  return lugares.filter((lugar) => {
    if (lugar.tipo === 'elemento' && !filtros.mostrarElementos) return false
    if (filtros.categoriaIds.length > 0 && lugar.tipo !== 'zona') {
      if (!lugar.categoriaId || !filtros.categoriaIds.includes(lugar.categoriaId)) return false
    }
    if (lugar.tipo === 'elemento' || !hayFiltrosDeEstudio(filtros)) return true
    return (estudiosPorLugar.get(lugar.id) ?? []).some((estudio) => estudioCumple(estudio, filtros))
  })
}
