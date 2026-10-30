import { Download, Eye, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import '../../components/ImagenConCarga.css'
import { PantallaCompleta } from '../../components/PantallaCompleta'
import { enlaceDescarga } from '../../lib/almacenamiento'
import type { Evidencia } from './api'
import { mostrarTamano, NOMBRE_TIPO } from './archivos'
import './VisorDocumento.css'

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ESCALAS = [1, 1.5, 2, 3]

type Vista = 'pdf' | 'docx'

/** Cómo se previsualiza un documento: PDF y Word moderno (.docx). Los demás solo se descargan. */
function vistaDe(evidencia: Evidencia): Vista | null {
  if (evidencia.tipo !== 'documento' || !evidencia.archivo || !evidencia.enlace) return null
  if (evidencia.archivo.mime === 'application/pdf') return 'pdf'
  if (evidencia.archivo.mime === MIME_DOCX) return 'docx'
  return null
}

const nombreDe = (evidencia: Evidencia) => evidencia.titulo ?? evidencia.archivo?.nombre ?? NOMBRE_TIPO[evidencia.tipo]

/** Botón "Ver" de un documento que se puede previsualizar; abre el visor a pantalla completa. */
export function BotonVerDocumento({ evidencia, variante }: { evidencia: Evidencia; variante: 'icono' | 'enlace' }) {
  const [abierto, setAbierto] = useState(false)
  if (!vistaDe(evidencia)) return null

  return (
    <>
      {variante === 'icono' ? (
        <button type="button" className="evidencia-accion" aria-label={`Ver «${nombreDe(evidencia)}»`} title="Ver" onClick={() => setAbierto(true)}>
          <Eye size={20} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className="estudio-evidencia-video" onClick={() => setAbierto(true)}>
          <Eye size={16} aria-hidden="true" />
          Ver documento
        </button>
      )}
      {abierto && <VisorDocumento evidencia={evidencia} onCerrar={() => setAbierto(false)} />}
    </>
  )
}

function VisorDocumento({ evidencia, onCerrar }: { evidencia: Evidencia; onCerrar: () => void }) {
  const vista = vistaDe(evidencia)
  const [escala, setEscala] = useState(1)
  const { datos, error } = useArchivo(evidencia.enlace)
  const indice = ESCALAS.indexOf(escala)

  return (
    <PantallaCompleta
      titulo={nombreDe(evidencia)}
      detalle={evidencia.archivo ? mostrarTamano(evidencia.archivo.bytes) : undefined}
      onCerrar={onCerrar}
      acciones={
        <>
          {vista === 'pdf' && (
            <>
              <button type="button" className="pantalla-completa-boton" aria-label="Alejar" title="Alejar" disabled={indice <= 0} onClick={() => setEscala(ESCALAS[indice - 1])}>
                <ZoomOut size={20} aria-hidden="true" />
              </button>
              <button type="button" className="pantalla-completa-boton" aria-label="Acercar" title="Acercar" disabled={indice >= ESCALAS.length - 1} onClick={() => setEscala(ESCALAS[indice + 1])}>
                <ZoomIn size={20} aria-hidden="true" />
              </button>
            </>
          )}
          {evidencia.archivo && evidencia.enlace && (
            <a className="pantalla-completa-boton" href={enlaceDescarga(evidencia.enlace, evidencia.archivo.nombre)} aria-label="Descargar documento" title="Descargar">
              <Download size={20} aria-hidden="true" />
            </a>
          )}
        </>
      }
    >
      <div className="visor-documento">
        {error ? (
          <p className="visor-documento-estado" role="alert">
            No se pudo abrir este documento. Puedes descargarlo con el botón de arriba.
          </p>
        ) : !datos ? (
          <span className="imagen-cargando" role="status" aria-label="Cargando documento" />
        ) : vista === 'pdf' ? (
          <VistaPdf datos={datos} escala={escala} />
        ) : (
          <VistaWord datos={datos} />
        )}
      </div>
    </PantallaCompleta>
  )
}

/** Descarga el archivo a memoria. */
function useArchivo(enlace: string | null) {
  const [estado, setEstado] = useState<{ datos: ArrayBuffer | null; error: boolean }>({ datos: null, error: false })

  useEffect(() => {
    if (!enlace) return
    const control = new AbortController()
    fetch(enlace, { signal: control.signal })
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(String(respuesta.status))
        return respuesta.arrayBuffer()
      })
      .then((datos) => setEstado({ datos, error: false }))
      .catch((falla) => {
        if (!control.signal.aborted) setEstado({ datos: null, error: Boolean(falla) })
      })
    return () => control.abort()
  }, [enlace])

  return estado
}

