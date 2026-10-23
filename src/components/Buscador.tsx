import './Buscador.css'

interface BuscadorProps {
  valor: string
  onCambiar: (valor: string) => void
  placeholder: string
}

/** Campo de búsqueda con ícono y botón para limpiar. */
export function Buscador({ valor, onCambiar, placeholder }: BuscadorProps) {
  return (
    <div className="buscador">
      <svg className="buscador-icono" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        className="field-input buscador-input"
        type="search"
        enterKeyHint="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
      />
      {valor && (
        <button type="button" className="buscador-limpiar" aria-label="Limpiar búsqueda" onClick={() => onCambiar('')}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  )
}
