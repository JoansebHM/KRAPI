import { useMemo, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { compararTexto, plural } from '../../lib/texto'
import { useEsAngosto } from '../../lib/useEsAngosto'
import { useEsEscritorio } from '../../lib/useEsEscritorio'
import { useAuth } from '../auth/useAuth'
import { Avatar } from '../usuarios/Avatar'
import { semillaDe, useUsuarios } from '../usuarios/api'
import { usePresencia } from './usePresencia'
import './UsuariosEnLinea.css'

/** Cuántos avatares caben en la barra superior según el ancho de la pantalla. */
const MAX_COMPUTADOR = 4
const MAX_CELULAR = 2
const MAX_ANGOSTO = 1

/**
 * Las otras cuentas en línea, como los colaboradores de un documento compartido: avatares en la
 * barra superior y, al tocarlos, un modal con quiénes son (decisión 0036). Si no hay nadie más, no
 * se muestra nada.
 */
export function UsuariosEnLinea() {
  const { perfil } = useAuth()
  const { enLinea } = usePresencia()
  const { data: cuentas } = useUsuarios()
  const esEscritorio = useEsEscritorio()
  const esAngosto = useEsAngosto()
  const [abierto, setAbierto] = useState(false)

  // Yo primero y luego por nombre. Una cuenta que aún no se cargó no se muestra.
  const personas = useMemo(() => {
    const ids = new Set(enLinea)
    return (cuentas ?? [])
      .filter((cuenta) => ids.has(cuenta.id))
      .sort((a, b) => Number(b.id === perfil?.id) - Number(a.id === perfil?.id) || compararTexto(a.nombre, b.nombre))
  }, [cuentas, enLinea, perfil?.id])
  const otras = personas.filter((persona) => persona.id !== perfil?.id)

  const maximo = esEscritorio ? MAX_COMPUTADOR : esAngosto ? MAX_ANGOSTO : MAX_CELULAR
  const visibles = otras.slice(0, maximo)
  const ocultas = otras.length - visibles.length

  return (
    <>
      {otras.length > 0 && (
        <button
          type="button"
          className="en-linea"
          aria-haspopup="dialog"
          aria-label={`${plural(otras.length, 'persona más', 'personas más')} en línea. Ver quiénes son`}
          title="En línea ahora"
          onClick={() => setAbierto(true)}
        >
          {visibles.map((persona) => (
            <span key={persona.id} className="en-linea-avatar">
              <Avatar semilla={semillaDe(persona)} tamano={28} />
            </span>
          ))}
          {ocultas > 0 && <span className="en-linea-mas">+{ocultas}</span>}
        </button>
      )}

      {abierto && (
        <Dialog
          titulo="En línea ahora"
          onCerrar={() => setAbierto(false)}
          acciones={
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setAbierto(false)}>
              Cerrar
            </button>
          }
        >
          <p className="en-linea-resumen" aria-live="polite">
            {personas.length === 0 ? 'Nadie tiene KIRA abierta ahora.' : `${plural(personas.length, 'persona tiene', 'personas tienen')} KIRA abierta ahora.`}
          </p>
          <ul className="en-linea-lista">
            {personas.map((persona) => (
              <li key={persona.id} className="en-linea-fila">
                <Avatar semilla={semillaDe(persona)} tamano={40} />
                <span className="en-linea-quien">
                  <span className="en-linea-nombre">{persona.nombre}</span>
                  <span className="en-linea-usuario">
                    {persona.usuario}
                    {persona.rol === 'admin' && ' - admin'}
                  </span>
                </span>
                {persona.id === perfil?.id && <span className="en-linea-tu">Tú</span>}
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </>
  )
}
