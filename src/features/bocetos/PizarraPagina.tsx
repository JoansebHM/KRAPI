import { Hand, Pencil, Trash2, Undo2 } from 'lucide-react'
import { useRef, useState, type PointerEvent } from 'react'
import { useNavigate } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { notificar } from '../../lib/notificar'
import { useMapa } from '../map/mapaContexto'
import { mensajeDeError, useGuardarBoceto } from './api'
import { capturarMapa } from './capturar'
import { GuardarBoceto } from './GuardarBoceto'
import {
  COLORES_TRAZO,
  DISTANCIA_MINIMA_PX,
  GROSORES_TRAZO,
  redondear,
  simplificar,
  TOLERANCIA_PX,
  type Punto,
  type Trazo,
} from './trazos'
import { useTrazosEnMapa } from './useTrazosEnMapa'
import './Pizarra.css'

type Modo = 'mano' | 'lapiz'
type Pregunta = 'borrar-todo' | 'cancelar'

/**
 * Pizarra: se dibuja a mano alzada sobre el mapa para explicar cosas en las reuniones (la ruta de un
 * bus, por dónde se mueve la gente…) y se guarda como un boceto. Con "Mano" se mueve el mapa; con
 * "Lápiz" el mapa queda quieto y el dedo (o el mouse) dibuja.
 */
