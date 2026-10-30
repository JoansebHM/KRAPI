import { ChevronLeft, ChevronRight, Clipboard, Download, Ellipsis, Expand, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ImagenConCarga } from '../../components/ImagenConCarga'
import { PantallaCompleta } from '../../components/PantallaCompleta'
import { enlaceDescarga } from '../../lib/almacenamiento'
import { notificar } from '../../lib/notificar'
import { useDeslizar } from '../../lib/useDeslizar'
import type { Evidencia } from './api'
import { NOMBRE_TIPO } from './archivos'
import '../estudios/EstudioPresentacion.css'

/**
 * Fotos de un estudio o de un elemento, de a una, con opción de ampliarlas, descargarlas o copiar su enlace.
 * Se pasan con los botones o deslizando con el dedo, también a pantalla completa (ahí además con las flechas).
 */
export function CarruselFotos({ fotos }: { fotos: Evidencia[] }) {
  const [fotoActual, setFotoActual] = useState(0)
  const [fotoAmpliada, setFotoAmpliada] = useState(false)
  // Si se borra la última foto, se vuelve a la primera.
  const indice = fotoActual < fotos.length ? fotoActual : 0
  const foto = fotos[indice]
  const hayVarias = fotos.length > 1

  const siguiente = () => {
    if (hayVarias) setFotoActual((indice + 1) % fotos.length)
  }
  const anterior = () => {
    if (hayVarias) setFotoActual((indice - 1 + fotos.length) % fotos.length)
  }
  const deslizar = useDeslizar(siguiente, anterior)

  // Descarga de antemano las vecinas para que al pasar de foto ya estén.
  useEffect(() => {
    if (fotos.length < 2) return
    for (const vecina of [fotos[(indice + 1) % fotos.length], fotos[(indice - 1 + fotos.length) % fotos.length]]) {
      if (vecina?.enlace) new Image().src = vecina.enlace
    }
  }, [fotos, indice])

  // A pantalla completa también se pasa con las flechas del teclado.
  useEffect(() => {
    if (!fotoAmpliada || !hayVarias) return
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'ArrowRight') siguiente()
      else if (evento.key === 'ArrowLeft') anterior()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  })

  return (
    <>
      <div className="estudio-carrusel" aria-roledescription="carrusel" aria-label="Fotos">
        <div className="estudio-carrusel-imagen" {...deslizar}>
          {foto?.enlace ? (
            <ImagenConCarga key={foto.id} src={foto.enlace} alt={foto.titulo ?? foto.archivo?.nombre ?? 'Foto'} />
          ) : (
            <p role="status">No se pudo abrir esta foto.</p>
          )}
          {foto?.enlace && (
            <button
              type="button"
              className="estudio-carrusel-ampliar"
              aria-label="Ampliar foto"
              onClick={() => setFotoAmpliada(true)}
            >
              <Expand size={20} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="estudio-carrusel-controles">
          <button
            type="button"
            className="estudio-carrusel-control"
            aria-label="Foto anterior"
            disabled={!hayVarias}
            onClick={anterior}
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <span aria-live="polite">
            {foto?.titulo ?? foto?.archivo?.nombre ?? 'Foto'} · {indice + 1} de {fotos.length}
          </span>
          <button
            type="button"
            className="estudio-carrusel-control"
            aria-label="Foto siguiente"
            disabled={!hayVarias}
            onClick={siguiente}
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>
        {foto && (
          <div className="estudio-foto-acciones">
            <AccionesEvidencia evidencia={foto} />
          </div>
        )}
      </div>
      {fotoAmpliada && foto?.enlace && (
        <PantallaCompleta
          titulo={foto.titulo ?? foto.archivo?.nombre ?? 'Foto'}
          detalle={`${indice + 1} de ${fotos.length}`}
          onCerrar={() => setFotoAmpliada(false)}
          acciones={
            foto.archivo ? (
              <a
                className="pantalla-completa-boton"
                href={enlaceDescarga(foto.enlace, foto.archivo.nombre)}
                aria-label="Descargar foto"
                title="Descargar"
              >
                <Download size={20} aria-hidden="true" />
              </a>
            ) : undefined
          }
        >
          <div className="estudio-foto-visor" {...deslizar}>
            <ImagenConCarga
              key={foto.id}
              className="estudio-foto-ampliada"
              src={foto.enlace}
              alt={foto.titulo ?? foto.archivo?.nombre ?? 'Foto'}
            />
          </div>
          {hayVarias && (
            <>
              <button type="button" className="estudio-visor-flecha estudio-visor-flecha-anterior" aria-label="Foto anterior" onClick={anterior}>
                <ChevronLeft size={26} aria-hidden="true" />
              </button>
              <button type="button" className="estudio-visor-flecha estudio-visor-flecha-siguiente" aria-label="Foto siguiente" onClick={siguiente}>
                <ChevronRight size={26} aria-hidden="true" />
              </button>
            </>
          )}
        </PantallaCompleta>
      )}
    </>
  )
}

/** Menú de una evidencia: descargar, copiar su enlace o abrirlo. */
export function AccionesEvidencia({ evidencia }: { evidencia: Evidencia }) {
  const [abierto, setAbierto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const nombre = evidencia.titulo ?? evidencia.archivo?.nombre ?? NOMBRE_TIPO[evidencia.tipo]
  const enlace = evidencia.enlace
  const textoParaCopiar = enlace ?? evidencia.urlExterna ?? evidencia.texto
  const puedeDescargar = Boolean(evidencia.archivo && enlace)
  const puedeCopiar = Boolean(textoParaCopiar)
  const puedeAbrir = Boolean(evidencia.urlExterna)

  useEffect(() => {
    if (!abierto) return
    const cerrarFuera = (evento: PointerEvent) => {
      if (!menuRef.current?.contains(evento.target as Node)) setAbierto(false)
    }
    const cerrarEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        setAbierto(false)
      }
    }
    document.addEventListener('pointerdown', cerrarFuera)
    document.addEventListener('keydown', cerrarEscape)
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera)
      document.removeEventListener('keydown', cerrarEscape)
    }
  }, [abierto])

  if (!puedeDescargar && !puedeCopiar && !puedeAbrir) return null

  async function copiar() {
    if (!textoParaCopiar) return
    try {
      await navigator.clipboard.writeText(textoParaCopiar)
      setAbierto(false)
      notificar.exito(evidencia.texto && !enlace ? 'Texto copiado' : 'Enlace copiado', {
        descripcion: evidencia.archivo && enlace ? 'El enlace temporal permite abrir este archivo durante una hora.' : undefined,
      })
    } catch {
      notificar.error('No se pudo copiar', { descripcion: 'Revisa los permisos del navegador e inténtalo de nuevo.' })
    }
  }

  return (
    <div className="estudio-evidencia-acciones" ref={menuRef}>
      <button
        type="button"
        className="estudio-evidencia-menu-boton"
        aria-label={`Acciones de «${nombre}»`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((valor) => !valor)}
      >
        <Ellipsis size={21} aria-hidden="true" />
      </button>
      {abierto && (
        <div className="estudio-evidencia-menu" role="menu" aria-label={`Acciones de ${nombre}`}>
          {evidencia.archivo && enlace && (
            <a
              role="menuitem"
              className="estudio-evidencia-menu-item"
              href={enlaceDescarga(enlace, evidencia.archivo.nombre)}
              onClick={() => setAbierto(false)}
            >
              <Download size={18} aria-hidden="true" />
              Descargar
            </a>
          )}
          {puedeCopiar && (
            <button type="button" role="menuitem" className="estudio-evidencia-menu-item" onClick={() => void copiar()}>
              <Clipboard size={18} aria-hidden="true" />
              {evidencia.texto && !enlace && !evidencia.urlExterna ? 'Copiar texto' : 'Copiar enlace'}
            </button>
          )}
          {evidencia.urlExterna && (
            <a
              role="menuitem"
              className="estudio-evidencia-menu-item"
              href={evidencia.urlExterna}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setAbierto(false)}
            >
              <ExternalLink size={18} aria-hidden="true" />
              Abrir enlace
            </a>
          )}
        </div>
      )}
    </div>
  )
}
