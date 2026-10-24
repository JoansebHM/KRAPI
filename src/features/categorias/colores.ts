/**
 * Colores sugeridos para las categorías. Empiezan por la paleta de Kratos Innovation Lab
 * y siguen con colores bien distinguibles entre sí en el mapa.
 */
export const COLORES_CATEGORIA = [
  { valor: '#0478FB', nombre: 'Azul cielo' },
  { valor: '#0D34E9', nombre: 'Azul eléctrico' },
  { valor: '#6100DF', nombre: 'Morado' },
  { valor: '#9E7AE1', nombre: 'Lila' },
  { valor: '#DEFF5D', nombre: 'Amarillo neón' },
  { valor: '#12B76A', nombre: 'Verde' },
  { valor: '#0BA5A4', nombre: 'Turquesa' },
  { valor: '#F79009', nombre: 'Naranja' },
  { valor: '#E5484D', nombre: 'Rojo' },
  { valor: '#E93D82', nombre: 'Rosa' },
  { valor: '#9A6B4F', nombre: 'Café' },
  { valor: '#667085', nombre: 'Gris' },
] as const

export const COLOR_POR_DEFECTO = COLORES_CATEGORIA[0].valor

/** Lugares sin categoría: círculo blanco (con borde gris en el mapa), distinto de cualquier color de la paleta. */
export const COLOR_SIN_CATEGORIA = '#FFFFFF'

export function nombreDelColor(valor: string) {
  return COLORES_CATEGORIA.find((color) => color.valor.toLowerCase() === valor.toLowerCase())?.nombre ?? 'Personalizado'
}
