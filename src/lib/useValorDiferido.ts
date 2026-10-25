import { useEffect, useState } from 'react'

/** Devuelve el valor cuando lleva `ms` sin cambiar. Sirve para no consultar con cada tecla. */
export function useValorDiferido<T>(valor: T, ms: number) {
  const [diferido, setDiferido] = useState(valor)
  useEffect(() => {
    const espera = window.setTimeout(() => setDiferido(valor), ms)
    return () => window.clearTimeout(espera)
  }, [valor, ms])
  return diferido
}
