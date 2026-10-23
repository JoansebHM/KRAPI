import { Toaster } from 'sonner'
import type { Theme } from '../features/theme/useTheme'
import './Notificaciones.css'

/** Contenedor de las notificaciones. Va una sola vez en la app. */
export function Notificaciones({ theme }: { theme: Theme }) {
  return (
    <Toaster
      theme={theme}
      position="top-center"
      // Debajo de la barra superior, para no tapar el menú ni los controles del mapa.
      offset={{ top: 76 }}
      mobileOffset={{ top: 72, left: 12, right: 12 }}
      visibleToasts={3}
      gap={10}
      closeButton
      icons={{
        success: <IconoExito />,
        error: <IconoError />,
        info: <IconoInfo />,
        warning: <IconoAviso />,
        close: <IconoCerrar />,
      }}
      toastOptions={{
        closeButtonAriaLabel: 'Cerrar notificación',
        classNames: {
          toast: 'noti',
          title: 'noti-titulo',
          description: 'noti-descripcion',
          actionButton: 'noti-accion',
          closeButton: 'noti-cerrar',
          success: 'noti-exito',
          error: 'noti-error',
          info: 'noti-info',
          warning: 'noti-aviso',
          loading: 'noti-cargando',
        },
      }}
    />
  )
}

const props = {
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function IconoExito() {
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </svg>
  )
}

function IconoError() {
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  )
}

function IconoInfo() {
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v5.5M12 7.5h.01" />
    </svg>
  )
}

function IconoAviso() {
  return (
    <svg {...props}>
      <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4.5M12 17h.01" />
    </svg>
  )
}

function IconoCerrar() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
