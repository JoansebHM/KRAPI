import { env } from '../../config/env'
import type { Theme } from '../theme/useTheme'
import type { LayerSpecification, StyleSpecification } from './maplibre'

/** Vistas del mapa base. Todas menos "calles" usan estilos de MapTiler y necesitan su clave. */
export type Vista = 'calles' | 'topografico' | 'simplificado'

export const VISTAS: { id: Vista; nombre: string }[] = [
  { id: 'calles', nombre: 'Calles' },
  { id: 'topografico', nombre: 'Topográfico' },
  { id: 'simplificado', nombre: 'Calles simplificado' },
]

/** Sin clave de MapTiler solo existe la vista de calles. */
export const vistasExtraDisponibles = Boolean(env.maptilerApiKey)

const CLAVE_VISTA = 'krapi-vista-mapa'

const ESTILOS: Record<Exclude<Vista, 'calles'>, { claro: string; oscuro: string }> = {
  topografico: { claro: 'topo-v2', oscuro: 'topo-v2-dark' },
  simplificado: { claro: 'dataviz', oscuro: 'dataviz-dark' },
}

/** URL del estilo de MapTiler de una vista, según el tema. Las calles usan el estilo de siempre. */
export function estiloDeVista(vista: Exclude<Vista, 'calles'>, tema: Theme) {
  const estilo = ESTILOS[vista][tema === 'dark' ? 'oscuro' : 'claro']
  return `https://api.maptiler.com/maps/${estilo}/style.json?key=${env.maptilerApiKey}`
}

const CLASES_PRINCIPALES = ['motorway', 'trunk', 'primary']
const CLASES_MEDIAS = ['secondary', 'tertiary']
const CLASES_MENORES = ['minor', 'service']

/** Ancho de una calle según su jerarquía: [zoom 13, zoom 16, zoom 18, zoom 20]. */
function anchoPorClase(principal: number[], medio: number[], menor: number[]) {
  const en = (indice: number) => ['match', ['get', 'class'], CLASES_PRINCIPALES, principal[indice], CLASES_MEDIAS, medio[indice], menor[indice]]
  return ['interpolate', ['exponential', 1.5], ['zoom'], 13, en(0), 16, en(1), 18, en(2), 20, en(3)]
}

const COLORES_CALLES = {
  light: { borde: '#26364f', relleno: '#ffffff' },
  dark: { borde: '#05080f', relleno: '#7f93b5' },
} as const

/** Dibuja encima del mapa base las calles con borde oscuro y más anchas, para que se noten. */
function resaltarCalles(estilo: StyleSpecification, tema: Theme): StyleSpecification {
  // Si el estilo no trae las calles de MapTiler no hay qué resaltar.
  if (!estilo.sources['maptiler_planet']) return estilo
  const colores = COLORES_CALLES[tema]
  const calles = ['in', 'class', ...CLASES_PRINCIPALES, ...CLASES_MEDIAS, ...CLASES_MENORES]
  const base = {
    type: 'line',
    source: 'maptiler_planet',
    'source-layer': 'transportation',
    filter: ['all', calles, ['!=', 'brunnel', 'tunnel']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  }
  const nuevas = [
    { ...base, id: 'resalte-calles-borde', paint: { 'line-color': colores.borde, 'line-width': anchoPorClase([3, 11, 28, 70], [2.5, 8.5, 21, 52], [1.8, 6, 14, 34]) } },
    { ...base, id: 'resalte-calles', paint: { 'line-color': colores.relleno, 'line-width': anchoPorClase([1.8, 8, 22, 56], [1.4, 6, 16, 40], [1, 4, 10, 24]) } },
  ] as unknown as LayerSpecification[]

  // Van debajo de los nombres de las calles y los lugares, para que se sigan leyendo.
  const primeraEtiqueta = estilo.layers.findIndex((capa) => capa.type === 'symbol')
  const capas = [...estilo.layers]
  capas.splice(primeraEtiqueta === -1 ? capas.length : primeraEtiqueta, 0, ...nuevas)
  return { ...estilo, layers: capas }
}

/** Oculta los nombres e íconos de los locales y demás puntos de interés del mapa base (los lugares de KIRA no se tocan). */
function ocultarPuntosDeInteres(estilo: StyleSpecification): StyleSpecification {
  return {
    ...estilo,
    layers: estilo.layers.map((capa) => {
      if (!('source-layer' in capa) || capa['source-layer'] !== 'poi') return capa
      return { ...capa, layout: { ...capa.layout, visibility: 'none' } }
    }),
  }
}

/**
 * Cambios que se le hacen al estilo de cada vista: oculta los locales del mapa base (salvo que se pidan
 * en los filtros) y, en "Calles simplificado", resalta las calles.
 */
export function ajustarEstilo(vista: Vista, tema: Theme, mostrarLocales: boolean): (estilo: StyleSpecification) => StyleSpecification {
  return (estilo) => {
    const sinLocales = mostrarLocales ? estilo : ocultarPuntosDeInteres(estilo)
    return vista === 'simplificado' ? resaltarCalles(sinLocales, tema) : sinLocales
  }
}

export function leerVista(): Vista {
  if (!vistasExtraDisponibles) return 'calles'
  try {
    const guardada = localStorage.getItem(CLAVE_VISTA)
    return VISTAS.some((vista) => vista.id === guardada) ? (guardada as Vista) : 'calles'
  } catch {
    return 'calles'
  }
}

export function guardarVista(vista: Vista) {
  try {
    localStorage.setItem(CLAVE_VISTA, vista)
  } catch {
    // Sin almacenamiento (por ejemplo, navegación privada): vuelve a calles al recargar.
  }
}

const CLAVE_LOCALES = 'krapi-locales-del-mapa'

/** Si se muestran los locales que trae el mapa base. Por defecto no: ensucian el mapa mientras hay pocos estudios. */
export function leerMostrarLocales(): boolean {
  try {
    return localStorage.getItem(CLAVE_LOCALES) === 'si'
  } catch {
    return false
  }
}

export function guardarMostrarLocales(mostrar: boolean) {
  try {
    if (mostrar) localStorage.setItem(CLAVE_LOCALES, 'si')
    else localStorage.removeItem(CLAVE_LOCALES)
  } catch {
    // Sin almacenamiento: vuelve a ocultarse al recargar.
  }
}
