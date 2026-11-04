import { KI_RESTO, KI_TALLO, KI_VISTA } from './marcaKi'
import './MarcaKira.css'

/**
 * El nombre "KIRA" con las letras KI del logo de Kratos Innovation Team y "RA" en texto normal.
 * Hereda el tamaño y la tipografía del elemento donde se use. Para lectores de pantalla se lee "KIRA".
 */
export function MarcaKira({ className }: { className?: string }) {
  return (
    <span className={`marca-kira${className ? ` ${className}` : ''}`} role="img" aria-label="KIRA">
      <svg className="marca-kira-ki" viewBox={KI_VISTA} aria-hidden="true" focusable="false">
        <path className="marca-kira-tallo" d={KI_TALLO} />
        <path className="marca-kira-resto" d={KI_RESTO} />
      </svg>
      <span aria-hidden="true">RA</span>
    </span>
  )
}
