import type { Feature, FeatureCollection, LineString, Point as PuntoGeoJSON } from 'geojson'

/** [x, y] en píxeles de pantalla, o [lng, lat] en el mapa, según dónde se use. */
export type Punto = [number, number]

/** Un trazo a mano alzada, con las coordenadas reales del mapa para que se quede pegado a él. */
export interface Trazo {
  puntos: Punto[]
  color: string
  /** Grosor de la línea, en píxeles. */
  grosor: number
}

/** Una caja de texto, anclada a una posición del mapa para que se quede pegada a él. */
export interface Texto {
  id: string
  /** [lng, lat] del centro del texto. */
  posicion: Punto
  /** Lo escrito, con saltos de línea. */
  texto: string
  color: string
  /** Tamaño de la letra, en píxeles. */
  tamano: number
  /** Giro en grados, de -180 a 180, respecto al norte del mapa (el positivo va a la derecha). */
  giro: number
}

/** Todo lo que se puede dibujar en la pizarra, en el orden en que se hizo. */
export type Elemento = ({ tipo: 'trazo' } & Trazo) | ({ tipo: 'texto' } & Texto)

/**
 * Colores del lápiz y de los textos. Todos llevan un borde blanco (ver la capa de la pizarra), así que se ven igual
 * de bien sobre el mapa claro y sobre el oscuro, incluido el negro.
 */
export const COLORES_TRAZO = [
  { valor: '#E5484D', nombre: 'Rojo' },
  { valor: '#F79009', nombre: 'Naranja' },
  { valor: '#16A34A', nombre: 'Verde' },
  { valor: '#0478FB', nombre: 'Azul' },
  { valor: '#0A0A0C', nombre: 'Negro' },
] as const

export const TAMANOS_TEXTO = [
  { valor: 20, nombre: 'Normal' },
  { valor: 32, nombre: 'Grande' },
] as const

/** Cuántos caracteres puede tener un texto: más taparía el mapa. */
export const MAX_CARACTERES_TEXTO = 160

/** De cuánto en cuánto giran los botones de girar, y a qué múltiplos se acomoda la manija. */
export const PASO_GIRO = 15

/** La manija de girar se acomoda al múltiplo más cercano cuando está a menos de estos grados. */
const IMAN_GIRO = 4

/** Tipografía, interlineado y borde de los textos. Los usan el HTML de la pizarra (Pizarra.css) y el dibujo sobre la imagen. */
export const FAMILIA_TEXTO = "Poppins, system-ui, -apple-system, 'Segoe UI', sans-serif"
export const INTERLINEADO_TEXTO = 1.25
export const BORDE_TEXTO_PX = 5

export const GROSORES_TRAZO = [
  { valor: 4, nombre: 'Fino' },
  { valor: 8, nombre: 'Grueso' },
] as const

/** Distancia (en píxeles) desde la que se agrega un punto nuevo al dibujar: ahorra puntos casi iguales. */
export const DISTANCIA_MINIMA_PX = 1.5

/** Cuánto se puede alejar un punto de la línea recta para que se quite al simplificar el trazo, en píxeles. */
export const TOLERANCIA_PX = 1.5

/** Distancia de un punto al segmento [a, b]. */
function distanciaAlSegmento([x, y]: Punto, [ax, ay]: Punto, [bx, by]: Punto) {
  const dx = bx - ax
  const dy = by - ay
  const largo = dx * dx + dy * dy
  // Si el segmento es un solo punto, es la distancia a ese punto.
  const t = largo === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / largo))
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
}

/**
 * Quita los puntos que casi no cambian la forma del trazo (Douglas-Peucker). Un dedo mueve cientos
 * de puntos por segundo, y no hace falta guardarlos todos. Sin recursión, para trazos largos.
 */
export function simplificar(puntos: Punto[], tolerancia: number): Punto[] {
  if (puntos.length < 3) return puntos
  const conservar = new Array<boolean>(puntos.length).fill(false)
  conservar[0] = conservar[puntos.length - 1] = true
  const tramos: [number, number][] = [[0, puntos.length - 1]]
  while (tramos.length > 0) {
    const [inicio, fin] = tramos.pop()!
    let mayor = 0
    let indice = -1
    for (let i = inicio + 1; i < fin; i++) {
      const distancia = distanciaAlSegmento(puntos[i], puntos[inicio], puntos[fin])
      if (distancia > mayor) {
        mayor = distancia
        indice = i
      }
    }
    if (indice !== -1 && mayor > tolerancia) {
      conservar[indice] = true
      tramos.push([inicio, indice], [indice, fin])
    }
  }
  return puntos.filter((_punto, i) => conservar[i])
}

/** 6 decimales ≈ 10 cm: suficiente precisión y trazos más livianos. */
export const redondear = ([lng, lat]: Punto): Punto => [Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]

/** Lleva un giro cualquiera a (-180, 180]. */
export function normalizarGiro(grados: number) {
  const resto = ((((grados + 180) % 360) + 360) % 360) - 180
  return resto === -180 ? 180 : resto
}

/** Acomoda un giro al múltiplo de PASO_GIRO más cercano si está muy cerca, para que 0° y 90° sean fáciles de acertar. */
export function acomodarGiro(grados: number) {
  const cercano = Math.round(grados / PASO_GIRO) * PASO_GIRO
  return Math.abs(grados - cercano) < IMAN_GIRO ? normalizarGiro(cercano) : Math.round(grados)
}

/** Los trazos como GeoJSON: es lo que dibuja el mapa. */
export function trazosAGeoJSON(trazos: Trazo[]): FeatureCollection<LineString, { color: string; grosor: number }> {
  return {
    type: 'FeatureCollection',
    features: trazos
      .filter((trazo) => trazo.puntos.length >= 2)
      .map(({ puntos, color, grosor }) => ({
        type: 'Feature' as const,
        properties: { color, grosor },
        geometry: { type: 'LineString' as const, coordinates: puntos },
      })),
  }
}

/**
 * Todo el dibujo como GeoJSON, que es lo que se guarda en `bocetos.trazos`: una línea por trazo y un punto
 * por texto, en el orden en que se hicieron.
 */
export function elementosAGeoJSON(
  elementos: Elemento[],
): FeatureCollection<LineString | PuntoGeoJSON, { color: string; grosor: number } | { texto: string; color: string; tamano: number; giro: number }> {
  const features: Feature<LineString | PuntoGeoJSON, { color: string; grosor: number } | { texto: string; color: string; tamano: number; giro: number }>[] = []
  for (const elemento of elementos) {
    if (elemento.tipo === 'texto') {
      const { posicion, texto, color, tamano, giro } = elemento
      features.push({ type: 'Feature', properties: { texto, color, tamano, giro }, geometry: { type: 'Point', coordinates: posicion } })
    } else if (elemento.puntos.length >= 2) {
      const { puntos, color, grosor } = elemento
      features.push({ type: 'Feature', properties: { color, grosor }, geometry: { type: 'LineString', coordinates: puntos } })
    }
  }
  return { type: 'FeatureCollection', features }
}
