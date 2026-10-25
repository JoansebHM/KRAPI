import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useMatch, useNavigate } from 'react-router'
import type { FeatureCollection, Polygon } from 'geojson'
import { useCategorias, type Categoria } from '../categorias/api'
import { COLOR_SIN_CATEGORIA } from '../categorias/colores'
import { IconoCategoria } from '../categorias/IconoCategoria'
import { Marker, type GeoJSONSource, type Map as MapLibreMap, type MapLayerMouseEvent } from '../map/maplibre'
import type { Theme } from '../theme/useTheme'
import { useTiposZona } from '../tiposZona/api'
import { useLugares, type Punto, type Zona } from './api'
import { CAPA_RELLENO, tocoUnMarcador } from './tocarLugar'
import './LugaresEnMapa.css'

const FUENTE_ZONAS = 'lugares-zonas'
const CAPA_BORDE = 'lugares-zonas-borde'

/**
 * Cada zona se pinta con el color de su tipo. Las que no tienen tipo van en lila, para no
 * confundirse con el límite azul de Manila.
 */
const COLORES_ZONA: Record<Theme, { sinTipo: string; opacidad: number }> = {
  light: { sinTipo: '#9e7ae1', opacidad: 0.2 },
  dark: { sinTipo: '#b59cf0', opacidad: 0.26 },
}

interface LugaresEnMapaProps {
  mapa: MapLibreMap
  theme: Theme
}

/** Dibuja los lugares visibles: puntos como marcadores con su categoría y zonas como polígonos. */
export function LugaresEnMapa({ mapa, theme }: LugaresEnMapaProps) {
  const { data: lugares } = useLugares()
  const { data: categorias } = useCategorias()
  const { data: tiposZona } = useTiposZona()
  const navigate = useNavigate()
  // Mientras se ubica o se dibuja un lugar, tocar el mapa no abre fichas.
  const { pathname } = useLocation()
  const creando = /^\/(lugares\/nuevo|zonas\/nueva)$|\/(mover|redibujar)$/.test(pathname)
  const idEnRuta = useMatch('/lugares/:id')?.params.id
  const seleccionado = creando ? undefined : idEnRuta

  const puntos = useMemo(() => (lugares ?? []).filter((lugar): lugar is Punto => lugar.tipo === 'punto'), [lugares])
  const zonas = useMemo(() => (lugares ?? []).filter((lugar): lugar is Zona => lugar.tipo === 'zona'), [lugares])
  const categoriaPorId = useMemo(() => new Map((categorias ?? []).map((categoria) => [categoria.id, categoria])), [categorias])

  const colorPorTipo = useMemo(() => new Map((tiposZona ?? []).map((tipo) => [tipo.id, tipo.color])), [tiposZona])

  const abrir = useCallback((id: string) => navigate(`/lugares/${id}`), [navigate])

  useZonas(mapa, zonas, colorPorTipo, theme, seleccionado, creando ? undefined : abrir)

  return puntos.map((punto) => (
    <MarcadorPunto
      key={punto.id}
      mapa={mapa}
      punto={punto}
      categoria={punto.categoriaId ? categoriaPorId.get(punto.categoriaId) : undefined}
      seleccionado={punto.id === seleccionado}
      onAbrir={abrir}
    />
  ))
}

interface MarcadorPuntoProps {
  mapa: MapLibreMap
  punto: Punto
  categoria: Categoria | undefined
  seleccionado: boolean
  onAbrir: (id: string) => void
}

function MarcadorPunto({ mapa, punto, categoria, seleccionado, onAbrir }: MarcadorPuntoProps) {
  const [elemento] = useState(() => document.createElement('div'))
  const [lng, lat] = punto.geometria.coordinates

  const marcadorRef = useRef<Marker | null>(null)

  useEffect(() => {
    const marcador = new Marker({ element: elemento, anchor: 'center' }).setLngLat([lng, lat]).addTo(mapa)
    marcadorRef.current = marcador
    return () => {
      marcador.remove()
      marcadorRef.current = null
    }
  }, [mapa, elemento, lng, lat])

  // El seleccionado queda encima de los marcadores vecinos.
  useEffect(() => {
    const marcador = marcadorRef.current
    if (!marcador) return
    if (seleccionado) marcador.addClassName('marcador-encima')
    else marcador.removeClassName('marcador-encima')
  }, [seleccionado, mapa, lng, lat])

  const cerrado = punto.estado === 'cerrada'
  const descripcion = [categoria?.nombre ?? 'Sin categoría', cerrado && 'cerrado'].filter(Boolean).join(', ')

  return createPortal(
    <button
      type="button"
      className={`marcador-lugar${categoria ? '' : ' marcador-sin-categoria'}${cerrado ? ' marcador-cerrado' : ''}${seleccionado ? ' marcador-seleccionado' : ''}`}
      aria-label={`${punto.nombre} (${descripcion})`}
      aria-pressed={seleccionado}
      onClick={() => onAbrir(punto.id)}
    >
      <IconoCategoria icono={categoria?.icono} color={categoria?.color ?? COLOR_SIN_CATEGORIA} tamano={32} />
    </button>,
    elemento,
  )
}

