import type { Map as MapLibreMap, MapMouseEvent } from '../map/maplibre'

/** Capa con el relleno de las zonas: es la que se toca para abrir una zona. */
export const CAPA_RELLENO = 'lugares-zonas-relleno'

/** Un toque sobre un marcador también llega al mapa: ese lo maneja el marcador. */
export const tocoUnMarcador = (evento: MapMouseEvent) =>
  evento.originalEvent.target instanceof Element && Boolean(evento.originalEvent.target.closest('.marcador-lugar'))

/** Si un toque en el mapa fue sobre un lugar (un marcador o una zona), que se encarga de abrir su ficha. */
export function tocoUnLugar(mapa: MapLibreMap, evento: MapMouseEvent) {
  if (tocoUnMarcador(evento)) return true
  return Boolean(mapa.getLayer(CAPA_RELLENO)) && mapa.queryRenderedFeatures(evento.point, { layers: [CAPA_RELLENO] }).length > 0
}
