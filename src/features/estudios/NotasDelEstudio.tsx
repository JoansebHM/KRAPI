import { ChevronDown, Copy, NotebookPen, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useAgregarNota } from './api'
import './NotasDelEstudio.css'

/** Los mismos límites que notas_validas() en la base de datos. */
const MAX_NOTAS = 50
const MAX_CARACTERES = 2000

interface NotasDelEstudioProps {
  estudioId: string
  ubicacionId: string
  notas: string[]
}

/**
 * Notas de un estudio en una sección desplegable, porque pueden ser varias. Cada una se puede copiar y,
 * desde aquí, se agregan más sin abrir el formulario (para apuntar mientras se oye un audio o se ven las fotos).
 */
export function NotasDelEstudio({ estudioId, ubicacionId, notas }: NotasDelEstudioProps) {
  const [escribiendo, setEscribiendo] = useState(false)
  const [texto, setTexto] = useState('')
  const agregar = useAgregarNota()
  const hayTexto = texto.trim().length > 0

  function cancelar() {
    setEscribiendo(false)
    setTexto('')
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!hayTexto || agregar.isPending) return
    try {
      await agregar.mutateAsync({ id: estudioId, ubicacionId, nota: texto })
      notificar.exito('Nota agregada')
      cancelar()
    } catch (error) {
      // El texto se conserva para poder reintentar.
      notificar.error('No se pudo guardar la nota', { descripcion: mensajeErrorDatos(error) })
    }
  }

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
      {escribiendo ? (
        <form className="estudio-notas-nueva" onSubmit={(evento) => void guardar(evento)}>
          <textarea
            className="field-input field-textarea"
            aria-label="Nota nueva"
            placeholder="Ej.: El distribuidor pasa los martes."
            rows={3}
            maxLength={MAX_CARACTERES}
            autoFocus
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
          />
          <div className="estudio-notas-nueva-acciones">
            <button type="button" className="btn btn-secondary" onClick={cancelar} disabled={agregar.isPending}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={!hayTexto || agregar.isPending}>
              {agregar.isPending ? 'Guardando…' : 'Guardar nota'}
            </button>
          </div>
        </form>
      ) : (
        notas.length < MAX_NOTAS && (
          <button type="button" className="btn btn-secondary estudio-notas-agregar" onClick={() => setEscribiendo(true)}>
            <Plus size={18} aria-hidden="true" />
            Agregar nota
          </button>
        )
      )}
    </details>
  )
}
