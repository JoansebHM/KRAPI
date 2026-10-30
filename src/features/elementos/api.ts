import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { CLAVE_CATEGORIAS } from '../categorias/api'
import { CLAVE_LUGARES, useAlCambiarLugar, type DetalleLugar } from '../lugares/api'

/** Lo que se llena en el formulario de un elemento: no tiene dirección ni contacto, y el nombre es opcional. */
export interface CamposElemento {
  nombre: string
  categoriaId: string | null
  descripcion: string
}

export const ELEMENTO_VACIO: CamposElemento = { nombre: '', categoriaId: null, descripcion: '' }

export function camposDeElemento(lugar: DetalleLugar): CamposElemento {
  return { nombre: lugar.nombrePropio ?? '', categoriaId: lugar.categoriaId, descripcion: lugar.descripcion ?? '' }
}

function columnasDeElemento(campos: CamposElemento) {
  return {
    // Sin nombre, el elemento se muestra con el de su categoría.
    nombre: campos.nombre.trim().replace(/\s+/g, ' ') || null,
    categoria_id: campos.categoriaId,
    descripcion: campos.descripcion.trim() || null,
  }
}

/**
 * Distancia (en metros) por debajo de la cual se pregunta si es el mismo elemento. Es mucho menor que
 * la de los lugares porque los elementos suelen estar juntos: dos canecas en una esquina, postes seguidos.
 */
export const METROS_ELEMENTO_DUPLICADO = 3

export interface ElementoCercano {
  id: string
  nombre: string
  distanciaM: number
}

/** Elementos de la misma categoría a menos de 3 m, para avisar de un posible duplicado antes de crear uno. */
export async function buscarElementosCercanos(lng: number, lat: number, categoriaId: string | null): Promise<ElementoCercano[]> {
  const { data, error } = await supabase.rpc('elementos_cercanos', {
    lng,
    lat,
    // La función compara con IS NOT DISTINCT FROM: NULL busca los elementos sin categoría.
    categoria_id: categoriaId as string,
    metros: METROS_ELEMENTO_DUPLICADO,
  })
  if (error) throw error
  return data.map(({ id, nombre, distancia_m }) => ({ id, nombre, distanciaM: distancia_m }))
}

export function useCrearElemento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: CamposElemento & { lng: number; lat: number }) => {
      const { data, error } = await supabase
        .from('ubicaciones')
        .insert({ tipo: 'elemento', geom: `SRID=4326;POINT(${datos.lng} ${datos.lat})`, ...columnasDeElemento(datos) })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_LUGARES })
      void queryClient.invalidateQueries({ queryKey: CLAVE_CATEGORIAS })
    },
  })
}

export function useActualizarElemento() {
  const onSuccess = useAlCambiarLugar()
  return useMutation({
    mutationFn: async ({ id, campos }: { id: string; campos: CamposElemento }) => {
      const { error } = await supabase.from('ubicaciones').update(columnasDeElemento(campos)).eq('id', id)
      if (error) throw error
    },
    onSuccess,
  })
}