/** Mantiene la fuente y las capas de las zonas, también después de cambiar el mapa base (tema). */
function useZonas(
  mapa: MapLibreMap,
  zonas: Zona[],
  colorPorTipo: Map<string, string>,
  theme: Theme,
  seleccionado: string | undefined,
  onAbrir?: (id: string) => void,
) {
  const datos = useMemo<FeatureCollection<Polygon>>(
    () => ({
      type: 'FeatureCollection',
      features: zonas.map((zona) => ({
        type: 'Feature',
        geometry: zona.geometria,
        properties: {
          id: zona.id,
          cerrada: zona.estado === 'cerrada',
          seleccionada: zona.id === seleccionado,
          color: (zona.tipoZonaId && colorPorTipo.get(zona.tipoZonaId)) || COLORES_ZONA[theme].sinTipo,
        },
      })),
    }),
    [zonas, seleccionado, colorPorTipo, theme],
  )

  // Los listeners del mapa leen siempre lo último sin volver a registrarse.
  const actual = useRef({ datos, theme, onAbrir })
  useEffect(() => {
    actual.current = { datos, theme, onAbrir }
  })

  // Crea la fuente y las capas cada vez que se carga un estilo (al inicio y tras cada cambio de tema).
  useEffect(() => {
    function asegurarCapas() {
      const { datos, theme } = actual.current
      const colores = COLORES_ZONA[theme]
      if (!mapa.getSource(FUENTE_ZONAS)) mapa.addSource(FUENTE_ZONAS, { type: 'geojson', data: datos })
      if (!mapa.getLayer(CAPA_RELLENO)) {
        mapa.addLayer({
          id: CAPA_RELLENO,
          type: 'fill',
          source: FUENTE_ZONAS,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['case', ['get', 'cerrada'], colores.opacidad / 2, colores.opacidad],
          },
        })
      }
      if (!mapa.getLayer(CAPA_BORDE)) {
        mapa.addLayer({
          id: CAPA_BORDE,
          type: 'line',
          source: FUENTE_ZONAS,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['case', ['get', 'seleccionada'], 4, 2],
            'line-opacity': ['case', ['get', 'cerrada'], 0.5, 1],
          },
        })
      }
    }

    function alTocar(evento: MapLayerMouseEvent) {
      // Un toque sobre un marcador también llega al mapa: ese lo maneja el marcador.
      if (tocoUnMarcador(evento)) return
      // Si hay zonas superpuestas, se abre la más pequeña, que es la más difícil de tocar.
      const zona = [...(evento.features ?? [])].sort((a, b) => area(a.geometry as Polygon) - area(b.geometry as Polygon))[0]
      if (zona) actual.current.onAbrir?.(String(zona.properties.id))
    }
    const conPuntero = () => (mapa.getCanvas().style.cursor = 'pointer')
    const sinPuntero = () => (mapa.getCanvas().style.cursor = '')

    // Si el estilo ya estaba listo al montar, se agregan ya; si no, MapLibre lanza un error y se agregan en style.load.
    try {
      asegurarCapas()
    } catch {
      // El estilo todavía está cargando.
    }
    mapa.on('style.load', asegurarCapas)
    mapa.on('click', CAPA_RELLENO, alTocar)
    mapa.on('mouseenter', CAPA_RELLENO, conPuntero)
    mapa.on('mouseleave', CAPA_RELLENO, sinPuntero)
    return () => {
      mapa.off('style.load', asegurarCapas)
      mapa.off('click', CAPA_RELLENO, alTocar)
      mapa.off('mouseenter', CAPA_RELLENO, conPuntero)
      mapa.off('mouseleave', CAPA_RELLENO, sinPuntero)
    }
  }, [mapa])

  // Actualiza las zonas cuando cambian los datos o la selección. Al cambiar de tema el mapa
  // recarga su estilo y asegurarCapas vuelve a crear las capas con los colores del tema nuevo.
  useEffect(() => {
    ;(mapa.getSource(FUENTE_ZONAS) as GeoJSONSource | undefined)?.setData(datos)
  }, [mapa, datos])
}

/** Área aproximada (en grados²) del anillo exterior: solo sirve para comparar zonas entre sí. */
function area(poligono: Polygon) {
  const anillo = poligono.coordinates[0] ?? []
  let suma = 0
  for (let i = 0; i < anillo.length - 1; i++) suma += anillo[i][0] * anillo[i + 1][1] - anillo[i + 1][0] * anillo[i][1]
  return Math.abs(suma / 2)
}
