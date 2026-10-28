import { Download, Trash2 } from 'lucide-react'
import { PantallaCompleta } from '../../components/PantallaCompleta'
import { enlaceDescarga } from '../../lib/almacenamiento'
import { mostrarFechaDe } from '../estudios/campos'
import { useNombreDeCuenta } from '../usuarios/api'
import { useEnlaceDeImagen, type Boceto } from './api'
import './Bocetos.css'

interface VerBocetoProps {
  boceto: Boceto
  /** Quién puede borrarlo: su autor o un admin. */
  puedeBorrar: boolean
  onBorrar: () => void
  onCerrar: () => void
}

/** Un boceto en grande, con su descripción y las opciones de descargarlo o borrarlo. */
export function VerBoceto({ boceto, puedeBorrar, onBorrar, onCerrar }: VerBocetoProps) {
  const { data: enlace, isPending } = useEnlaceDeImagen(boceto.imagenPath)
  const nombreDe = useNombreDeCuenta()
  const autor = nombreDe(boceto.creadoPor)

  return (
    <PantallaCompleta
      titulo={boceto.titulo}
      detalle={[autor, mostrarFechaDe(boceto.creadoEn)].filter(Boolean).join(' · ')}
      onCerrar={onCerrar}
      acciones={
        <>
          {enlace && (
            <a className="pantalla-completa-boton" href={enlaceDescarga(enlace, `${boceto.titulo}.png`)} aria-label="Descargar boceto" title="Descargar">
              <Download size={20} aria-hidden="true" />
            </a>
          )}
          {puedeBorrar && (
            <button type="button" className="pantalla-completa-boton" aria-label="Borrar boceto" title="Borrar" onClick={onBorrar}>
              <Trash2 size={20} aria-hidden="true" />
            </button>
          )}
        </>
      }
    >
      <div className="boceto-visor">
        <div className="boceto-visor-imagen">
          {enlace ? (
            <img src={enlace} alt={`Boceto «${boceto.titulo}»`} />
          ) : (
            <p role="status">{isPending ? 'Cargando…' : 'No se pudo abrir la imagen.'}</p>
          )}
        </div>
        {boceto.descripcion && <p className="boceto-visor-descripcion">{boceto.descripcion}</p>}
      </div>
    </PantallaCompleta>
  )
}
