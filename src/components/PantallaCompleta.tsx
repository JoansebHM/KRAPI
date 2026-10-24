import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './PantallaCompleta.css'

interface PantallaCompletaProps {
  titulo: string
  /** Texto pequeño junto al título, por ejemplo "2 de 5". */
  detalle?: string
  onCerrar: () => void
  /** Acciones en la barra superior, junto a "Cerrar" (por ejemplo, "Descargar"). */
  acciones?: ReactNode
  children: ReactNode
}

/**
 * Visor a pantalla completa sobre fondo oscuro (fotos ampliadas, PDF). Se dibuja en <body>
 * por encima de los diálogos. Escape lo cierra sin cerrar el diálogo que lo abrió.
 */
export function PantallaCompleta({ titulo, detalle, onCerrar, acciones, children }: PantallaCompletaProps) {
  const tituloId = useId()
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    cerrarRef.current?.focus()
    return () => anterior?.focus()
  }, [])

  useEffect(() => {
    // En fase de captura, para atenderlo antes que el diálogo de abajo y que no se cierre también.
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return
      evento.stopPropagation()
      onCerrar()
    }
    window.addEventListener('keydown', alPresionar, true)
    return () => window.removeEventListener('keydown', alPresionar, true)
  }, [onCerrar])

  return createPortal(
    <div className="pantalla-completa" role="dialog" aria-modal="true" aria-labelledby={tituloId}>
      <header className="pantalla-completa-barra">
        <div className="pantalla-completa-titulos">
          <h2 id={tituloId} className="pantalla-completa-titulo">
            {titulo}
          </h2>
          {detalle && <p className="pantalla-completa-detalle">{detalle}</p>}
        </div>
        {acciones}
        <button ref={cerrarRef} type="button" className="pantalla-completa-boton" aria-label="Cerrar" title="Cerrar" onClick={onCerrar}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className="pantalla-completa-contenido">{children}</div>
    </div>,
    document.body,
  )
}
