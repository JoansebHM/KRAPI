import { useSyncExternalStore } from 'react'

/** Celulares muy angostos (menos de 360 px), donde la barra superior no tiene espacio para más de un avatar. */
const CONSULTA_ANGOSTO = '(max-width: 359px)'

function suscribir(avisar: () => void) {
  const media = window.matchMedia(CONSULTA_ANGOSTO)
  media.addEventListener('change', avisar)
  return () => media.removeEventListener('change', avisar)
}

/** Si la pantalla mide menos de 360 px. Cambia al girar el celular o redimensionar la ventana. */
export function useEsAngosto() {
  return useSyncExternalStore(suscribir, () => window.matchMedia(CONSULTA_ANGOSTO).matches)
}
