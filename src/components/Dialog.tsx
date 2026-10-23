import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import './Dialog.css'

interface DialogProps {
  titulo: string
  children: ReactNode
  acciones: ReactNode
  /** Si se pasa, Escape y tocar fuera cierran el diálogo. */
  onCerrar?: () => void
  /** Si se pasa, el diálogo es un formulario y Enter lo envía. */
  onSubmit?: (evento: FormEvent<HTMLFormElement>) => void
}

/**
 * Diálogo modal accesible. Al abrir, enfoca el primer campo del formulario
 * (o el elemento marcado con data-autofocus) y, si no hay, el primer botón de las acciones.
 */
export function Dialog({ titulo, children, acciones, onCerrar, onSubmit }: DialogProps) {
  const tituloId = useId()
  const contenedorRef = useRef<HTMLFormElement & HTMLDivElement>(null)

  useEffect(() => {
    const contenedor = contenedorRef.current
    const destino =
      contenedor?.querySelector<HTMLElement>('[data-autofocus]') ??
      contenedor?.querySelector<HTMLElement>('.dialog-body input, .dialog-body textarea') ??
      contenedor?.querySelector<HTMLElement>('.dialog-actions button')
    destino?.focus()
  }, [])

  useEffect(() => {
    if (!onCerrar) return
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  const contenido = (
    <>
      <h2 id={tituloId} className="dialog-title">
        {titulo}
      </h2>
      <div className="dialog-body">{children}</div>
      <div className="dialog-actions">{acciones}</div>
    </>
  )

  const comunes = {
    ref: contenedorRef,
    className: 'dialog',
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': tituloId,
    onClick: (evento: React.MouseEvent) => evento.stopPropagation(),
  } as const

  return (
    <div className="dialog-backdrop" onClick={onCerrar}>
      {onSubmit ? (
        <form
          {...comunes}
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault()
            onSubmit(evento)
          }}
        >
          {contenido}
        </form>
      ) : (
        <div {...comunes}>{contenido}</div>
      )}
    </div>
  )
}
