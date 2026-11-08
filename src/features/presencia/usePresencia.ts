import { useContext } from 'react'
import { PresenciaContext } from './PresenciaContext'

export function usePresencia() {
  const valor = useContext(PresenciaContext)
  if (!valor) throw new Error('usePresencia debe usarse dentro de PresenciaProvider')
  return valor
}
