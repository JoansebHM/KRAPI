import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { FlechaLista } from '../../components/FlechaLista'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useCamposEstudioNuevo, useGuardarEstudio, type CamposEstudio } from '../estudios/api'
import { FormularioEstudio } from '../estudios/FormularioEstudio'
import { dentroDeManila } from '../map/manila'
import { useMapa } from '../map/mapaContexto'
import { buscarCercanos, PUNTO_VACIO, useCrearPunto, type CamposPunto, type LugarCercano } from './api'
import { FormularioPunto } from './FormularioPunto'
import './CrearPunto.css'

type Paso =
  | { tipo: 'ubicar' }
  | { tipo: 'duplicados' }
  | { tipo: 'formulario' }
  /** El estudio va para el lugar nuevo (existente = null) o para un lugar que ya estaba a menos de 15 m. */
  | { tipo: 'estudio'; existente: LugarCercano | null }

/**
 * Crear un punto: se mueve el mapa bajo una mira fija en el centro, se revisa que no exista
 * otro lugar a menos de 15 m, se llenan sus datos y su primer estudio.
 */
export function CrearPunto() {
  const mapa = useMapa()
  const navigate = useNavigate()
  const [centro, setCentro] = useState(() => mapa?.getCenter().toArray() ?? null)
  const [paso, setPaso] = useState<Paso>({ tipo: 'ubicar' })
  // La posición queda fija al pasar a los datos, aunque luego se mueva el mapa.
  const [posicion, setPosicion] = useState<[number, number] | null>(null)
  const [campos, setCampos] = useState<CamposPunto>(PUNTO_VACIO)
  const [cercanos, setCercanos] = useState<LugarCercano[]>([])
  const [estudio, setEstudio] = useState<CamposEstudio | null>(null)
  const camposEstudioNuevo = useCamposEstudioNuevo()
  const crearPunto = useCrearPunto()
  const guardarEstudio = useGuardarEstudio()
  const [revisando, setRevisando] = useState(false)
  const [localizando, setLocalizando] = useState(false)

  useEffect(() => {
    if (!mapa) return
    const actualizar = () => setCentro(mapa.getCenter().toArray())
    actualizar()
    mapa.on('move', actualizar)
    return () => {
      mapa.off('move', actualizar)
    }
  }, [mapa])

  const dentro = centro ? dentroDeManila(centro[0], centro[1]) : false

  function irAMiUbicacion() {
    if (!mapa) return
    if (!('geolocation' in navigator)) {
      notificar.error('No se puede usar tu ubicación', { descripcion: 'Este navegador no lo permite.' })
      return
    }
    setLocalizando(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocalizando(false)
        if (!dentroDeManila(coords.longitude, coords.latitude)) {
          notificar.aviso('Estás fuera de Manila', { descripcion: 'Mueve el mapa hasta el lugar que quieres registrar.' })
        }
        mapa.flyTo({ center: [coords.longitude, coords.latitude], zoom: Math.max(mapa.getZoom(), 18) })
      },
      () => {
        setLocalizando(false)
        notificar.error('No se pudo obtener tu ubicación', { descripcion: 'Revisa que el permiso de ubicación esté activado.' })
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  async function continuar() {
    if (!centro || !dentro) return
    const [lng, lat] = centro
    setRevisando(true)
    try {
      const encontrados = await buscarCercanos(lng, lat)
      setPosicion([lng, lat])
      setCercanos(encontrados)
      setPaso(encontrados.length > 0 ? { tipo: 'duplicados' } : { tipo: 'formulario' })
    } catch (error) {
      notificar.error('No se pudo revisar la ubicación', { descripcion: mensajeErrorDatos(error) })
    } finally {
      setRevisando(false)
    }
  }

  function volverAUbicar() {
    setPaso({ tipo: 'ubicar' })
  }

  const verFicha = (id: string) => ({ texto: 'Ver ficha', alHacer: () => navigate(`/lugares/${id}`) })

  /** Abre el estudio con los datos que ya tenía (si se volvió atrás) o con unos nuevos. */
  function irAlEstudio(existente: LugarCercano | null) {
    setEstudio((anterior) => anterior ?? camposEstudioNuevo())
    setPaso({ tipo: 'estudio', existente })
  }

  async function guardarLugar() {
    const [lng, lat] = posicion!
    return crearPunto.mutateAsync({ ...campos, lng, lat })
  }

  async function soloGuardarLugar() {
    try {
      const id = await guardarLugar()
      notificar.exito('Lugar guardado', { descripcion: `«${campos.nombre.trim()}» ya está en el mapa.`, accion: verFicha(id) })
      navigate('/')
    } catch (error) {
      notificar.error('No se pudo guardar el lugar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  async function guardarConEstudio(existente: LugarCercano | null) {
    if (existente) {
      await guardarEstudio.mutateAsync({ ...estudio!, ubicacionId: existente.id })
      notificar.exito('Estudio guardado', { descripcion: `Se agregó al histórico de «${existente.nombre}».`, accion: verFicha(existente.id) })
      navigate('/')
      return
    }
    // Si falla el lugar, el formulario del estudio muestra el error y queda abierto.
    const id = await guardarLugar()
    try {
      await guardarEstudio.mutateAsync({ ...estudio!, ubicacionId: id })
      notificar.exito('Lugar y estudio guardados', { descripcion: `«${campos.nombre.trim()}» ya está en el mapa.`, accion: verFicha(id) })
    } catch (error) {
      // El lugar ya quedó guardado: no se debe volver a crear. El estudio se agrega desde su ficha.
      notificar.error('El lugar se guardó, pero el estudio no', {
        descripcion: `${mensajeErrorDatos(error)} Agrégalo desde la ficha del lugar.`,
        accion: verFicha(id),
      })
    }
    navigate('/')
  }

  return (
    <div className="crear-punto">
      <div className={`crear-mira${dentro ? '' : ' crear-mira-fuera'}`} aria-hidden="true">
        <svg viewBox="0 0 48 48" width="48" height="48">
          <circle cx="24" cy="24" r="10" />
          <path d="M24 2v12M24 34v12M2 24h12M34 24h12" />
          <circle cx="24" cy="24" r="2" className="crear-mira-centro" />
        </svg>
      </div>

      <p className={`crear-aviso${dentro ? '' : ' crear-aviso-fuera'}`} role="status">
        {dentro ? 'Mueve el mapa hasta que la mira quede sobre el local.' : 'No se puede registrar fuera de Manila.'}
      </p>

      <button
        type="button"
        className="crear-mi-ubicacion"
        onClick={irAMiUbicacion}
        disabled={localizando || !mapa}
        aria-label="Mi ubicación"
        title="Mi ubicación"
        aria-busy={localizando}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>

      <div className="crear-barra">
        <Link to="/" className="btn btn-secondary">
          Cancelar
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => void continuar()} disabled={!dentro || revisando}>
          {revisando ? 'Revisando…' : 'Continuar'}
        </button>
      </div>

      {paso.tipo === 'duplicados' && (
        <Dialog
          titulo="¿Es alguno de estos lugares?"
          onCerrar={volverAUbicar}
          acciones={
            <>
              <button type="button" className="btn btn-primary btn-block" onClick={() => setPaso({ tipo: 'formulario' })}>
                No, es un lugar nuevo
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={volverAUbicar}>
                Volver a ubicar
              </button>
            </>
          }
        >
          <p className="crear-duplicados-texto">Ya hay lugares registrados a menos de 15 m. Si es el mismo, tócalo para agregarle el estudio en vez de crearlo otra vez.</p>
          <ul className="lista crear-duplicados">
            {cercanos.map((cercano) => (
              <li key={cercano.id}>
                <button type="button" className="lista-item" onClick={() => irAlEstudio(cercano)}>
                  <span className="lista-item-textos">
                    <span className="lista-item-titulo">{cercano.nombre}</span>
                    <span className="lista-item-detalle">
                    a {Math.round(cercano.distanciaM)} m{cercano.estado === 'cerrada' ? ' · cerrado' : ''}
                    </span>
                  </span>
                  <FlechaLista />
                </button>
              </li>
            ))}
          </ul>
        </Dialog>
      )}

      {paso.tipo === 'formulario' && posicion && (
        <FormularioPunto
          campos={campos}
          onCambiar={setCampos}
          onVolver={volverAUbicar}
          onSiguiente={() => irAlEstudio(null)}
          onSoloGuardar={soloGuardarLugar}
        />
      )}

      {paso.tipo === 'estudio' && estudio && (
        <FormularioEstudio
          titulo="Nuevo estudio"
          lugar={paso.existente?.nombre ?? campos.nombre.trim()}
          campos={estudio}
          onCambiar={setEstudio}
          onGuardar={() => guardarConEstudio(paso.existente)}
          textoGuardar={paso.existente ? 'Guardar estudio' : 'Guardar lugar y estudio'}
          onCerrar={() => setPaso(paso.existente ? { tipo: 'duplicados' } : { tipo: 'formulario' })}
          otrasAcciones={(guardando) => (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => setPaso(paso.existente ? { tipo: 'duplicados' } : { tipo: 'formulario' })}
              disabled={guardando}
            >
              {paso.existente ? 'Volver a los lugares cercanos' : 'Volver a los datos del lugar'}
            </button>
          )}
        />
      )}
    </div>
  )
}
