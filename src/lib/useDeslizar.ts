import { useRef, type PointerEvent } from 'react'

/** Distancia mínima (px) para contar como deslizamiento, y cuánto más horizontal que vertical debe ser. */
const DISTANCIA_MINIMA = 40
const PROPORCION_HORIZONTAL = 1.5

/**
 * Deslizar con el dedo (o arrastrar con el ratón) hacia los lados: a la izquierda llama a `alSiguiente`
 * y a la derecha a `alAnterior`. Devuelve los manejadores para poner en el elemento; ese elemento debe tener
 * `touch-action: pan-y` para que el movimiento vertical siga desplazando la página.
 */
export function useDeslizar(alSiguiente: () => void, alAnterior: () => void) {
  const inicio = useRef<{ x: number; y: number; id: number } | null>(null)

  return {
    onPointerDown(evento: PointerEvent) {
      if (evento.pointerType === 'mouse' && evento.button !== 0) return
      inicio.current = { x: evento.clientX, y: evento.clientY, id: evento.pointerId }
    },
    onPointerUp(evento: PointerEvent) {
      const punto = inicio.current
      inicio.current = null
      if (!punto || punto.id !== evento.pointerId) return
      const dx = evento.clientX - punto.x
      const dy = evento.clientY - punto.y
      if (Math.abs(dx) < DISTANCIA_MINIMA || Math.abs(dx) < Math.abs(dy) * PROPORCION_HORIZONTAL) return
      if (dx < 0) alSiguiente()
      else alAnterior()
    },
    // El navegador toma el gesto (por ejemplo, un desplazamiento vertical): no es un deslizamiento nuestro.
    onPointerCancel() {
      inicio.current = null
    },
  }
}