type DocumentoPdf = import('pdfjs-dist/legacy/build/pdf.mjs').PDFDocumentProxy

/** El PDF, página por página en un canvas; cada página se dibuja cuando se acerca a la pantalla. */
function VistaPdf({ datos, escala }: { datos: ArrayBuffer; escala: number }) {
  const [documento, setDocumento] = useState<DocumentoPdf | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelado = false
    let tarea: { destroy: () => Promise<void> } | null = null
    void (async () => {
      try {
        const [pdfjs, trabajador] = await Promise.all([
          import('pdfjs-dist/legacy/build/pdf.mjs'),
          import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
        ])
        pdfjs.GlobalWorkerOptions.workerSrc = trabajador.default
        // pdf.js se queda con el buffer que recibe, así que se le pasa una copia.
        const carga = pdfjs.getDocument({ data: new Uint8Array(datos.slice(0)) })
        tarea = carga
        const abierto = await carga.promise
        if (!cancelado) setDocumento(abierto)
      } catch {
        if (!cancelado) setError(true)
      }
    })()
    return () => {
      cancelado = true
      void tarea?.destroy()
    }
  }, [datos])

  if (error) {
    return (
      <p className="visor-documento-estado" role="alert">
        No se pudo abrir este PDF. Puedes descargarlo con el botón de arriba.
      </p>
    )
  }
  if (!documento) return <span className="imagen-cargando" role="status" aria-label="Cargando documento" />

  return (
    <div className="visor-pdf">
      <div className="visor-pdf-paginas" style={{ width: `${escala * 100}%` }}>
        {Array.from({ length: documento.numPages }, (_, i) => (
          <PaginaPdf key={`${i}-${escala}`} documento={documento} numero={i + 1} />
        ))}
      </div>
    </div>
  )
}

function PaginaPdf({ documento, numero }: { documento: DocumentoPdf; numero: number }) {
  const marco = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [proporcion, setProporcion] = useState(1.414)

  useEffect(() => {
    const elemento = marco.current
    if (!elemento) return
    const observador = new IntersectionObserver(([entrada]) => entrada?.isIntersecting && setVisible(true), { rootMargin: '600px 0px' })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !marco.current || !lienzo.current) return
    let tarea: { cancel: () => void; promise: Promise<unknown> } | null = null
    let cancelado = false
    void (async () => {
      try {
        const pagina = await documento.getPage(numero)
        if (cancelado || !marco.current || !lienzo.current) return
        const base = pagina.getViewport({ scale: 1 })
        setProporcion(base.height / base.width)
        const ancho = marco.current.clientWidth * Math.min(window.devicePixelRatio || 1, 2)
        const viewport = pagina.getViewport({ scale: ancho / base.width })
        lienzo.current.width = Math.floor(viewport.width)
        lienzo.current.height = Math.floor(viewport.height)
        tarea = pagina.render({ canvas: lienzo.current, viewport })
        await tarea.promise
      } catch {
        // Una página que no se dibuja se queda en blanco; el resto sigue.
      }
    })()
    return () => {
      cancelado = true
      tarea?.cancel()
    }
  }, [visible, documento, numero])

  return (
    <div ref={marco} className="visor-pdf-pagina" style={{ aspectRatio: `1 / ${proporcion}` }}>
      <canvas ref={lienzo} aria-label={`Página ${numero} de ${documento.numPages}`} role="img" />
    </div>
  )
}

/** El Word convertido a HTML (vista aproximada). Se sanea antes de mostrarlo: el archivo lo subió una persona. */
function VistaWord({ datos }: { datos: ArrayBuffer }) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelado = false
    void (async () => {
      try {
        const [mammoth, { default: DOMPurify }] = await Promise.all([import('mammoth'), import('dompurify')])
        const { value } = await mammoth.convertToHtml({ arrayBuffer: datos.slice(0) })
        if (!cancelado) setHtml(DOMPurify.sanitize(value))
      } catch {
        if (!cancelado) setError(true)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [datos])

  if (error) {
    return (
      <p className="visor-documento-estado" role="alert">
        No se pudo abrir este documento. Puedes descargarlo con el botón de arriba.
      </p>
    )
  }
  if (html === null) return <span className="imagen-cargando" role="status" aria-label="Cargando documento" />

  return (
    <div className="visor-word">
      <p className="visor-word-aviso">Vista aproximada: puede no mostrar todo el formato. Descárgalo para verlo completo.</p>
      <article className="visor-word-hoja" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
