import { Check, Hand, Pencil, RotateCcw, RotateCw, Trash2, Type, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useNavigate } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { notificar } from '../../lib/notificar'
import type { MapMouseEvent } from '../map/maplibre'
import { useMapa } from '../map/mapaContexto'
import { mensajeDeError, useGuardarBoceto } from './api'
import { capturarMapa } from './capturar'
import { EditarTexto } from './EditarTexto'
import { GuardarBoceto } from './GuardarBoceto'
import { TextosEnPizarra } from './TextosEnPizarra'
import {
  COLORES_TRAZO,
  DISTANCIA_MINIMA_PX,
  GROSORES_TRAZO,
  normalizarGiro,
  PASO_GIRO,
  redondear,
  simplificar,
  TAMANOS_TEXTO,
  TOLERANCIA_PX,
  type Elemento,
  type Punto,
  type Texto,
  type Trazo,
} from './trazos'
import { useTrazosEnMapa } from './useTrazosEnMapa'
import './Pizarra.css'

type Modo = 'mano' | 'lapiz' | 'texto'
type Pregunta = 'borrar-todo' | 'cancelar'
/** Un texto que se está escribiendo: nuevo (id null, en esa posición) o uno ya puesto. */
type Escribiendo = { id: string | null; posicion: Punto }

/** Cuántas acciones se pueden deshacer. */
const MAX_HISTORIAL = 50

const NOMBRE_MODO: Record<Modo, string> = {
  mano: 'Mano activa: mueve el mapa.',
  lapiz: 'Lápiz activo: el mapa no se mueve, dibuja con el dedo o el mouse.',
  texto: 'Texto activo: toca el mapa para escribir; toca un texto para moverlo o girarlo.',
}

/**
 * Pizarra: se dibuja a mano alzada y se escribe sobre el mapa para explicar cosas en las reuniones (la
 * ruta de un bus, por dónde se mueve la gente…) y se guarda como un boceto. Con "Mano" se mueve el mapa;
 * con "Lápiz" el mapa queda quieto y el dedo (o el mouse) dibuja; con "Texto" se tocan el mapa y los textos.
 */
