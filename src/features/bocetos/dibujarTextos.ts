import type { Map as MapLibreMap } from '../map/maplibre'
import { BORDE_TEXTO_PX, FAMILIA_TEXTO, INTERLINEADO_TEXTO, type Texto } from './trazos'

/** Cuánto se espera a que cargue la tipografía antes de dibujar igual con la que haya. */
const ESPERA_TIPOGRAFIA_MS = 2000

async function esperarTipografia() {
  try {
    await Promise.race([document.fonts.load(`700 20px ${FAMILIA_TEXTO}`), new Promise((resolver) => setTimeout(resolver, ESPERA_TIPOGRAFIA_MS))])
  } catch {
    // Sin la tipografía de la app se dibuja con la del sistema.
  }
}

/**
 * Dibuja los textos sobre la imagen del mapa. El HTML de la pizarra no sale en el lienzo del mapa,
 * así que al guardar se vuelve a dibujar cada texto aquí, con la misma tipografía, tamaño, color,
 * borde blanco y giro que se ven en pantalla (ver `.pizarra-texto` en Pizarra.css).
 *
 * `escala` son los píxeles de la imagen por cada píxel de pantalla (más de 1 en pantallas de alta densidad).
 */
export async function dibujarTextos(contexto: CanvasRenderingContext2D, mapa: MapLibreMap, textos: Texto[], escala: number) {
  if (textos.length === 0) return
  await esperarTipografia()
  const rumbo = mapa.getBearing()

  for (const { posicion, texto, color, tamano, giro } of textos) {
    const { x, y } = mapa.project(posicion)
    const lineas = texto.split('\n')
    const interlineado = tamano * INTERLINEADO_TEXTO * escala

    contexto.save()
    contexto.translate(x * escala, y * escala)
    // En pantalla el texto gira lo suyo menos lo que haya girado el mapa, porque está pegado a él.
    contexto.rotate(((giro - rumbo) * Math.PI) / 180)
    contexto.font = `700 ${tamano * escala}px ${FAMILIA_TEXTO}`
    contexto.textAlign = 'center'
    contexto.textBaseline = 'middle'
    contexto.lineJoin = 'round'
    contexto.lineWidth = BORDE_TEXTO_PX * escala
    contexto.strokeStyle = '#ffffff'
    contexto.fillStyle = color
    const alto = (indice: number) => (indice - (lineas.length - 1) / 2) * interlineado
    // Primero todos los bordes y después todas las letras, para que el borde de una línea no tape la de arriba.
    lineas.forEach((linea, indice) => contexto.strokeText(linea, 0, alto(indice)))
    lineas.forEach((linea, indice) => contexto.fillText(linea, 0, alto(indice)))
    contexto.restore()
  }
}
