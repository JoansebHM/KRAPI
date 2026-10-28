import { MessageCircle, Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { Panel } from '../../components/Panel'
import { useCategorias } from '../categorias/api'
import { COLOR_SIN_CATEGORIA } from '../categorias/colores'
import { IconoCategoria } from '../categorias/IconoCategoria'
import { useCamposEstudioNuevo, type CamposEstudio } from '../estudios/api'
import { FichaElemento } from '../elementos/FichaElemento'
import { EstudiosDelLugar } from '../estudios/EstudiosDelLugar'
import { useTiposZona } from '../tiposZona/api'
import { ComentariosZona } from '../zonas/ComentariosZona'
import { areaM2, esquinasDe, mostrarArea } from '../zonas/geometria'
import { LocalesEnZona } from '../zonas/LocalesEnZona'
import '../tiposZona/TiposZonaPage.css'
import { AccionesDelLugar } from './AccionesDelLugar'
import { useLugar, useLugares } from './api'
import { enlacesTelefono } from './telefono'
import './FichaLugar.css'

/** Ficha de un lugar, que se abre al tocarlo en el mapa: sus datos, sus acciones y su histórico de estudios (o sus evidencias, si es un elemento). */
export function FichaLugar() {
  const { id } = useParams()
  const [parametros] = useSearchParams()
  const { data: lugar, isPending, isError, refetch } = useLugar(id)
  const { data: categorias } = useCategorias()
  const { data: tiposZona } = useTiposZona()
  const { data: lugaresVisibles } = useLugares()
  const camposEstudioNuevo = useCamposEstudioNuevo()
  const [nuevoEstudio, setNuevoEstudio] = useState<CamposEstudio | null>(null)
  const intentoAutoabrir = useRef(false)

  // Al llegar con ?estudio=nuevo (desde una zona asignada), se abre el formulario solo, con la
  // salida ya elegida (?salida=) si venía de ahí. No aplica a un lugar archivado.
  useEffect(() => {
    if (intentoAutoabrir.current || !lugar || lugar.archivadaEn !== null || parametros.get('estudio') !== 'nuevo') return
    intentoAutoabrir.current = true
    const salidaId = parametros.get('salida')
    setNuevoEstudio(salidaId ? { ...camposEstudioNuevo(), salidaId } : camposEstudioNuevo())
  }, [lugar, camposEstudioNuevo, parametros])

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

  if (!lugar) {
    return (
      <Panel titulo="Lugar no encontrado">
        <EstadoVacio
          icono={<IconoCategoria icono={null} color={COLOR_SIN_CATEGORIA} tamano={48} />}
          titulo="Este lugar no existe"
          descripcion="Puede que lo hayan borrado o que el enlace esté mal."
          accion={
            <Link to="/" className="btn btn-secondary">
              Volver al mapa
            </Link>
          }
        />
      </Panel>
    )
  }

  if (lugar.tipo === 'elemento') return <FichaElemento key={lugar.id} lugar={lugar} />

  const categoria = lugar.categoriaId ? categorias?.find((c) => c.id === lugar.categoriaId) : undefined
  const tipoZona = lugar.tipoZonaId ? tiposZona?.find((tipo) => tipo.id === lugar.tipoZonaId) : undefined
  const esZona = lugar.tipo === 'zona'
  // El área se calcula de la forma que trae el mapa (un lugar archivado no está en él).
  const forma = lugaresVisibles?.find((visible) => visible.id === lugar.id)
  const area = forma?.tipo === 'zona' ? areaM2(esquinasDe(forma.geometria.coordinates[0])) : null
  const cerrado = lugar.estado === 'cerrada'
  const archivado = lugar.archivadaEn !== null
  const telefono = lugar.contactoTelefono ? enlacesTelefono(lugar.contactoTelefono) : null

  return (
    <Panel
      titulo={lugar.nombre}
      subtitulo={esZona ? `Zona${tipoZona ? ` · ${tipoZona.nombre}` : ''}` : (categoria?.nombre ?? 'Sin categoría')}
      pie={
        archivado ? undefined : (
          <button type="button" className="fab" onClick={() => setNuevoEstudio(camposEstudioNuevo())}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Agregar estudio
          </button>
        )
      }
    >
      {archivado && <p className="alert alert-info ficha-archivado">Este lugar está archivado: no aparece en el mapa.</p>}

      <dl className="ficha-datos">
        {!esZona && (
          <div>
            <dt>Categoría</dt>
            <dd className="ficha-categoria">
              <IconoCategoria icono={categoria?.icono} color={categoria?.color ?? COLOR_SIN_CATEGORIA} tamano={28} />
              {categoria?.nombre ?? 'Sin categoría'}
            </dd>
          </div>
        )}
        {esZona && (
          <div>
            <dt>Tipo de zona</dt>
            <dd className="ficha-categoria">
              {tipoZona && <span className="tipo-zona-muestra tipo-zona-muestra-chica" style={{ background: tipoZona.color }} aria-hidden="true" />}
              {tipoZona?.nombre ?? 'Sin tipo'}
            </dd>
          </div>
        )}
        {esZona && area !== null && (
          <div>
            <dt>Área</dt>
            <dd>{mostrarArea(area)}</dd>
          </div>
        )}
        {!esZona && (
          <div>
            <dt>Estado</dt>
            <dd>
              <span className={`ficha-estado${cerrado ? ' ficha-estado-cerrado' : ''}`}>{cerrado ? 'Cerrado' : 'Activo'}</span>
            </dd>
          </div>
        )}
        {(lugar.direccion || lugar.complemento) && (
          <div>
            <dt>Dirección</dt>
            <dd>
              {lugar.direccion}
              {lugar.complemento && <span className="ficha-complemento">{lugar.complemento}</span>}
            </dd>
          </div>
        )}
        {(lugar.contactoNombre || telefono) && (
          <div>
            <dt>Contacto</dt>
            <dd>
              {lugar.contactoNombre}
              {telefono && (
                <span className="ficha-telefono">
                  <a href={telefono.llamar} className="ficha-telefono-enlace" aria-label={`Llamar al ${lugar.contactoTelefono}`}>
                    <Phone size={18} aria-hidden="true" />
                    {lugar.contactoTelefono}
                  </a>
                  {telefono.whatsapp && (
                    <a
                      href={telefono.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ficha-telefono-enlace"
                      aria-label={`Escribir por WhatsApp al ${lugar.contactoTelefono}`}
                    >
                      <MessageCircle size={18} aria-hidden="true" />
                      WhatsApp
                    </a>
                  )}
                </span>
              )}
            </dd>
          </div>
        )}
        {lugar.descripcion && (
          <div>
            <dt>Descripción</dt>
            <dd className="ficha-descripcion">{lugar.descripcion}</dd>
          </div>
        )}
      </dl>

      <AccionesDelLugar lugar={lugar} />

      {esZona && !archivado && <LocalesEnZona zonaId={lugar.id} />}
      {esZona && <ComentariosZona zonaId={lugar.id} />}

      <EstudiosDelLugar ubicacionId={lugar.id} nombreLugar={lugar.nombre} esZona={esZona} nuevo={nuevoEstudio} onCambiarNuevo={setNuevoEstudio} />
    </Panel>
  )
}
