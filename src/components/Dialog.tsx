import { useEffect, useId, useRef, type ReactNode } from 'react'
import './Dialog.css'

interface DialogProps {
  titulo: string
  children: ReactNode
  acciones: ReactNode
  /** Si se pasa, Escape y tocar fuera cierran el diálogo. */
  onCerrar?: () => void
}

/** Diálogo modal accesible. El primer botón de las acciones recibe el foco al abrir. */
export function Dialog({ titulo, children, acciones, onCerrar }: DialogProps) {
  const tituloId = useId()
  const accionesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    accionesRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [])

  useEffect(() => {
    if (!onCerrar) return
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div className="dialog-backdrop" onClick={onCerrar}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id={tituloId} className="dialog-title">
          {titulo}
        </h2>
        <div className="dialog-body">{children}</div>
        <div ref={accionesRef} className="dialog-actions">
          {acciones}
        </div>
      </div>
    </div>
  )
}
