import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useAgregarVideo } from './api'
import { enlaceDeSharePoint } from './sharepoint'

const MAX_TITULO = 120

interface AgregarVideoProps {
  estudioId: string
  onCerrar: () => void
}

/** Agregar un video de SharePoint pegando su enlace o el código para insertar. */
export function AgregarVideo({ estudioId, onCerrar }: AgregarVideoProps) {
  const [texto, setTexto] = useState('')
  const [titulo, setTitulo] = useState('')
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const agregar = useAgregarVideo()

  const enlace = enlaceDeSharePoint(texto)
  const error = !texto.trim()
    ? 'Pega el enlace del video.'
    : !enlace
      ? 'Por ahora solo se aceptan videos de SharePoint: el enlace empieza por https:// y tiene .sharepoint.com.'
      : null

  async function guardar() {
    setIntentoGuardar(true)
    if (!enlace) return
    try {
      await agregar.mutateAsync({ estudioId, enlace, titulo })
      notificar.exito('Video agregado', { descripcion: 'Se abre en SharePoint al tocarlo.' })
      onCerrar()
    } catch (errorGuardar) {
      notificar.error('No se pudo agregar el video', { descripcion: mensajeErrorDatos(errorGuardar) })
    }
  }

  return (
    <Dialog
      titulo="Video de SharePoint"
      onCerrar={agregar.isPending ? undefined : onCerrar}
      onSubmit={() => void guardar()}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={agregar.isPending}>
            {agregar.isPending ? 'Agregando…' : 'Agregar video'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={agregar.isPending}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">Enlace del video</span>
          <textarea
            className="field-input field-textarea"
            rows={3}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://….sharepoint.com/…"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            aria-invalid={intentoGuardar && error ? true : undefined}
            aria-describedby="video-enlace-ayuda"
          />
          <p id="video-enlace-ayuda" className={intentoGuardar && error ? 'field-error' : 'field-ayuda'}>
            {intentoGuardar && error
              ? error
              : 'En SharePoint o Stream: Compartir → Copiar vínculo. También sirve el código de "Insertar".'}
          </p>
        </label>
        <label className="field">
          <span className="field-label">
            Título<span className="field-opcional"> (opcional)</span>
          </span>
          <input
            className="field-input"
            type="text"
            maxLength={MAX_TITULO}
            placeholder="Ej.: Recorrido por la bodega"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
          />
        </label>
      </div>
    </Dialog>
  )
}
