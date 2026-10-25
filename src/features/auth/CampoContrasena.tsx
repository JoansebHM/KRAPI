import { useState } from 'react'
import './CampoContrasena.css'

interface CampoContrasenaProps {
  id: string
  etiqueta: string
  valor: string
  onCambiar: (valor: string) => void
  /** current-password al entrar; new-password al crearla o cambiarla. */
  autoComplete: 'current-password' | 'new-password'
  placeholder?: string
  error?: string | null
  /** Texto de ayuda debajo del campo cuando no hay error. */
  ayuda?: string
}

/** Campo de contraseña con el botón "Mostrar" / "Ocultar". */
export function CampoContrasena({ id, etiqueta, valor, onCambiar, autoComplete, placeholder, error, ayuda }: CampoContrasenaProps) {
  const [ver, setVer] = useState(false)
  const idAyuda = `${id}-ayuda`
  const textoAyuda = error ?? ayuda

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {etiqueta}
      </label>
      <div className="campo-contrasena">
        <input
          id={id}
          className="field-input"
          type={ver ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          required
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={textoAyuda ? idAyuda : undefined}
        />
        <button
          type="button"
          className="campo-contrasena-mostrar"
          onClick={() => setVer((valorActual) => !valorActual)}
          aria-label={ver ? `Ocultar ${etiqueta.toLowerCase()}` : `Mostrar ${etiqueta.toLowerCase()}`}
          aria-pressed={ver}
        >
          {ver ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {textoAyuda && (
        <p id={idAyuda} className={error ? 'field-error' : 'field-ayuda'}>
          {textoAyuda}
        </p>
      )}
    </div>
  )
}
