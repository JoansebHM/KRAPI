import { dentroDeManila } from '../map/manila'

/** Una esquina: [longitud, latitud]. */
export type Esquina = [number, number]

/** Área mínima de una zona: la misma regla que ubicaciones_zona_area_minima en la base de datos. */
export const AREA_MINIMA_M2 = 20

/**
 * Área aproximada en m² de un polígono pequeño (unas cuadras): se proyecta a metros alrededor de su
 * latitud media y se usa la fórmula del área de Gauss. Para Manila el error es despreciable.
 */
export function areaM2(esquinas: Esquina[]) {
  if (esquinas.length < 3) return 0
  const latMedia = esquinas.reduce((suma, [, lat]) => suma + lat, 0) / esquinas.length
  const metrosPorGradoLng = 111_320 * Math.cos((latMedia * Math.PI) / 180)
  const metrosPorGradoLat = 110_540
  const puntos = esquinas.map(([lng, lat]) => [lng * metrosPorGradoLng, lat * metrosPorGradoLat])
  let suma = 0
  for (let i = 0; i < puntos.length; i++) {
    const [x1, y1] = puntos[i]
    const [x2, y2] = puntos[(i + 1) % puntos.length]
    suma += x1 * y2 - x2 * y1
  }
  return Math.abs(suma / 2)
}

/** '1.234 m²' (o '1,2 ha' desde una hectárea). */
export function mostrarArea(m2: number) {
  if (m2 >= 10_000) return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(m2 / 10_000)} ha`
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(m2)} m²`
}

function orientacion(a: Esquina, b: Esquina, c: Esquina) {
  return Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
}

function segmentosSeCruzan(a: Esquina, b: Esquina, c: Esquina, d: Esquina) {
  return orientacion(a, b, c) !== orientacion(a, b, d) && orientacion(c, d, a) !== orientacion(c, d, b)
}

/** Si algún lado del polígono cruza a otro que no es su vecino (la base de datos no lo acepta). */
export function ladosSeCruzan(esquinas: Esquina[]) {
  const n = esquinas.length
  if (n < 4) return false
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      // El último lado y el primero son vecinos.
      if (i === 0 && j === n - 1) continue
      if (segmentosSeCruzan(esquinas[i], esquinas[(i + 1) % n], esquinas[j], esquinas[(j + 1) % n])) return true
    }
  }
  return false
}

/** Qué impide terminar la zona, o null si se puede. */
export function problemaDeZona(esquinas: Esquina[]): string | null {
  if (esquinas.length < 3) return 'Agrega al menos 3 esquinas.'
  if (esquinas.some(([lng, lat]) => !dentroDeManila(lng, lat))) return 'Todas las esquinas deben quedar dentro de Manila.'
  if (ladosSeCruzan(esquinas)) return 'Los lados de la zona se cruzan. Deshaz la última esquina y ubícala de nuevo.'
  if (areaM2(esquinas) < AREA_MINIMA_M2) return `La zona es muy pequeña: debe tener al menos ${AREA_MINIMA_M2} m².`
  return null
}

/** Polígono como texto EWKT, que PostGIS acepta directamente (el anillo se cierra con la primera esquina). */
export function ewktPoligono(esquinas: Esquina[]) {
  const anillo = [...esquinas, esquinas[0]].map(([lng, lat]) => `${lng} ${lat}`).join(', ')
  return `SRID=4326;POLYGON((${anillo}))`
}

/** Las esquinas de un polígono GeoJSON (sin repetir la primera al final). */
export function esquinasDe(anillo: number[][]): Esquina[] {
  return anillo.slice(0, -1).map(([lng, lat]) => [lng, lat])
}
