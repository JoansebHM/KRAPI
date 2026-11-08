import { createContext } from 'react'

export interface PresenciaContextValue {
  /** Ids de las cuentas en línea ahora, incluida la propia cuando está visible. */
  enLinea: string[]
}

export const PresenciaContext = createContext<PresenciaContextValue | null>(null)
