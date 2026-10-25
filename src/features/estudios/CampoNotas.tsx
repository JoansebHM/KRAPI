import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

/** Los mismos límites que notas_validas() en la base de datos. */
const MAX_NOTAS = 50
const MAX_CARACTERES = 2000

interface CampoNotasProps {
  notas: string[]
  onCambiar: (notas: string[]) => void
}

/** Notas de un estudio: se agregan y se borran una por una. Las vacías no se guardan. */
export function CampoNotas({ notas, onCambiar }: CampoNotasProps) {
  const lista = useRef<HTMLOListElement>(null)
  const cantidadAnterior = useRef(notas.length)

  // Al agregar una nota, se enfoca su campo para escribir de una vez.
  useEffect(() => {
    if (notas.length > cantidadAnterior.current) lista.current?.querySelector<HTMLTextAreaElement>('li:last-child textarea')?.focus()
    cantidadAnterior.current = notas.length
  }, [notas.length])

  const cambiar = (indice: number, texto: string) => onCambiar(notas.map((nota, i) => (i === indice ? texto : nota)))
  const borrar = (indice: number) => onCambiar(notas.filter((_, i) => i !== indice))

  return (
    <fieldset className="field campo-notas">
      <legend className="field-label">
        Notas<span className="field-opcional"> (opcional)</span>
      </legend>
      {notas.length === 0 ? (
        <p className="field-ayuda">Apuntes de la visita: lo que se observó o se dijo. Agrega todas las que necesites.</p>
      ) : (
        <ol className="campo-notas-lista" ref={lista}>
          {notas.map((nota, indice) => (
            <li key={indice} className="campo-notas-item">
              <textarea
                className="field-input field-textarea"
                aria-label={`Nota ${indice + 1}`}
                placeholder="Ej.: El distribuidor pasa los martes."
                rows={2}
                maxLength={MAX_CARACTERES}
                value={nota}
                onChange={(evento) => cambiar(indice, evento.target.value)}
              />
              <button type="button" className="icon-btn campo-notas-borrar" aria-label={`Borrar nota ${indice + 1}`} onClick={() => borrar(indice)}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}
      {notas.length < MAX_NOTAS && (
        <button type="button" className="btn btn-secondary campo-notas-agregar" onClick={() => onCambiar([...notas, ''])}>
          <Plus size={18} aria-hidden="true" />
          Agregar nota
        </button>
      )}
    </fieldset>
  )
}
