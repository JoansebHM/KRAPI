import { useSyncExternalStore } from 'react'

/** Desde este ancho las secciones se abren en un panel lateral y el menú queda fijo (ver Panel.css). */
const CONSULTA_ESCRITORIO = '(min-width: 900px)'

function suscribir(avisar: () => void) {
  const media = window.matchMedia(CONSULTA_ESCRITORIO)
  media.addEventListener('change', avisar)
  return () => media.removeEventListener('change', avisar)
}

/** Si la pantalla es de computador (900 px o más). Cambia al redimensionar la ventana. */
export function useEsEscritorio() {
  return useSyncExternalStore(suscribir, () => window.matchMedia(CONSULTA_ESCRITORIO).matches)
}