export function PizarraPagina() {
  const mapa = useMapa()
  const navigate = useNavigate()
  const guardar = useGuardarBoceto()
  const [modo, setModo] = useState<Modo>('mano')
  const [color, setColor] = useState<string>(COLORES_TRAZO[0].valor)
  const [grosor, setGrosor] = useState<number>(GROSORES_TRAZO[0].valor)
  const [tamanoTexto, setTamanoTexto] = useState<number>(TAMANOS_TEXTO[0].valor)
  // Todo lo dibujado, en orden, y las versiones anteriores para Deshacer (cualquier acción).
  const [elementos, setElementos] = useState<Elemento[]>([])
  const [pasado, setPasado] = useState<Elemento[][]>([])
  const [enCurso, setEnCurso] = useState<Trazo | null>(null)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [escribiendo, setEscribiendo] = useState<Escribiendo | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  // Los puntos del trazo en curso, en píxeles: así se simplifican al soltar el dedo.
  const puntosEnPantalla = useRef<Punto[]>([])

  const trazos = useMemo(() => elementos.filter((elemento) => elemento.tipo === 'trazo'), [elementos])
  const textos = useMemo(() => elementos.filter((elemento) => elemento.tipo === 'texto'), [elementos])
  const trazosVisibles = useMemo(() => (enCurso ? [...trazos, enCurso] : trazos), [trazos, enCurso])
  useTrazosEnMapa(mapa, trazosVisibles)

  const textoElegido = textos.find((texto) => texto.id === seleccionado)

  /** Cambia lo dibujado guardando la versión anterior, para poder deshacerlo. */
  function cambiar(siguiente: Elemento[]) {
    setPasado((anteriores) => [...anteriores.slice(-(MAX_HISTORIAL - 1)), elementos])
    setElementos(siguiente)
  }

  function deshacer() {
    const anterior = pasado[pasado.length - 1]
    if (!anterior) return
    setPasado((anteriores) => anteriores.slice(0, -1))
    setElementos(anterior)
    if (seleccionado && !anterior.some((elemento) => elemento.tipo === 'texto' && elemento.id === seleccionado)) setSeleccionado(null)
  }

  function cambiarTexto(id: string, cambios: Partial<Texto>) {
    cambiar(elementos.map((elemento) => (elemento.tipo === 'texto' && elemento.id === id ? { ...elemento, ...cambios } : elemento)))
  }

  function elegirModo(nuevo: Modo) {
    setModo(nuevo)
    if (nuevo !== 'texto') setSeleccionado(null)
  }

  // Con la herramienta Texto, tocar el mapa (no arrastrarlo) abre el cuadro para escribir ahí.
  useEffect(() => {
    if (!mapa || modo !== 'texto') return
    const alTocar = (evento: MapMouseEvent) => setEscribiendo({ id: null, posicion: redondear([evento.lngLat.lng, evento.lngLat.lat]) })
    mapa.on('click', alTocar)
    return () => {
      mapa.off('click', alTocar)
    }
  }, [mapa, modo])

  function guardarTexto(contenido: string) {
    if (!escribiendo) return
    if (escribiendo.id) {
      cambiarTexto(escribiendo.id, { texto: contenido })
    } else {
      const nuevo: Elemento = { tipo: 'texto', id: crypto.randomUUID(), posicion: escribiendo.posicion, texto: contenido, color, tamano: tamanoTexto, giro: 0 }
      cambiar([...elementos, nuevo])
      setSeleccionado(nuevo.id)
    }
    setEscribiendo(null)
  }

  function elegirColor(valor: string) {
    setColor(valor)
    if (textoElegido) cambiarTexto(textoElegido.id, { color: valor })
  }

  function elegirTamano(valor: number) {
    setTamanoTexto(valor)
    if (textoElegido) cambiarTexto(textoElegido.id, { tamano: valor })
  }

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
    cambiar([...elementos, { tipo: 'trazo', ...enCurso, puntos: simplificados.map(enElMapa) }])
    setEnCurso(null)
  }

  function cancelar() {
    if (elementos.length === 0) navigate('/')
    else setPregunta('cancelar')
  }

  async function guardarBoceto(titulo: string, descripcion: string) {
    if (!mapa) return
    try {
      const captura = await capturarMapa(mapa, textos)
      await guardar.mutateAsync({ titulo, descripcion, elementos, captura })
      setGuardando(false)
      navigate('/bocetos')
      notificar.exito('Boceto guardado', { descripcion: `«${titulo.trim()}» ya está en Bocetos.` })
    } catch (error) {
      notificar.error('No se pudo guardar el boceto', { descripcion: mensajeDeError(error) })
    }
  }

  const dibujando = modo === 'lapiz'
  const escribirTexto = modo === 'texto'
  // Con la herramienta Texto, los colores y el tamaño son los del texto elegido (o los del próximo).
  const colorActivo = escribirTexto && textoElegido ? textoElegido.color : color
  const tamanoActivo = textoElegido ? textoElegido.tamano : tamanoTexto
  const vacio = elementos.length === 0

  return (
    <div className="pizarra">
      {mapa && (
        <TextosEnPizarra mapa={mapa} textos={textos} activo={escribirTexto} seleccionado={seleccionado} onSeleccionar={setSeleccionado} onCambiar={cambiarTexto} />
      )}

      {/* Cubre el mapa: con el lápiz recibe los toques y el mapa no se mueve; con los demás los deja pasar. */}
      <div
        className={`pizarra-lienzo${dibujando ? '' : ' pizarra-lienzo-pasa'}`}
        data-testid="pizarra-lienzo"
        onPointerDown={empezar}
        onPointerMove={seguir}
        onPointerUp={terminar}
        onPointerCancel={terminar}
      />

      <p className="solo-lector" role="status">
        {NOMBRE_MODO[modo]}
      </p>

      <div className="pizarra-acciones">
        <button type="button" className="btn btn-secondary" onClick={cancelar}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setGuardando(true)} disabled={vacio}>
          Guardar
        </button>
      </div>

      <div className="pizarra-barra" role="toolbar" aria-label="Herramientas de la pizarra">
        <div className="pizarra-fila pizarra-modos">
          <button type="button" className="pizarra-modo" aria-pressed={modo === 'mano'} onClick={() => elegirModo('mano')}>
            <Hand size={20} aria-hidden="true" />
            Mano
          </button>
          <button type="button" className="pizarra-modo" aria-pressed={dibujando} onClick={() => elegirModo('lapiz')}>
            <Pencil size={20} aria-hidden="true" />
            Lápiz
          </button>
          <button type="button" className="pizarra-modo" aria-pressed={escribirTexto} onClick={() => elegirModo('texto')}>
            <Type size={20} aria-hidden="true" />
            Texto
          </button>
        </div>

        {textoElegido && escribirTexto && (
          <div className="pizarra-fila pizarra-texto-acciones" role="group" aria-label="Texto elegido">
            <button
              type="button"
              className="pizarra-icono"
              aria-label="Editar texto"
              title="Editar el texto"
              onClick={() => setEscribiendo({ id: textoElegido.id, posicion: textoElegido.posicion })}
            >
              <Pencil size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="pizarra-icono"
              aria-label="Girar a la izquierda"
              title={`Girar ${PASO_GIRO}° a la izquierda`}
              onClick={() => cambiarTexto(textoElegido.id, { giro: normalizarGiro(textoElegido.giro - PASO_GIRO) })}
            >
              <RotateCcw size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="pizarra-icono"
              aria-label="Girar a la derecha"
              title={`Girar ${PASO_GIRO}° a la derecha`}
              onClick={() => cambiarTexto(textoElegido.id, { giro: normalizarGiro(textoElegido.giro + PASO_GIRO) })}
            >
              <RotateCw size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="pizarra-icono"
              aria-label="Borrar texto"
              title="Borrar este texto"
              onClick={() => {
                cambiar(elementos.filter((elemento) => !(elemento.tipo === 'texto' && elemento.id === textoElegido.id)))
                setSeleccionado(null)
              }}
            >
              <Trash2 size={22} aria-hidden="true" />
            </button>
            <button type="button" className="pizarra-icono" aria-label="Listo" title="Dejar de elegir el texto" onClick={() => setSeleccionado(null)}>
              <Check size={22} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="pizarra-fila pizarra-colores" role="group" aria-label="Color">
          {COLORES_TRAZO.map(({ valor, nombre }) => (
            <button
              key={valor}
              type="button"
              className="pizarra-color"
              aria-label={`Color ${nombre.toLowerCase()}`}
              title={nombre}
              aria-pressed={colorActivo === valor}
              onClick={() => elegirColor(valor)}
            >
              <span style={{ background: valor }} aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="pizarra-fila pizarra-ajustes">
          {escribirTexto ? (
            <div className="pizarra-grosores" role="group" aria-label="Tamaño del texto">
              {TAMANOS_TEXTO.map(({ valor, nombre }) => (
                <button
                  key={valor}
                  type="button"
                  className="pizarra-icono"
                  aria-label={`Texto ${nombre.toLowerCase()}`}
                  title={nombre}
                  aria-pressed={tamanoActivo === valor}
                  onClick={() => elegirTamano(valor)}
                >
                  <span className="pizarra-letra" style={{ fontSize: valor === TAMANOS_TEXTO[0].valor ? 15 : 24 }} aria-hidden="true">
                    A
                  </span>
                </button>
              ))}
            </div>
          ) : (
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
          )}
          <button type="button" className="pizarra-icono" aria-label="Deshacer" title="Deshacer la última acción" onClick={deshacer} disabled={pasado.length === 0}>
            <Undo2 size={22} aria-hidden="true" />
          </button>
          <button type="button" className="pizarra-icono" aria-label="Borrar todo" title="Borrar todo" onClick={() => setPregunta('borrar-todo')} disabled={vacio}>
            <Trash2 size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      {escribiendo && (
        <EditarTexto
          inicial={escribiendo.id ? textos.find((texto) => texto.id === escribiendo.id)?.texto : undefined}
          onGuardar={guardarTexto}
          onCerrar={() => setEscribiendo(null)}
        />
      )}

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
                  cambiar([])
                  setSeleccionado(null)
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
          <p>{pregunta === 'borrar-todo' ? 'Se quitan todos los trazos y textos. Se puede deshacer.' : 'Lo que no guardaste se pierde.'}</p>
        </Dialog>
      )}
    </div>
  )
}
