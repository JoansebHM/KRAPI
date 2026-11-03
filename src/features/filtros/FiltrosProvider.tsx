import { useMemo, useState, type ReactNode } from 'react'
import { guardarMostrarLocales, leerMostrarLocales } from '../map/vistas'
import { FILTROS_VACIOS, type FiltrosMapa } from './api'
import { FiltrosContexto } from './filtrosContexto'

/** Comparte los filtros del mapa entre el botón que los abre y LugaresEnMapa, que los aplica. */
export function FiltrosProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltros] = useState<FiltrosMapa>(FILTROS_VACIOS)
  const [mostrarLocalesMapa, setMostrarLocales] = useState(leerMostrarLocales)
  const valor = useMemo(
    () => ({
      filtros,
      setFiltros,
      mostrarLocalesMapa,
      setMostrarLocalesMapa: (mostrar: boolean) => {
        setMostrarLocales(mostrar)
        guardarMostrarLocales(mostrar)
      },
    }),
    [filtros, mostrarLocalesMapa],
  )
  return <FiltrosContexto.Provider value={valor}>{children}</FiltrosContexto.Provider>
}
