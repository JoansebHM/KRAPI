import type { ChangeEvent, ReactNode } from 'react'
import { Dialog } from '../../components/Dialog'
import { FlechaLista } from '../../components/FlechaLista'
import { ACEPTA_ARCHIVOS, MAX_BYTES } from './archivos'
import { IconoTipoEvidencia } from './IconoTipoEvidencia'

interface AgregarEvidenciaProps {
  onArchivos: (archivos: File[]) => void
  onGrabarAudio: () => void
  onCerrar: () => void
}

/** Elegir cómo agregar una evidencia: con la cámara, con el micrófono o desde los archivos. */
export function AgregarEvidencia({ onArchivos, onGrabarAudio, onCerrar }: AgregarEvidenciaProps) {
  function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = [...(evento.target.files ?? [])]
    evento.target.value = ''
    if (archivos.length > 0) onArchivos(archivos)
  }

  return (
    <Dialog
      titulo="Agregar evidencia"
      onCerrar={onCerrar}
      acciones={
        <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar}>
          Cancelar
        </button>
      }
    >
      <ul className="lista agregar-evidencia">
        <li>
          <Opcion icono={<IconoTipoEvidencia tipo="foto" />} titulo="Tomar foto" detalle="Con la cámara del celular">
            <input type="file" accept="image/*" capture="environment" onChange={alElegir} className="solo-lector" />
          </Opcion>
        </li>
        <li>
          <button type="button" className="lista-item" onClick={onGrabarAudio}>
            <IconoTipoEvidencia tipo="audio" />
            <span className="lista-item-textos">
              <span className="lista-item-titulo">Grabar audio</span>
              <span className="lista-item-detalle">Con el micrófono, sin salir de la app</span>
            </span>
            <FlechaLista />
          </button>
        </li>
        <li>
          <Opcion
            icono={<IconoTipoEvidencia tipo="documento" />}
            titulo="Elegir archivos"
            detalle={`Fotos, audios, PDF, Word o Excel, hasta ${MAX_BYTES / 1024 / 1024} MB cada uno`}
          >
            <input type="file" accept={ACEPTA_ARCHIVOS} multiple onChange={alElegir} className="solo-lector" />
          </Opcion>
        </li>
      </ul>
    </Dialog>
  )
}

/** Opción que abre el selector de archivos: la etiqueta envuelve el campo, así funciona también en iPhone. */
function Opcion({ icono, titulo, detalle, children }: { icono: ReactNode; titulo: string; detalle: string; children: ReactNode }) {
  return (
    <label className="lista-item">
      {icono}
      <span className="lista-item-textos">
        <span className="lista-item-titulo">{titulo}</span>
        <span className="lista-item-detalle">{detalle}</span>
      </span>
      <FlechaLista />
      {children}
    </label>
  )
}
