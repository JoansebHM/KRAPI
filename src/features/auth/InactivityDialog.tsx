import { Dialog } from '../../components/Dialog'
import { useAuth } from './useAuth'

/** Aviso que aparece un minuto antes de cerrar la sesión por inactividad. */
export function InactivityDialog() {
  const { avisoInactividadSegundos, seguirConectado, cerrarSesion } = useAuth()
  if (avisoInactividadSegundos === null) return null

  return (
    <Dialog
      titulo="¿Sigues ahí?"
      acciones={
        <>
          <button type="button" className="btn btn-primary btn-block" onClick={seguirConectado}>
            Seguir conectado
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </button>
        </>
      }
    >
      <p aria-live="polite">
        La sesión se cerrará en <strong>{avisoInactividadSegundos} s</strong> porque la app no se ha usado en
        casi 2 horas.
      </p>
    </Dialog>
  )
}
