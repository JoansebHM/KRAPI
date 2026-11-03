import { createContext, useContext } from 'react'
import { FILTROS_VACIOS, type FiltrosMapa } from './api'

interface ValorFiltros {
  filtros: FiltrosMapa
  setFiltros: (filtros: FiltrosMapa) => void
  /** Mostrar los nombres de los locales que trae el mapa base. No es un filtro de datos: no cuenta ni se limpia con "Limpiar filtros". */
  mostrarLocalesMapa: boolean
  setMostrarLocalesMapa: (mostrar: boolean) => void
}

export const FiltrosContexto = createContext<ValorFiltros>({
  filtros: FILTROS_VACIOS,
  setFiltros: () => {},
  mostrarLocalesMapa: false,
  setMostrarLocalesMapa: () => {},
})

/** Los filtros del mapa: los lee LugaresEnMapa y los cambia el panel de filtros. */
export function useFiltros() {
  return useContext(FiltrosContexto)
}
