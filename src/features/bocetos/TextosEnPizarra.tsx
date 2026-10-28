import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Map as MapLibreMap } from '../map/maplibre'
import { acomodarGiro, normalizarGiro, redondear, type Punto, type Texto } from './trazos'

/** Cuánto se tiene que mover el puntero para que un toque cuente como arrastre. */
const UMBRAL_ARRASTRE_PX = 3
/** Cuánto mueven las flechas del teclado a un texto seleccionado (con Mayús, el cuádruple). */
const PASO_TECLADO_PX = 4

interface TextosEnPizarraProps {
  mapa: MapLibreMap
  textos: Texto[]
  /** Con la herramienta Texto se pueden seleccionar, mover y girar; con las otras no estorban. */
  activo: boolean
  seleccionado: string | null
  onSeleccionar: (id: string | null) => void
  /** Se llama al terminar de mover o girar (o con cada toque de flecha), con lo que cambió. */
  onCambiar: (id: string, cambios: Partial<Pick<Texto, 'posicion' | 'giro'>>) => void
}

interface Vivo {
  id: string
  posicion?: Punto
  giro?: number
}

/**
 * Los textos de la pizarra, como cajas HTML sobre el mapa. Cada una sigue a su posición del mapa
 * (`map.project`), así que se queda pegada a él al moverlo, acercarlo o girarlo. El texto seleccionado
 * muestra su marco y una manija para girarlo, y se arrastra para moverlo.
 *
 * Al guardar, estos mismos textos se dibujan sobre la imagen del mapa (ver `dibujarTextos`).
 */
