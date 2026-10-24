import { Dialog } from '../../components/Dialog'
import { notificar } from '../../lib/notificar'
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
          <button type="button" className="btn btn-primary btn-block" onClick={() => {
              seguirConectado()
              notificar.info('Sigues conectado')
            }}>
            Seguir conectado
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </button>
        </>
      }
    >
      <p aria-live="polite">
        La sesión se cerrará en <strong>{avisoInactividadSegundos} s</strong> porque se detectó inactividad.
      </p>
    </Dialog>
  )
}
