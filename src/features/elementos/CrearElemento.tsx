import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { FlechaLista } from '../../components/FlechaLista'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { MiraCentral } from '../lugares/MiraCentral'
import { dentroDeManila } from '../map/manila'
import { buscarElementosCercanos, ELEMENTO_VACIO, useCrearElemento, type CamposElemento, type ElementoCercano } from './api'
import { CamposDelElemento } from './CamposDelElemento'
import '../lugares/CrearPunto.css'

type Paso = { tipo: 'ubicar' } | { tipo: 'formulario' } | { tipo: 'duplicados'; cercanos: ElementoCercano[] }

/**
 * Crear un elemento: se ubica con la mira, se llenan su nombre y su categoría y, antes de guardar,
 * se revisa que no haya otro de la misma categoría a menos de 3 m. Después se abre su ficha para
 * agregarle las evidencias.
 */
export function CrearElemento() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState<Paso>({ tipo: 'ubicar' })
  // La posición queda fija al pasar a los datos, aunque luego se mueva el mapa.
  const [posicion, setPosicion] = useState<[number, number] | null>(null)
  const [campos, setCampos] = useState<CamposElemento>(ELEMENTO_VACIO)
  const [revisando, setRevisando] = useState(false)
  const crear = useCrearElemento()
  const ocupado = revisando || crear.isPending

  function continuar(centro: [number, number] | null) {
    if (!centro || !dentroDeManila(centro[0], centro[1])) return
    setPosicion(centro)
    setPaso({ tipo: 'formulario' })
  }

  /** Revisa los duplicados de la misma categoría y, si no hay, guarda. */
  async function revisarYGuardar() {
    const [lng, lat] = posicion!
    setRevisando(true)
    try {
      const cercanos = await buscarElementosCercanos(lng, lat, campos.categoriaId)
      if (cercanos.length > 0) setPaso({ tipo: 'duplicados', cercanos })
      else await guardar()
    } catch (error) {
      notificar.error('No se pudo revisar la ubicación', { descripcion: mensajeErrorDatos(error) })
    } finally {
      setRevisando(false)
    }
  }

  async function guardar() {
    const [lng, lat] = posicion!
    try {
      const id = await crear.mutateAsync({ ...campos, lng, lat })
      notificar.exito('Elemento guardado', { descripcion: 'Ya está en el mapa. Ahora agrégale las evidencias.' })
      navigate(`/lugares/${id}`)
    } catch (error) {
      notificar.error('No se pudo guardar el elemento', { descripcion: mensajeErrorDatos(error) })
    }
  }

  return (
    <div className="crear-punto">
      <MiraCentral mensaje="Mueve el mapa hasta que la mira quede sobre el elemento.">
        {({ centro, dentro }) => (
          <div className="crear-barra">
            <Link to="/" className="btn btn-secondary">
              Cancelar
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => continuar(centro)} disabled={!dentro}>
              Continuar
            </button>
          </div>
        )}
      </MiraCentral>

      {paso.tipo === 'formulario' && (
        <Dialog
          titulo="Nuevo elemento"
          onCerrar={ocupado ? undefined : () => setPaso({ tipo: 'ubicar' })}
          onSubmit={() => void revisarYGuardar()}
          acciones={
            <>
              <button type="submit" className="btn btn-primary btn-block" disabled={ocupado}>
                {ocupado ? 'Guardando…' : 'Guardar elemento'}
              </button>
              <button type="button" className="btn-texto" onClick={() => setPaso({ tipo: 'ubicar' })} disabled={ocupado}>
                Volver a ubicar
              </button>
            </>
          }
        >
          <CamposDelElemento campos={campos} onCambiar={setCampos} />
        </Dialog>
      )}

      {paso.tipo === 'duplicados' && (
        <Dialog
          titulo="¿Es alguno de estos elementos?"
          onCerrar={crear.isPending ? undefined : () => setPaso({ tipo: 'formulario' })}
          acciones={
            <>
              <button type="button" className="btn btn-primary btn-block" onClick={() => void guardar()} disabled={crear.isPending}>
                {crear.isPending ? 'Guardando…' : 'No, es otro'}
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setPaso({ tipo: 'formulario' })} disabled={crear.isPending}>
                Volver a los datos
              </button>
            </>
          }
        >
          <p className="crear-duplicados-texto">
            Ya hay elementos de la misma categoría a menos de 3 m. Si es el mismo, tócalo para agregarle las evidencias en vez de crearlo otra vez.
          </p>
          <ul className="lista crear-duplicados">
            {paso.cercanos.map((cercano) => (
              <li key={cercano.id}>
                <Link to={`/lugares/${cercano.id}`} className="lista-item">
                  <span className="lista-item-textos">
                    <span className="lista-item-titulo">{cercano.nombre}</span>
                    <span className="lista-item-detalle">a {Math.round(cercano.distanciaM)} m</span>
                  </span>
                  <FlechaLista />
                </Link>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </div>
  )
}
