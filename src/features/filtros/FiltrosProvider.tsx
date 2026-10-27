import { useMemo, useState, type ReactNode } from 'react'
import { FILTROS_VACIOS, type FiltrosMapa } from './api'
import { FiltrosContexto } from './filtrosContexto'

/** Comparte los filtros del mapa entre el botón que los abre y LugaresEnMapa, que los aplica. */
export function FiltrosProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltros] = useState<FiltrosMapa>(FILTROS_VACIOS)
  const valor = useMemo(() => ({ filtros, setFiltros }), [filtros])
  return <FiltrosContexto.Provider value={valor}>{children}</FiltrosContexto.Provider>
}