export function TextosEnPizarra({ mapa, textos, activo, seleccionado, onSeleccionar, onCambiar }: TextosEnPizarraProps) {
  // Se vuelve a dibujar cada vez que el mapa se mueve, para que los textos sigan a su posición.
  const [, setVersion] = useState(0)
  useEffect(() => {
    let pendiente = 0
    const redibujar = () => {
      if (pendiente) return
      pendiente = requestAnimationFrame(() => {
        pendiente = 0
        setVersion((version) => version + 1)
      })
    }
    mapa.on('move', redibujar)
    mapa.on('resize', redibujar)
    return () => {
      mapa.off('move', redibujar)
      mapa.off('resize', redibujar)
      cancelAnimationFrame(pendiente)
    }
  }, [mapa])

  // Lo que se está moviendo o girando ahora: se ve en pantalla, pero no se guarda hasta soltar.
  const [vivo, setVivoEstado] = useState<Vivo | null>(null)
  const vivoRef = useRef<Vivo | null>(null)
  const ponerVivo = (siguiente: Vivo | null) => {
    vivoRef.current = siguiente
    setVivoEstado(siguiente)
  }
  const arrastre = useRef<{ id: string; x: number; y: number; inicio: Punto; movido: boolean } | null>(null)

  const rumbo = mapa.getBearing()

  const enElMapa = (punto: Punto) => redondear(mapa.unproject(punto).toArray() as Punto)

  function empezarArrastre(evento: PointerEvent<HTMLDivElement>, texto: Texto) {
    if (!activo || !evento.isPrimary || (evento.pointerType === 'mouse' && evento.button !== 0)) return
    onSeleccionar(texto.id)
    evento.currentTarget.setPointerCapture(evento.pointerId)
    const { x, y } = mapa.project(texto.posicion)
    arrastre.current = { id: texto.id, x: evento.clientX, y: evento.clientY, inicio: [x, y], movido: false }
  }

  function arrastrar(evento: PointerEvent<HTMLDivElement>) {
    const actual = arrastre.current
    if (!actual) return
    const dx = evento.clientX - actual.x
    const dy = evento.clientY - actual.y
    if (!actual.movido && Math.hypot(dx, dy) < UMBRAL_ARRASTRE_PX) return
    actual.movido = true
    ponerVivo({ id: actual.id, posicion: enElMapa([actual.inicio[0] + dx, actual.inicio[1] + dy]) })
  }

  function soltarArrastre() {
    const actual = arrastre.current
    arrastre.current = null
    if (!actual) return
    const posicion = vivoRef.current?.posicion
    ponerVivo(null)
    if (actual.movido && posicion) onCambiar(actual.id, { posicion })
  }

  function empezarGiro(evento: PointerEvent<HTMLSpanElement>, texto: Texto) {
    if (!evento.isPrimary || (evento.pointerType === 'mouse' && evento.button !== 0)) return
    evento.stopPropagation()
    evento.currentTarget.setPointerCapture(evento.pointerId)
    ponerVivo({ id: texto.id, giro: texto.giro })
  }

  function girar(evento: PointerEvent<HTMLSpanElement>, texto: Texto) {
    evento.stopPropagation()
    if (vivoRef.current?.id !== texto.id) return
    const caja = mapa.getCanvas().getBoundingClientRect()
    const centro = mapa.project(texto.posicion)
    // La manija está arriba del texto (a -90°): el giro es cuánto se aparta el puntero de ahí.
    const enPantallaGrados = (Math.atan2(evento.clientY - (caja.top + centro.y), evento.clientX - (caja.left + centro.x)) * 180) / Math.PI + 90
    // En pantalla el texto gira su giro menos el rumbo del mapa; se guarda respecto al norte.
    ponerVivo({ id: texto.id, giro: acomodarGiro(normalizarGiro(enPantallaGrados + rumbo)) })
  }

  function soltarGiro(evento: PointerEvent<HTMLSpanElement>, texto: Texto) {
    evento.stopPropagation()
    const giro = vivoRef.current?.id === texto.id ? vivoRef.current.giro : undefined
    ponerVivo(null)
    if (giro !== undefined && giro !== texto.giro) onCambiar(texto.id, { giro })
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLDivElement>, texto: Texto) {
    if (!activo) return
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      onSeleccionar(texto.id)
      return
    }
    const flechas: Record<string, Punto> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const direccion = flechas[evento.key]
    if (!direccion || seleccionado !== texto.id) return
    evento.preventDefault()
    const paso = evento.shiftKey ? PASO_TECLADO_PX * 4 : PASO_TECLADO_PX
    const { x, y } = mapa.project(texto.posicion)
    onCambiar(texto.id, { posicion: enElMapa([x + direccion[0] * paso, y + direccion[1] * paso]) })
  }

  return (
    <div className={`pizarra-textos${activo ? ' pizarra-textos-activo' : ''}`}>
      {textos.map((original) => {
        const texto = vivo?.id === original.id ? { ...original, ...vivo } : original
        const { x, y } = mapa.project(texto.posicion)
        const elegido = activo && seleccionado === texto.id
        return (
          <div
            key={texto.id}
            className={`pizarra-texto${elegido ? ' pizarra-texto-seleccionado' : ''}`}
            style={{
              left: x,
              top: y,
              color: texto.color,
              fontSize: texto.tamano,
              transform: `translate(-50%, -50%) rotate(${texto.giro - rumbo}deg)`,
            }}
            role="button"
            tabIndex={activo ? 0 : -1}
            aria-pressed={elegido}
            aria-label={`Texto «${texto.texto.replace(/\s+/g, ' ')}»`}
            onPointerDown={(evento) => empezarArrastre(evento, original)}
            onPointerMove={arrastrar}
            onPointerUp={soltarArrastre}
            onPointerCancel={soltarArrastre}
            onKeyDown={(evento) => alPresionarTecla(evento, original)}
          >
            <span className="pizarra-texto-contenido" data-texto={texto.texto}>
              {texto.texto}
            </span>
            {elegido && (
              <span
                className="pizarra-texto-giro"
                data-testid="manija-de-giro"
                aria-hidden="true"
                onPointerDown={(evento) => empezarGiro(evento, original)}
                onPointerMove={(evento) => girar(evento, original)}
                onPointerUp={(evento) => soltarGiro(evento, original)}
                onPointerCancel={(evento) => soltarGiro(evento, original)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
