import { ArrowLeft, Check, Copy } from 'lucide-react'
import { Fragment } from 'react'
import { notificar } from '../../lib/notificar'
import { ELEMENTOS_CONSENTIMIENTO, MARCA_NOMBRE, type Guia } from './guias'

interface VistaAutorizacionProps {
  guia: Guia
  /** Nombre de quien entrevista; si falta, se deja la línea para escribirlo. */
  nombre: string | undefined
  onVolver: () => void
}

/** Dónde empiezan las dos preguntas con las que se pide el permiso (siempre al final del guion). */
const INICIO_DEL_PERMISO = '¿Está de acuerdo'

/** Guion de presentación y consentimiento de la guía activa, con el nombre de quien entrevista ya puesto. */
export function VistaAutorizacion({ guia, nombre, onVolver }: VistaAutorizacionProps) {
  const guion = guia.autorizacion.guion

  async function copiar() {
    try {
      await navigator.clipboard.writeText(guion.map((parrafo) => (nombre ? parrafo.replaceAll(MARCA_NOMBRE, nombre) : parrafo)).join('\n\n'))
      notificar.exito('Guion copiado')
    } catch {
      notificar.error('No se pudo copiar', { descripcion: 'Revisa los permisos del navegador e inténtalo de nuevo.' })
    }
  }

  return (
    <div className="autorizacion">
      <button type="button" className="btn-texto autorizacion-volver" onClick={onVolver}>
        <ArrowLeft size={18} aria-hidden="true" />
        Volver a las preguntas
      </button>
      <h3 className="autorizacion-titulo">Presentación y autorización · {guia.pestana}</h3>

      <div className="autorizacion-guion">
        {guion.map((parrafo, indice) => {
          const esUltimo = indice === guion.length - 1
          const corte = esUltimo ? parrafo.indexOf(INICIO_DEL_PERMISO) : -1
          const antes = corte >= 0 ? parrafo.slice(0, corte) : parrafo
          const permiso = corte >= 0 ? parrafo.slice(corte) : ''
          return (
            <p key={parrafo}>
              <ConNombre texto={antes} nombre={nombre} />
              {permiso && <strong className="autorizacion-permiso">{permiso}</strong>}
            </p>
          )
        })}
      </div>
      <p className="autorizacion-recordatorio">La autorización para grabar audio y la de tomar fotos se piden por separado.</p>
      <button type="button" className="btn btn-secondary autorizacion-copiar" onClick={() => void copiar()}>
        <Copy size={18} aria-hidden="true" />
        Copiar guion
      </button>

      <section className="autorizacion-seccion">
        <h4 className="pregunta-subtitulo">Debe quedar claro</h4>
        <ul className="autorizacion-checks">
          {ELEMENTOS_CONSENTIMIENTO.map((elemento) => (
            <li key={elemento}>
              <Check size={18} className="autorizacion-check" aria-hidden="true" />
              <span>{elemento}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="autorizacion-seccion">
        <h4 className="pregunta-subtitulo">Para este actor</h4>
        <ul className="autorizacion-notas">
          {guia.autorizacion.notas.map((nota) => (
            <li key={nota}>{nota}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** Cambia cada «______» del guion por el nombre, resaltado. */
function ConNombre({ texto, nombre }: { texto: string; nombre: string | undefined }) {
  if (!nombre) return <>{texto}</>
  const partes = texto.split(MARCA_NOMBRE)
  return (
    <>
      {partes.map((parte, indice) => (
        <Fragment key={indice}>
          {indice > 0 && <mark className="autorizacion-nombre">{nombre}</mark>}
          {parte}
        </Fragment>
      ))}
    </>
  )
}
