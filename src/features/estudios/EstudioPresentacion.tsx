import { Pause, Play } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, ListaCargando } from '../../components/Estados'
import { useEvidencias, type Evidencia } from '../evidencias/api'
import { mostrarTamano, NOMBRE_TIPO } from '../evidencias/archivos'
import { AccionesEvidencia, CarruselFotos } from '../evidencias/CarruselFotos'
import { IconoTipoEvidencia } from '../evidencias/IconoTipoEvidencia'
import { useSalidas } from '../salidas/api'
import { useNombreDeCuenta } from '../usuarios/api'
import type { Estudio } from './api'
import { cuandoFue, fueEditado, mostrarFecha, mostrarFechaDe, mostrarHora } from './campos'
import { NotasDelEstudio } from './NotasDelEstudio'
import { ParticipantesDelEstudio } from './ParticipantesDelEstudio'
import './EstudioPresentacion.css'

interface EstudioPresentacionProps {
  estudio: Estudio
  nombreLugar: string
  onEditar: () => void
  onAgregarEvidencia: () => void
  onCerrar: () => void
}

export function EstudioPresentacion({
  estudio,
  nombreLugar,
  onEditar,
  onAgregarEvidencia,
  onCerrar,
}: EstudioPresentacionProps) {
  const { data: evidencias, isPending, isError, refetch } = useEvidencias({ tipo: 'estudio', id: estudio.id })
  const { data: salidas } = useSalidas()
  const salida = estudio.salidaId ? salidas?.find((s) => s.id === estudio.salidaId) : undefined
  const nombreDe = useNombreDeCuenta()
  const quienSubio = (evidencia: Evidencia) => {
    const nombre = nombreDe(evidencia.creadaPor)
    return nombre && `subida por ${nombre}`
  }
  const fotos = (evidencias ?? []).filter((evidencia) => evidencia.tipo === 'foto')
  const tipos = ['audio', 'documento', 'texto', 'video'] as const

  return (
    <>
      <Dialog
        titulo={cuandoFue(estudio)}
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
              <dt>Participantes</dt>
              <dd>
                <ParticipantesDelEstudio estudio={estudio} claseLista="estudio-presentacion-personas" claseVacio="estudio-presentacion-sin-dato" />
              </dd>
            </div>
            {salida && (
              <div>
                <dt>Salida</dt>
                <dd>
                  <Link to={`/salidas/${salida.id}`} onClick={onCerrar}>
                    {salida.nombre}
                  </Link>
                </dd>
              </div>
            )}
          </dl>

          <Autoria estudio={estudio} />

          <NotasDelEstudio notas={estudio.notas} />

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
              <CarruselFotos fotos={fotos} />
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
                          {evidencia.tipo === 'video' && evidencia.urlExterna && (
                            <a className="estudio-evidencia-video" href={evidencia.urlExterna} target="_blank" rel="noopener noreferrer">
                              <Play size={16} aria-hidden="true" />
                              Ver en SharePoint
                            </a>
                          )}
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
    </>
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
