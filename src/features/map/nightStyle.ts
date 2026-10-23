import type { LayerSpecification, StyleSpecification } from './maplibre'

/**
 * Paleta nocturna de alto contraste para el mapa base.
 * Fondo azul marino (no negro), calles claras, vías principales en ámbar y textos casi blancos.
 */
const NIGHT = {
  background: '#16263d',
  landuse: '#1b2d47',
  landuseAlt: '#20365a',
  green: '#1d3d37',
  greenOutline: '#285246',
  water: '#1f4f80',
  waterLine: '#3474b5',
  building: '#283c5e',
  buildingOutline: '#3a5278',
  roadMinor: '#5a6f90',
  roadMinorCasing: '#0f1c2e',
  roadMajor: '#e0b96e',
  roadMajorCasing: '#6e5627',
  roadMotorway: '#f2a660',
  path: '#6a7fa0',
  rail: '#7a8aa3',
  boundary: '#8796ad',
  text: '#eef3f9',
  textPlace: '#ffffff',
  textRoad: '#d6e1ee',
  textWater: '#a3cfff',
  textTransit: '#b3d6ff',
  halo: '#0c1829',
} as const

const MAJOR_ROAD = /motorway|trunk|primary|secondary|tertiary|link/

/**
 * Convierte un estilo claro (pensado para Liberty de OpenFreeMap) en una versión nocturna.
 * Conserva todas las capas, incluidos los nombres e íconos de los locales; solo cambia los colores.
 */
export function toNightStyle(style: StyleSpecification): StyleSpecification {
  return { ...style, layers: style.layers.map(recolorLayer) }
}

function recolorLayer(layer: LayerSpecification): LayerSpecification {
  const id = layer.id
  switch (layer.type) {
    case 'background':
      return { ...layer, paint: { ...layer.paint, 'background-color': NIGHT.background } }
    case 'raster':
      return { ...layer, paint: { ...layer.paint, 'raster-brightness-max': 0.35, 'raster-saturation': -0.4 } }
    case 'fill':
      return { ...layer, paint: { ...layer.paint, ...fillColors(id) } }
    case 'fill-extrusion':
      return { ...layer, paint: { ...layer.paint, 'fill-extrusion-color': NIGHT.building } }
    case 'line':
      return { ...layer, paint: { ...layer.paint, 'line-color': lineColor(id) } }
    case 'symbol':
      if (!layer.layout?.['text-field']) return layer
      return {
        ...layer,
        paint: { ...layer.paint, 'text-color': textColor(id), 'text-halo-color': NIGHT.halo, 'text-halo-width': 1.5 },
      }
    default:
      return layer
  }
}

function fillColors(id: string) {
  if (id.includes('water')) return { 'fill-color': NIGHT.water }
  if (id.includes('building')) return { 'fill-color': NIGHT.building, 'fill-outline-color': NIGHT.buildingOutline }
  if (/park|wood|grass|wetland|pitch|track|cemetery/.test(id)) {
    return { 'fill-color': NIGHT.green, 'fill-outline-color': NIGHT.greenOutline }
  }
  if (/hospital|school|aeroway|sand|ice/.test(id)) return { 'fill-color': NIGHT.landuseAlt }
  return { 'fill-color': NIGHT.landuse }
}

function lineColor(id: string) {
  if (id.includes('waterway')) return NIGHT.waterLine
  if (id.includes('park')) return NIGHT.greenOutline
  if (id.includes('boundary')) return NIGHT.boundary
  if (id.includes('rail')) return NIGHT.rail
  if (/path|pedestrian/.test(id)) return NIGHT.path
  if (id.includes('casing')) return MAJOR_ROAD.test(id) ? NIGHT.roadMajorCasing : NIGHT.roadMinorCasing
  if (id.includes('motorway') && !id.includes('link')) return NIGHT.roadMotorway
  if (MAJOR_ROAD.test(id)) return NIGHT.roadMajor
  return NIGHT.roadMinor
}

function textColor(id: string) {
  if (id.includes('water')) return NIGHT.textWater
  if (id.includes('transit')) return NIGHT.textTransit
  if (id.startsWith('label_')) return NIGHT.textPlace
  if (id.startsWith('highway-name')) return NIGHT.textRoad
  return NIGHT.text
}
