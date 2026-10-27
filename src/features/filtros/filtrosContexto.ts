import { createContext, useContext } from 'react'
import { FILTROS_VACIOS, type FiltrosMapa } from './api'

interface ValorFiltros {
  filtros: FiltrosMapa
  setFiltros: (filtros: FiltrosMapa) => void
}

export const FiltrosContexto = createContext<ValorFiltros>({ filtros: FILTROS_VACIOS, setFiltros: () => {} })

/** Los filtros del mapa: los lee LugaresEnMapa y los cambia el panel de filtros. */
export function useFiltros() {
  return useContext(FiltrosContexto)
}
