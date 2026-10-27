import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './HojaInferior.css'

interface HojaInferiorProps {
  titulo: string
  children: ReactNode
  acciones?: ReactNode
  onCerrar: () => void
}

/**
 * Panel que sube desde abajo sin tapar todo el mapa: a diferencia de Dialog, no oscurece la
 * pantalla completa, para ver el mapa (y el resultado de ajustar algo, como los filtros) detrás.
 * Tocar fuera o Escape lo cierra.
 */
export function HojaInferior({ titulo, children, acciones, onCerrar }: HojaInferiorProps) {
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return createPortal(
    <div className="hoja-fondo" onClick={onCerrar}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo} onClick={(evento) => evento.stopPropagation()}>
        <div className="hoja-asa" aria-hidden="true" />
        <div className="hoja-header">
          <h2 className="hoja-titulo">{titulo}</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" title="Cerrar" onClick={onCerrar}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="hoja-contenido">{children}</div>
        {acciones && <div className="hoja-acciones">{acciones}</div>}
      </div>
    </div>,
    document.body,
  )
}