export function PizarraPagina() {
  const mapa = useMapa()
  const navigate = useNavigate()
  const guardar = useGuardarBoceto()
  const [modo, setModo] = useState<Modo>('mano')
  const [color, setColor] = useState<string>(COLORES_TRAZO[0].valor)
  const [grosor, setGrosor] = useState<number>(GROSORES_TRAZO[0].valor)
  const [trazos, setTrazos] = useState<Trazo[]>([])
  const [enCurso, setEnCurso] = useState<Trazo | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  // Los puntos del trazo en curso, en píxeles: así se simplifican al soltar el dedo.
  const puntosEnPantalla = useRef<Punto[]>([])

  useTrazosEnMapa(mapa, enCurso ? [...trazos, enCurso] : trazos)

  /** Posición del puntero dentro del mapa, en píxeles. */
  function enPantalla(evento: PointerEvent): Punto {
    const caja = mapa!.getCanvas().getBoundingClientRect()
    return [evento.clientX - caja.left, evento.clientY - caja.top]
  }

  const enElMapa = (punto: Punto) => redondear(mapa!.unproject(punto).toArray() as Punto)

  function empezar(evento: PointerEvent<HTMLDivElement>) {
    // Un solo dedo dibuja; con otro dedo encima o con otro botón del mouse no pasa nada.
    if (!mapa || !evento.isPrimary || (evento.pointerType === 'mouse' && evento.button !== 0)) return
    evento.currentTarget.setPointerCapture(evento.pointerId)
    const punto = enPantalla(evento)
    puntosEnPantalla.current = [punto]
    setEnCurso({ puntos: [enElMapa(punto)], color, grosor })
  }

  function seguir(evento: PointerEvent<HTMLDivElement>) {
    const anteriores = puntosEnPantalla.current
    if (!mapa || anteriores.length === 0 || !evento.isPrimary) return
    const punto = enPantalla(evento)
    const [x, y] = anteriores[anteriores.length - 1]
    if (Math.hypot(punto[0] - x, punto[1] - y) < DISTANCIA_MINIMA_PX) return
    anteriores.push(punto)
    const nuevo = enElMapa(punto)
    setEnCurso((trazo) => trazo && { ...trazo, puntos: [...trazo.puntos, nuevo] })
  }

  function terminar() {
    const puntos = puntosEnPantalla.current
    puntosEnPantalla.current = []
    if (!mapa || puntos.length === 0 || !enCurso) return
    const simplificados = simplificar(puntos, TOLERANCIA_PX)
    // Un toque sin arrastrar es un punto: se dibuja como una línea cortísima para que se vea.
    if (simplificados.length === 1) simplificados.push([simplificados[0][0] + 0.5, simplificados[0][1]])
    setTrazos((actuales) => [...actuales, { ...enCurso, puntos: simplificados.map(enElMapa) }])
    setEnCurso(null)
  }

  function cancelar() {
    if (trazos.length === 0) navigate('/')
    else setPregunta('cancelar')
  }

  async function guardarBoceto(titulo: string, descripcion: string) {
    if (!mapa) return
    try {
      const captura = await capturarMapa(mapa)
      await guardar.mutateAsync({ titulo, descripcion, trazos, captura })
      setGuardando(false)
      navigate('/bocetos')
      notificar.exito('Boceto guardado', { descripcion: `«${titulo.trim()}» ya está en Bocetos.` })
    } catch (error) {
      notificar.error('No se pudo guardar el boceto', { descripcion: mensajeDeError(error) })
    }
  }

  const dibujando = modo === 'lapiz'

  return (
    <div className="pizarra">
      {/* Cubre el mapa: con el lápiz recibe los toques y el mapa no se mueve; con la mano los deja pasar. */}
      <div
        className={`pizarra-lienzo${dibujando ? '' : ' pizarra-lienzo-mano'}`}
        data-testid="pizarra-lienzo"
        onPointerDown={empezar}
        onPointerMove={seguir}
        onPointerUp={terminar}
        onPointerCancel={terminar}
      />

      <p className="solo-lector" role="status">
        {dibujando ? 'Lápiz activo: el mapa no se mueve, dibuja con el dedo o el mouse.' : 'Mano activa: mueve el mapa.'}
      </p>

      <div className="pizarra-acciones">
        <button type="button" className="btn btn-secondary" onClick={cancelar}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setGuardando(true)} disabled={trazos.length === 0}>
          Guardar
        </button>
      </div>

      <div className="pizarra-barra" role="toolbar" aria-label="Herramientas de la pizarra">
        <div className="pizarra-fila pizarra-modos">
          <button type="button" className="pizarra-modo" aria-pressed={!dibujando} onClick={() => setModo('mano')}>
            <Hand size={20} aria-hidden="true" />
            Mano
          </button>
          <button type="button" className="pizarra-modo" aria-pressed={dibujando} onClick={() => setModo('lapiz')}>
            <Pencil size={20} aria-hidden="true" />
            Lápiz
          </button>
        </div>

        <div className="pizarra-fila pizarra-colores" role="group" aria-label="Color">
          {COLORES_TRAZO.map(({ valor, nombre }) => (
            <button
              key={valor}
              type="button"
              className="pizarra-color"
              aria-label={`Color ${nombre.toLowerCase()}`}
              title={nombre}
              aria-pressed={color === valor}
              onClick={() => setColor(valor)}
            >
              <span style={{ background: valor }} aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="pizarra-fila pizarra-ajustes">
          <div className="pizarra-grosores" role="group" aria-label="Grosor">
            {GROSORES_TRAZO.map(({ valor, nombre }) => (
              <button
                key={valor}
                type="button"
                className="pizarra-icono"
                aria-label={`Trazo ${nombre.toLowerCase()}`}
                title={nombre}
                aria-pressed={grosor === valor}
                onClick={() => setGrosor(valor)}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                  <path d="M4 12h16" stroke="currentColor" strokeWidth={valor} strokeLinecap="round" fill="none" />
                </svg>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="pizarra-icono"
            aria-label="Deshacer"
            title="Deshacer el último trazo"
            onClick={() => setTrazos((actuales) => actuales.slice(0, -1))}
            disabled={trazos.length === 0}
          >
            <Undo2 size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pizarra-icono"
            aria-label="Borrar todo"
            title="Borrar todo"
            onClick={() => setPregunta('borrar-todo')}
            disabled={trazos.length === 0}
          >
            <Trash2 size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      {guardando && <GuardarBoceto guardando={guardar.isPending} onGuardar={(titulo, descripcion) => void guardarBoceto(titulo, descripcion)} onCerrar={() => setGuardando(false)} />}

      {pregunta && (
        <Dialog
          titulo={pregunta === 'borrar-todo' ? '¿Borrar todo el dibujo?' : '¿Descartar el dibujo?'}
          onCerrar={() => setPregunta(null)}
          acciones={
            <>
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={() => {
                  if (pregunta === 'cancelar') {
                    navigate('/')
                    return
                  }
                  setTrazos([])
                  setPregunta(null)
                }}
              >
                {pregunta === 'borrar-todo' ? 'Borrar todo' : 'Descartar'}
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setPregunta(null)}>
                Seguir dibujando
              </button>
            </>
          }
        >
          <p>{pregunta === 'borrar-todo' ? 'Se quitan todos los trazos. No se puede deshacer.' : 'Los trazos que no guardaste se pierden.'}</p>
        </Dialog>
      )}
    </div>
  )
}
