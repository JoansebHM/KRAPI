import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { Panel } from '../../components/Panel'
import { useCategorias } from '../categorias/api'
import { COLOR_SIN_CATEGORIA } from '../categorias/colores'
import { IconoCategoria } from '../categorias/IconoCategoria'
import { useCamposEstudioNuevo, type CamposEstudio } from '../estudios/api'
import { EstudiosDelLugar } from '../estudios/EstudiosDelLugar'
import { useLugares } from './api'
import './FichaLugar.css'

/** Ficha de un lugar, que se abre al tocarlo en el mapa: sus datos y su histórico de estudios. */
export function FichaLugar() {
  const { id } = useParams()
  const { data: lugares, isPending, isError, refetch } = useLugares()
  const { data: categorias } = useCategorias()
  const camposEstudioNuevo = useCamposEstudioNuevo()
  const [nuevoEstudio, setNuevoEstudio] = useState<CamposEstudio | null>(null)

  if (isPending) {
    return (
      <Panel titulo="Lugar">
        <ListaCargando filas={2} />
      </Panel>
    )
  }

  if (isError) {
    return (
      <Panel titulo="Lugar">
        <ErrorCarga mensaje="No se pudo cargar el lugar." onReintentar={() => refetch()} />
      </Panel>
    )
  }

  const lugar = lugares.find((l) => l.id === id)
  if (!lugar) {
    return (
      <Panel titulo="Lugar no encontrado">
        <EstadoVacio
          icono={<IconoCategoria icono={null} color={COLOR_SIN_CATEGORIA} tamano={48} />}
          titulo="Este lugar no está en el mapa"
          descripcion="Puede que lo hayan archivado o que el enlace esté mal."
          accion={
            <Link to="/" className="btn btn-secondary">
              Volver al mapa
            </Link>
          }
        />
      </Panel>
    )
  }

  const categoria = lugar.categoriaId ? categorias?.find((c) => c.id === lugar.categoriaId) : undefined
  const esZona = lugar.tipo === 'zona'
  const cerrado = lugar.estado === 'cerrada'

  return (
    <Panel
      titulo={lugar.nombre}
      subtitulo={esZona ? 'Zona' : (categoria?.nombre ?? 'Sin categoría')}
      pie={
        <button type="button" className="fab" onClick={() => setNuevoEstudio(camposEstudioNuevo())}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Agregar estudio
        </button>
      }
    >
      <dl className="ficha-datos">
        <div>
          <dt>Tipo</dt>
          <dd>{esZona ? 'Zona' : 'Punto (local)'}</dd>
        </div>
        {!esZona && (
          <div>
            <dt>Categoría</dt>
            <dd className="ficha-categoria">
              <IconoCategoria icono={categoria?.icono} color={categoria?.color ?? COLOR_SIN_CATEGORIA} tamano={28} />
              {categoria?.nombre ?? 'Sin categoría'}
            </dd>
          </div>
        )}
        <div>
          <dt>Estado</dt>
          <dd>
            <span className={`ficha-estado${cerrado ? ' ficha-estado-cerrado' : ''}`}>{cerrado ? 'Cerrado' : 'Activo'}</span>
          </dd>
        </div>
      </dl>

      <EstudiosDelLugar ubicacionId={lugar.id} nombreLugar={lugar.nombre} nuevo={nuevoEstudio} onCambiarNuevo={setNuevoEstudio} />
    </Panel>
  )
}
