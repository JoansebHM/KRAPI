import { ChevronDown, Copy, NotebookPen } from 'lucide-react'
import { notificar } from '../../lib/notificar'
import './NotasDelEstudio.css'

/** Notas de un estudio en una sección desplegable, porque pueden ser varias. Cada una se puede copiar. */
export function NotasDelEstudio({ notas }: { notas: string[] }) {
  if (notas.length === 0) return null

  async function copiar(nota: string) {
    try {
      await navigator.clipboard.writeText(nota)
      notificar.exito('Nota copiada')
    } catch {
      notificar.error('No se pudo copiar', { descripcion: 'Revisa los permisos del navegador e inténtalo de nuevo.' })
    }
  }

  return (
    <details className="estudio-notas">
      <summary className="estudio-notas-resumen">
        <span className="estudio-notas-icono" aria-hidden="true">
          <NotebookPen size={20} />
        </span>
        Notas
        <span className="estudio-notas-cantidad">{notas.length}</span>
        <ChevronDown className="estudio-notas-flecha" size={20} aria-hidden="true" />
      </summary>
      <ol className="estudio-notas-lista">
        {notas.map((nota, indice) => (
          <li key={indice} className="estudio-notas-item">
            <p className="estudio-notas-texto">{nota}</p>
            <button type="button" className="icon-btn" aria-label={`Copiar nota ${indice + 1}`} title="Copiar" onClick={() => void copiar(nota)}>
              <Copy size={18} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </details>
  )
}
