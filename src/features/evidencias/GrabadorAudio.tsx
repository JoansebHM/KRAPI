import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../../components/Dialog'

type Estado =
  | { tipo: 'inicio' }
  | { tipo: 'pidiendo' }
  | { tipo: 'grabando'; inicio: number }
  | { tipo: 'lista'; audio: File; url: string }
  | { tipo: 'error'; mensaje: string }

interface GrabadorAudioProps {
  onUsar: (audio: File) => void
  onCerrar: () => void
}

/** Formatos que graban los navegadores: WebM en Chrome y Firefox, MP4 en Safari. */
function formatoGrabacion() {
  if (typeof MediaRecorder === 'undefined') return null
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return { mime: 'audio/webm', opcion: 'audio/webm;codecs=opus', extension: 'webm' }
  if (MediaRecorder.isTypeSupported('audio/mp4')) return { mime: 'audio/mp4', opcion: 'audio/mp4', extension: 'm4a' }
  return null
}

const soltar = (microfono: MediaStream) => microfono.getTracks().forEach((pista) => pista.stop())

const dosDigitos = (n: number) => String(n).padStart(2, '0')

function nombreGrabacion(extension: string, fecha = new Date()) {
  return `Audio ${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())} ${dosDigitos(fecha.getHours())}-${dosDigitos(fecha.getMinutes())}.${extension}`
}

function mostrarDuracion(ms: number) {
  const segundos = Math.floor(ms / 1000)
  return `${Math.floor(segundos / 60)}:${dosDigitos(segundos % 60)}`
}

/** Graba un audio con el micrófono del dispositivo, sin salir de la app. */
export function GrabadorAudio({ onUsar, onCerrar }: GrabadorAudioProps) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicio' })
  const [ahora, setAhora] = useState(() => Date.now())
  // Grabación en curso. `intento` numera cada intento: si se cierra o se reinicia mientras pide permiso, el anterior se descarta.
  const recursos = useRef<{ intento: number; grabadora: MediaRecorder | null; microfono: MediaStream | null }>({
    intento: 0,
    grabadora: null,
    microfono: null,
  })

  async function grabar() {
    const formato = formatoGrabacion()
    if (!formato || !navigator.mediaDevices?.getUserMedia) {
      setEstado({ tipo: 'error', mensaje: 'Este navegador no puede grabar audio. Graba con la app del celular y súbelo con "Elegir archivos".' })
      return
    }
    const r = recursos.current
    const esteIntento = ++r.intento
    setEstado({ tipo: 'pidiendo' })
    let microfono: MediaStream
    try {
      microfono = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      if (esteIntento === r.intento) {
        setEstado({ tipo: 'error', mensaje: 'No se pudo usar el micrófono. Revisa que el permiso esté activado en el navegador.' })
      }
      return
    }
    if (esteIntento !== r.intento) {
      soltar(microfono)
      return
    }
    const partes: Blob[] = []
    const grabadora = new MediaRecorder(microfono, { mimeType: formato.opcion })
    grabadora.ondataavailable = (evento) => {
      if (evento.data.size > 0) partes.push(evento.data)
    }
    grabadora.onstop = () => {
      soltar(microfono)
      const audio = new File(partes, nombreGrabacion(formato.extension), { type: formato.mime })
      setEstado({ tipo: 'lista', audio, url: URL.createObjectURL(audio) })
    }
    // Entrega los datos cada segundo para no perder la grabación si algo falla al final.
    grabadora.start(1000)
    r.grabadora = grabadora
    r.microfono = microfono
    setEstado({ tipo: 'grabando', inicio: Date.now() })
  }

  // Al cerrar, se descarta lo que esté en curso y se apaga el micrófono.
  useEffect(() => {
    const r = recursos.current
    return () => {
      r.intento++
      if (r.grabadora?.state === 'recording') {
        r.grabadora.onstop = null
        r.grabadora.stop()
      }
      if (r.microfono) soltar(r.microfono)
    }
  }, [])

  useEffect(() => {
    if (estado.tipo !== 'grabando') return
    const reloj = setInterval(() => setAhora(Date.now()), 250)
    return () => clearInterval(reloj)
  }, [estado.tipo])

  useEffect(() => {
    if (estado.tipo !== 'lista') return
    return () => URL.revokeObjectURL(estado.url)
  }, [estado])

  const detener = () => recursos.current.grabadora?.stop()
  const grabando = estado.tipo === 'grabando'

  return (
    <Dialog
      titulo="Grabar audio"
      // Mientras graba no se cierra al tocar fuera, para no perder la grabación por accidente.
      onCerrar={grabando ? undefined : onCerrar}
      acciones={
        estado.tipo === 'lista' ? (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={() => onUsar(estado.audio)}>
              Subir audio
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => void grabar()}>
              Grabar de nuevo
            </button>
            <button type="button" className="btn-texto" onClick={onCerrar}>
              Descartar
            </button>
          </>
        ) : grabando ? (
          <button type="button" className="btn btn-primary btn-block" onClick={detener} data-autofocus>
            Detener
          </button>
        ) : estado.tipo === 'error' ? (
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar}>
            Cerrar
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={() => void grabar()} disabled={estado.tipo === 'pidiendo'}>
              {estado.tipo === 'pidiendo' ? 'Preparando el micrófono…' : 'Empezar a grabar'}
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar}>
              Cancelar
            </button>
          </>
        )
      }
    >
      {(estado.tipo === 'inicio' || estado.tipo === 'pidiendo') && (
        <p className="grabador-texto">La primera vez, el navegador pide permiso para usar el micrófono.</p>
      )}
      {grabando && (
        <div className="grabador-en-curso" role="status">
          <span className="grabador-punto" aria-hidden="true" />
          <span>Grabando</span>
          <span className="grabador-tiempo">{mostrarDuracion(Math.max(0, ahora - estado.inicio))}</span>
        </div>
      )}
      {estado.tipo === 'lista' && (
        <>
          <p className="grabador-texto">Escúchalo antes de subirlo.</p>
          <audio className="grabador-audio" controls src={estado.url} />
        </>
      )}
      {estado.tipo === 'error' && (
        <p className="alert alert-error" role="alert">
          {estado.mensaje}
        </p>
      )}
    </Dialog>
  )
}
