import type { Map as MapLibreMap } from '../map/maplibre'
import { dibujarTextos } from './dibujarTextos'
import type { Texto } from './trazos'

/** Cuánto se espera a que el mapa termine de cargar sus mosaicos antes de capturarlo igual. */
const ESPERA_MAXIMA_MS = 5000
/** Ancho de la miniatura de las listas, en píxeles. */
const ANCHO_MINIATURA = 480

export interface Captura {
  /** El mapa como se ve, con los trazos y los textos (PNG). */
  imagen: Blob
  /** Una versión pequeña para las listas (JPEG). */
  miniatura: Blob
  ancho: number
  alto: number
}

/** Espera a que el mapa termine de cargar, pero no más de ESPERA_MAXIMA_MS. */
function esperarMapaCargado(mapa: MapLibreMap) {
  return new Promise<void>((resolver) => {
    const terminar = () => {
      clearTimeout(limite)
      mapa.off('idle', terminar)
      resolver()
    }
    const limite = setTimeout(terminar, ESPERA_MAXIMA_MS)
    mapa.on('idle', terminar)
  })
}

function aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad?: number) {
  return new Promise<Blob>((resolver, rechazar) => {
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo generar la imagen.'))), tipo, calidad)
  })
}

/**
 * Captura el mapa como imagen. Solo sale lo que dibuja el mapa en su lienzo (el mapa base, las zonas,
 * el límite de Manila y los trazos), no los marcadores ni los botones, que son HTML. Los textos también
 * son HTML, así que se dibujan aparte sobre la imagen (ver `dibujarTextos`).
 *
 * El lienzo de un mapa WebGL se borra después de mostrarse, así que se copia dentro del evento
 * `render`, justo después de dibujarlo. Así no hace falta `preserveDrawingBuffer`, que hace más
 * lento el mapa de toda la app.
 */
export async function capturarMapa(mapa: MapLibreMap, textos: Texto[] = []): Promise<Captura> {
  if (!mapa.loaded()) await esperarMapaCargado(mapa)

  const lienzo = mapa.getCanvas()
  const imagenDelMapa = await new Promise<Blob>((resolver, rechazar) => {
    mapa.once('render', () => aBlob(lienzo, 'image/png').then(resolver, rechazar))
    mapa.triggerRepaint()
  })

  const bitmap = await createImageBitmap(imagenDelMapa)
  try {
    let imagen = imagenDelMapa
    let origen: CanvasImageSource = bitmap
    if (textos.length > 0) {
      const completo = document.createElement('canvas')
      completo.width = bitmap.width
      completo.height = bitmap.height
      const contextoCompleto = completo.getContext('2d')
      if (!contextoCompleto) throw new Error('No se pudo generar la imagen.')
      contextoCompleto.drawImage(bitmap, 0, 0)
      // Píxeles de la imagen por cada píxel de pantalla: más de 1 en las pantallas de alta densidad.
      await dibujarTextos(contextoCompleto, mapa, textos, bitmap.width / lienzo.clientWidth)
      imagen = await aBlob(completo, 'image/png')
      origen = completo
    }

    const ancho = Math.min(ANCHO_MINIATURA, bitmap.width)
    const alto = Math.max(1, Math.round((bitmap.height * ancho) / bitmap.width))
    const pequeno = document.createElement('canvas')
    pequeno.width = ancho
    pequeno.height = alto
    const contexto = pequeno.getContext('2d')
    if (!contexto) throw new Error('No se pudo generar la miniatura.')
    contexto.drawImage(origen, 0, 0, ancho, alto)
    return { imagen, miniatura: await aBlob(pequeno, 'image/jpeg', 0.8), ancho: bitmap.width, alto: bitmap.height }
  } finally {
    bitmap.close()
  }
}
