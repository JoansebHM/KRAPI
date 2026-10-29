import { Mic } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { useAuth } from '../auth/useAuth'
import { GUIAS, ID_GUIA_INICIAL, type Guia } from './guias'
import { ListaPreguntas } from './ListaPreguntas'
import { moduloDe } from './ordenar'
import { VistaAutorizacion } from './VistaAutorizacion'
import './Preguntas.css'

const CLAVE_GUIA = 'krapi-preguntas-guia'
const claveModulo = (guia: Guia) => `krapi-preguntas-modulo-${guia.id}`

function leer(clave: string) {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // Sin almacenamiento (por ejemplo, navegación privada): no se recuerda la elección.
  }
}

/**
 * Preguntas de entrevista (`/preguntas`): un diálogo encima del mapa con una pestaña por guía.
 * La guía, el módulo y la vista de autorización van en la URL (`?guia=…&modulo=…&vista=autorizacion`),
 * así el botón atrás del celular funciona.
 */
export function PreguntasPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { perfil } = useAuth()
  const raiz = useRef<HTMLDivElement>(null)
  const pestanas = useRef<Map<string, HTMLButtonElement>>(new Map())

  const guia = GUIAS.find((g) => g.id === params.get('guia')) ?? GUIAS.find((g) => g.id === leer(CLAVE_GUIA)) ?? GUIAS.find((g) => g.id === ID_GUIA_INICIAL)!
  const modulo = moduloDe(guia, params.get('modulo') ?? leer(claveModulo(guia)))
  const enAutorizacion = params.get('vista') === 'autorizacion'

  // El scroll vuelve arriba al cambiar de pestaña, de módulo o de vista; la pestaña activa se lleva a la vista.
  useEffect(() => {
    raiz.current?.closest('.dialog-body')?.scrollTo({ top: 0 })
  }, [guia.id, modulo?.id, enAutorizacion])
  useEffect(() => {
    pestanas.current.get(guia.id)?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [guia.id])

  function elegirGuia(id: string) {
    guardar(CLAVE_GUIA, id)
    // Se conserva la vista (preguntas o autorización); el módulo de la nueva guía es el que se recordó.
    const siguiente: Record<string, string> = { guia: id }
    if (enAutorizacion) siguiente.vista = 'autorizacion'
    setParams(siguiente, { replace: true, state: location.state })
  }

  function elegirModulo(id: string) {
    guardar(claveModulo(guia), id)
    setParams({ guia: guia.id, modulo: id }, { replace: true })
  }

  function abrirAutorizacion() {
    const siguiente: Record<string, string> = { guia: guia.id, vista: 'autorizacion' }
    if (modulo) siguiente.modulo = modulo.id
    // Se marca que esta entrada la agregó la app, para que cerrar sepa cuántos pasos volver.
    void navigate({ search: new URLSearchParams(siguiente).toString() }, { state: { vistaPropia: true } })
  }

  function volverALasPreguntas() {
    if (location.state?.vistaPropia) void navigate(-1)
    else setParams({ guia: guia.id }, { replace: true })
  }

  function cerrar() {
    // `idx` es la posición de esta pantalla en el historial de la app; si no hay a dónde volver, se va al mapa.
    const pasos = enAutorizacion && location.state?.vistaPropia ? 2 : 1
    const posicion: number = window.history.state?.idx ?? 0
    if (posicion - pasos < 0) void navigate('/', { replace: true })
    else void navigate(-pasos)
  }

  function alPresionarPestana(evento: KeyboardEvent, indice: number) {
    const paso = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0
    if (paso === 0) return
    evento.preventDefault()
    const siguiente = GUIAS[(indice + paso + GUIAS.length) % GUIAS.length]
    elegirGuia(siguiente.id)
    pestanas.current.get(siguiente.id)?.focus()
  }

  return (
    <Dialog
      titulo="Preguntas de entrevista"
      clase="dialog-preguntas"
      onCerrar={cerrar}
      acciones={
        <button type="button" className="btn btn-secondary btn-block" onClick={cerrar}>
          Cerrar
        </button>
      }
    >
      <div ref={raiz} className="preguntas">
        <div className="preguntas-cabecera">
          <div className="pestanas pestanas-desplazables" role="tablist" aria-label="Guías de entrevista">
            {GUIAS.map((g, indice) => (
              <button
                key={g.id}
                ref={(boton) => {
                  if (boton) pestanas.current.set(g.id, boton)
                  else pestanas.current.delete(g.id)
                }}
                type="button"
                role="tab"
                id={`guia-${g.id}`}
                aria-selected={g.id === guia.id}
                aria-controls="preguntas-panel"
                tabIndex={g.id === guia.id ? 0 : -1}
                className="pestana"
                onClick={() => elegirGuia(g.id)}
                onKeyDown={(evento) => alPresionarPestana(evento, indice)}
              >
                {g.pestana}
              </button>
            ))}
          </div>
          {!enAutorizacion && (
            <button type="button" className="btn btn-secondary btn-block preguntas-grabar" onClick={abrirAutorizacion}>
              <Mic size={18} aria-hidden="true" />
              Autorización para grabar
            </button>
          )}
        </div>

        <div id="preguntas-panel" role="tabpanel" aria-labelledby={`guia-${guia.id}`}>
          {enAutorizacion ? (
            <VistaAutorizacion guia={guia} nombre={perfil?.nombre.trim() || undefined} onVolver={volverALasPreguntas} />
          ) : (
            <>
              <p className="preguntas-aquien">{guia.aQuien}</p>
              {guia.aviso && <p className="preguntas-aviso">{guia.aviso}</p>}
              {guia.modulos && (
                <div className="preguntas-modulos">
                  <div className="chips" role="group" aria-label={guia.modulos.etiqueta}>
                    <span className="preguntas-modulos-etiqueta">{guia.modulos.etiqueta}:</span>
                    {guia.modulos.opciones.map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        className="chip chip-sin-icono"
                        aria-pressed={opcion.id === modulo?.id}
                        onClick={() => elegirModulo(opcion.id)}
                      >
                        <span>{opcion.nombre}</span>
                      </button>
                    ))}
                  </div>
                  <p className="chips-nota">{guia.modulos.nota}</p>
                </div>
              )}
              <ListaPreguntas key={guia.id} guia={guia} moduloId={modulo?.id ?? null} />
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
