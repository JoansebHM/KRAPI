import { Camera, FileSpreadsheet, FileText, Mic, NotebookPen, Video } from 'lucide-react'
import type { TipoEvidencia } from './archivos'
import './Evidencias.css'

const ICONOS = { foto: Camera, audio: Mic, documento: FileText, texto: NotebookPen, video: Video }

/** Ícono redondo del tipo de evidencia. Las hojas de cálculo tienen el suyo. */
export function IconoTipoEvidencia({ tipo, mime }: { tipo: TipoEvidencia; mime?: string }) {
  const Icono = mime?.includes('excel') || mime?.includes('spreadsheet') ? FileSpreadsheet : ICONOS[tipo]
  return (
    <span className={`icono-evidencia icono-evidencia-${tipo}`} aria-hidden="true">
      <Icono size={22} strokeWidth={2} />
    </span>
  )
}
