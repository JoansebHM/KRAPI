import { ChevronLeft, ChevronRight, Clipboard, Download, Ellipsis, Expand, ExternalLink, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, ListaCargando } from '../../components/Estados'
import { PantallaCompleta } from '../../components/PantallaCompleta'
import { enlaceDescarga } from '../../lib/almacenamiento'
import { notificar } from '../../lib/notificar'
import { Avatar } from '../responsables/Avatar'
import { semillaDe, type Responsable } from '../responsables/api'
import { useEvidencias, type Evidencia } from '../evidencias/api'
import { mostrarTamano, NOMBRE_TIPO } from '../evidencias/archivos'
import { IconoTipoEvidencia } from '../evidencias/IconoTipoEvidencia'
import { useNombreDeCuenta } from '../usuarios/api'
import type { Estudio } from './api'
import { fueEditado, mostrarFecha, mostrarFechaDe, mostrarHora } from './campos'
import './EstudioPresentacion.css'

interface EstudioPresentacionProps {
  estudio: Estudio
  nombreLugar: string
  responsables: Responsable[]
  onEditar: () => void
  onAgregarEvidencia: () => void
  onCerrar: () => void
}

export function EstudioPresentacion({
  estudio,
  nombreLugar,
  responsables,
  onEditar,
  onAgregarEvidencia,
  onCerrar,
}: EstudioPresentacionProps) {
  const { data: evidencias, isPending, isError, refetch } = useEvidencias(estudio.id)
  const nombreDe = useNombreDeCuenta()
  const quienSubio = (evidencia: Evidencia) => {
    const nombre = nombreDe(evidencia.creadaPor)
    return nombre && `subida por ${nombre}`
  }
  const fotos = (evidencias ?? []).filter((evidencia) => evidencia.tipo === 'foto')
  const tipos = ['audio', 'documento', 'texto', 'video'] as const
  const [fotoActual, setFotoActual] = useState(0)
  const [fotoAmpliada, setFotoAmpliada] = useState(false)
  const foto = fotos[fotoActual]

  return (
    <>
      <Dialog
        titulo={estudio.titulo}
        clase="dialog-presentacion"
        onCerrar={onCerrar}
        acciones={
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={onEditar}>
              Editar estudio
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={onAgregarEvidencia}>
              Agregar evidencia
            </button>
            <button type="button" className="btn-texto btn-block" onClick={onCerrar}>
              Cerrar
            </button>
          </>
        }
      >
        <div className="estudio-presentacion">
          <p className="estudio-presentacion-lugar">{nombreLugar}</p>
          <dl className="estudio-presentacion-datos">
            <div>
              <dt>Fecha y hora</dt>
              <dd>
                {mostrarFecha(estudio.fecha)} · {mostrarHora(estudio.horaInicio)} – {mostrarHora(estudio.horaFin)}
              </dd>
            </div>
            {estudio.entrevistado && (
              <div>
                <dt>A quién se entrevistó</dt>
                <dd>{estudio.entrevistado}</dd>
              </div>
            )}
            <div>
              <dt>Responsables</dt>
              <dd>
                {responsables.length === 0 ? (
                  <span className="estudio-presentacion-sin-dato">Sin responsables</span>
                ) : (
                  <ul className="estudio-presentacion-personas">
                    {responsables.map((responsable) => (
                      <li key={responsable.id}>
                        <Avatar semilla={semillaDe(responsable)} tamano={28} />
                        {responsable.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            {estudio.descripcion && (
              <div>
                <dt>Notas</dt>
                <dd className="estudio-presentacion-notas">{estudio.descripcion}</dd>
              </div>
            )}
          </dl>

          <Autoria estudio={estudio} />

          <section className="estudio-presentacion-evidencias" aria-labelledby="estudio-fotos-titulo">
            <h3 id="estudio-fotos-titulo" className="estudio-evidencias-titulo">
              <IconoTipoEvidencia tipo="foto" />
              Fotos
            </h3>
            {isPending ? (
              <ListaCargando filas={1} />
            ) : isError ? (
              <ErrorCarga mensaje="No se pudieron cargar las evidencias." onReintentar={() => refetch()} />
            ) : fotos.length === 0 ? (
              <p className="estudio-presentacion-vacio">Este estudio todavía no tiene fotos.</p>
            ) : (
              <div className="estudio-carrusel" aria-roledescription="carrusel" aria-label="Fotos del estudio">
                <div className="estudio-carrusel-imagen">
                  {foto?.enlace ? (
                    <img src={foto.enlace} alt={foto.titulo ?? foto.archivo?.nombre ?? 'Foto del estudio'} />
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
                    disabled={fotos.length < 2}
                    onClick={() => setFotoActual((actual) => (actual - 1 + fotos.length) % fotos.length)}
                  >
                    <ChevronLeft size={22} aria-hidden="true" />
                  </button>
                  <span aria-live="polite">
                    {foto?.titulo ?? foto?.archivo?.nombre ?? 'Foto'} · {fotoActual + 1} de {fotos.length}
                  </span>
                  <button
                    type="button"
                    className="estudio-carrusel-control"
                    aria-label="Foto siguiente"
                    disabled={fotos.length < 2}
                    onClick={() => setFotoActual((actual) => (actual + 1) % fotos.length)}
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
            )}
          </section>

          {!isPending && !isError && (
            tipos.map((tipo) => {
              const delTipo = (evidencias ?? []).filter((evidencia) => evidencia.tipo === tipo)
              if (delTipo.length === 0) return null
              const idTitulo = `estudio-evidencias-${tipo}`
              return (
                <section key={tipo} className="estudio-presentacion-evidencias" aria-labelledby={idTitulo}>
                  <h3 id={idTitulo} className="estudio-evidencias-titulo">
                    <IconoTipoEvidencia tipo={tipo} />
                    {NOMBRE_TIPO[tipo]}
                    <span className="estudio-evidencias-cantidad">{delTipo.length}</span>
                  </h3>
                  <ul className="estudio-evidencias-lista">
                    {delTipo.map((evidencia) => (
                      <li key={evidencia.id}>
                        <div className="estudio-evidencia-detalle">
                          <strong>{evidencia.titulo ?? evidencia.archivo?.nombre ?? NOMBRE_TIPO[evidencia.tipo]}</strong>
                          <span>
                            {[evidencia.archivo && mostrarTamano(evidencia.archivo.bytes), quienSubio(evidencia)].filter(Boolean).join(' · ')}
                          </span>
                          {evidencia.texto && <p className="estudio-evidencia-texto">{evidencia.texto}</p>}
                          {evidencia.tipo === 'audio' && evidencia.enlace && (
                            <AudioConVelocidad
                              enlace={evidencia.enlace}
                              titulo={evidencia.titulo ?? evidencia.archivo?.nombre ?? 'audio del estudio'}
                            />
                          )}
                        </div>
                        <AccionesEvidencia evidencia={evidencia} />
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })
          )}
        </div>
      </Dialog>
      {fotoAmpliada && foto?.enlace && (
        <PantallaCompleta
          titulo={foto.titulo ?? foto.archivo?.nombre ?? 'Foto'}
          detalle={`${fotoActual + 1} de ${fotos.length}`}
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
          <img className="estudio-foto-ampliada" src={foto.enlace} alt={foto.titulo ?? foto.archivo?.nombre ?? 'Foto del estudio'} />
        </PantallaCompleta>
      )}
    </>
  )
}

function AccionesEvidencia({ evidencia }: { evidencia: Evidencia }) {
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

function AudioConVelocidad({ enlace, titulo }: { enlace: string; titulo: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [velocidad, setVelocidad] = useState(1)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [duracion, setDuracion] = useState(0)
  const [tiempoActual, setTiempoActual] = useState(0)
  const [error, setError] = useState(false)

  function cambiarVelocidad(nuevaVelocidad: number) {
    if (audioRef.current) audioRef.current.playbackRate = nuevaVelocidad
    setVelocidad(nuevaVelocidad)
  }

  async function alternarReproduccion() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      try {
        await audio.play()
        setError(false)
      } catch {
        setError(true)
        setReproduciendo(false)
      }
    } else {
      audio.pause()
    }
  }

  function cambiarTiempo(valor: string) {
    const nuevoTiempo = Number(valor)
    if (!audioRef.current || !Number.isFinite(nuevoTiempo)) return
    audioRef.current.currentTime = nuevoTiempo
    setTiempoActual(nuevoTiempo)
  }

  return (
    <div className="estudio-audio">
      <audio
        ref={audioRef}
        preload="metadata"
        src={enlace}
        onLoadedMetadata={(evento) => setDuracion(Number.isFinite(evento.currentTarget.duration) ? evento.currentTarget.duration : 0)}
        onDurationChange={(evento) => setDuracion(Number.isFinite(evento.currentTarget.duration) ? evento.currentTarget.duration : 0)}
        onTimeUpdate={(evento) => setTiempoActual(evento.currentTarget.currentTime)}
        onPlay={() => setReproduciendo(true)}
        onPause={() => setReproduciendo(false)}
        onEnded={() => setReproduciendo(false)}
        onError={() => {
          setError(true)
          setReproduciendo(false)
        }}
      />
      <div className="estudio-audio-controles">
        <button
          type="button"
          className="estudio-audio-reproducir"
          aria-label={reproduciendo ? `Pausar ${titulo}` : `Reproducir ${titulo}`}
          onClick={() => void alternarReproduccion()}
        >
          {reproduciendo ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>
        <div className="estudio-audio-progreso">
          <input
            type="range"
            min={0}
            max={Math.max(duracion, 1)}
            step="any"
            value={Math.min(tiempoActual, duracion || 0)}
            disabled={!duracion}
            aria-label={`Avance de ${titulo}`}
            aria-valuetext={`${mostrarTiempo(tiempoActual)} de ${mostrarTiempo(duracion)}`}
            onChange={(evento) => cambiarTiempo(evento.target.value)}
          />
          <div className="estudio-audio-tiempos" aria-live="off">
            <span>{mostrarTiempo(tiempoActual)}</span>
            <span>{mostrarTiempo(duracion)}</span>
          </div>
        </div>
      </div>
      {error && <p className="estudio-audio-error" role="alert">No se pudo reproducir este audio.</p>}
      <div className="estudio-audio-velocidades" role="group" aria-label={`Velocidad de reproducción de ${titulo}`}>
        <span>Velocidad</span>
        <div className="estudio-audio-opciones">
          {[1, 2, 3].map((opcion) => (
            <button
              key={opcion}
              type="button"
              aria-label={`Velocidad ${opcion}×`}
              aria-pressed={velocidad === opcion}
              onClick={() => cambiarVelocidad(opcion)}
            >
              {opcion}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function mostrarTiempo(segundos: number) {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00'
  const minutos = Math.floor(segundos / 60)
  const resto = Math.floor(segundos % 60)
  return `${minutos}:${String(resto).padStart(2, '0')}`
}

/** "Registrado por Ana · 30 oct 2026" y, si se editó después, "Editado por Beto · 31 oct 2026". */
function Autoria({ estudio }: { estudio: Estudio }) {
  const nombreDe = useNombreDeCuenta()
  const registro = nombreDe(estudio.creadoPor)
  if (!registro) return null
  const edicion = fueEditado(estudio.creadoEn, estudio.actualizadoEn) ? nombreDe(estudio.actualizadoPor) : null
  return (
    <p className="estudio-presentacion-autoria">
      <span>
        Registrado por {registro} · {mostrarFechaDe(estudio.creadoEn)}
      </span>
      {edicion && (
        <span>
          Editado por {edicion} · {mostrarFechaDe(estudio.actualizadoEn)}
        </span>
      )}
    </p>
  )
}
