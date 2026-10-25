import { MessageCircle, Phone } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { Panel } from '../../components/Panel'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useAuth } from '../auth/useAuth'
import { useCategorias } from '../categorias/api'
import { COLOR_SIN_CATEGORIA } from '../categorias/colores'
import { IconoCategoria } from '../categorias/IconoCategoria'
import { useCamposEstudioNuevo, type CamposEstudio } from '../estudios/api'
import { EstudiosDelLugar } from '../estudios/EstudiosDelLugar'
import { useArchivarLugar, useBorrarLugar, useCambiarEstadoLugar, useLugar, type DetalleLugar } from './api'
import { EditarPunto } from './EditarPunto'
import { enlacesTelefono } from './telefono'
import './FichaLugar.css'

/** Ficha de un lugar, que se abre al tocarlo en el mapa: sus datos, sus acciones y su histórico de estudios. */
export function FichaLugar() {
  const { id } = useParams()
  const { data: lugar, isPending, isError, refetch } = useLugar(id)
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

  const categoria = lugar.categoriaId ? categorias?.find((c) => c.id === lugar.categoriaId) : undefined
  const esZona = lugar.tipo === 'zona'
  const cerrado = lugar.estado === 'cerrada'
  const archivado = lugar.archivadaEn !== null
  const telefono = lugar.contactoTelefono ? enlacesTelefono(lugar.contactoTelefono) : null

  return (
    <Panel
      titulo={lugar.nombre}
      subtitulo={esZona ? 'Zona' : (categoria?.nombre ?? 'Sin categoría')}
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
        <div>
          <dt>Estado</dt>
          <dd>
            <span className={`ficha-estado${cerrado ? ' ficha-estado-cerrado' : ''}`}>{cerrado ? 'Cerrado' : 'Activo'}</span>
          </dd>
        </div>
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

      {!esZona && <AccionesDelPunto lugar={lugar} />}

      <EstudiosDelLugar ubicacionId={lugar.id} nombreLugar={lugar.nombre} nuevo={nuevoEstudio} onCambiarNuevo={setNuevoEstudio} />
    </Panel>
  )
}

/** Editar, mover, cerrar, archivar (o recuperar) y borrar un punto. */
function AccionesDelPunto({ lugar }: { lugar: DetalleLugar }) {
  const navigate = useNavigate()
  const { perfil, esAdmin } = useAuth()
  const cambiarEstado = useCambiarEstadoLugar()
  const archivarLugar = useArchivarLugar()
  const borrar = useBorrarLugar()
  const [editando, setEditando] = useState(false)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const procesando = cambiarEstado.isPending || archivarLugar.isPending || borrar.isPending
  const cerrado = lugar.estado === 'cerrada'
  const archivado = lugar.archivadaEn !== null
  // Solo se borra de verdad un lugar sin estudios, y solo quien lo creó o un admin (lo asegura RLS).
  const puedeBorrar = lugar.estudios === 0 && (esAdmin || (lugar.creadoPor !== null && lugar.creadoPor === perfil?.id))

  async function alternarCerrado() {
    try {
      await cambiarEstado.mutateAsync({ id: lugar.id, estado: cerrado ? 'activa' : 'cerrada' })
      notificar.exito(cerrado ? 'Marcado como activo' : 'Marcado como cerrado', {
        descripcion: cerrado ? `«${lugar.nombre}» vuelve a estar activo.` : `«${lugar.nombre}» conserva su histórico.`,
      })
    } catch (error) {
      notificar.error('No se pudo cambiar el estado', { descripcion: mensajeErrorDatos(error) })
    }
  }

  async function cambiarArchivado(archivar: boolean) {
    try {
      await archivarLugar.mutateAsync({ id: lugar.id, archivar })
      if (!archivar) {
        notificar.exito('Lugar recuperado', { descripcion: `«${lugar.nombre}» volvió al mapa.` })
        return
      }
      navigate('/')
      notificar.exito('Lugar archivado', {
        descripcion: `«${lugar.nombre}» ya no aparece en el mapa.`,
        accion: {
          texto: 'Deshacer',
          alHacer: () =>
            archivarLugar.mutate(
              { id: lugar.id, archivar: false },
              { onError: (error) => notificar.error('No se pudo recuperar', { descripcion: mensajeErrorDatos(error) }) },
            ),
        },
      })
    } catch (error) {
      notificar.error(archivar ? 'No se pudo archivar' : 'No se pudo recuperar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  async function borrarLugar() {
    try {
      await borrar.mutateAsync({ id: lugar.id })
      setConfirmarBorrar(false)
      navigate('/')
      notificar.exito('Lugar borrado', { descripcion: `«${lugar.nombre}» se borró.` })
    } catch (error) {
      notificar.error('No se pudo borrar', {
        descripcion: mensajeErrorDatos(error, { sinPermiso: 'Solo se borra un lugar sin estudios, y solo quien lo creó o un admin.' }),
      })
    }
  }

  return (
    <div className="ficha-acciones">
      {archivado ? (
        <button type="button" className="btn btn-primary btn-block" onClick={() => void cambiarArchivado(false)} disabled={procesando}>
          Recuperar lugar
        </button>
      ) : (
        <div className="ficha-acciones-grilla">
          <button type="button" className="btn btn-secondary" onClick={() => setEditando(true)} disabled={procesando}>
            Editar datos
          </button>
          <Link to={`/lugares/${lugar.id}/mover`} className="btn btn-secondary">
            Mover
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => void alternarCerrado()} disabled={procesando}>
            {cerrado ? 'Marcar activo' : 'Marcar cerrado'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void cambiarArchivado(true)} disabled={procesando}>
            Archivar
          </button>
        </div>
      )}
      {puedeBorrar && (
        <button type="button" className="btn-texto btn-texto-peligro" onClick={() => setConfirmarBorrar(true)} disabled={procesando}>
          Borrar lugar
        </button>
      )}

      {editando && <EditarPunto lugar={lugar} onCerrar={() => setEditando(false)} />}

      {confirmarBorrar && (
        <Dialog
          titulo={`¿Borrar «${lugar.nombre}»?`}
          onCerrar={borrar.isPending ? undefined : () => setConfirmarBorrar(false)}
          acciones={
            <>
              <button type="button" className="btn btn-danger btn-block" onClick={() => void borrarLugar()} disabled={borrar.isPending}>
                {borrar.isPending ? 'Borrando…' : 'Borrar'}
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setConfirmarBorrar(false)} disabled={borrar.isPending}>
                Cancelar
              </button>
            </>
          }
        >
          <p>No tiene estudios, así que se borra de verdad. No se puede deshacer.</p>
          <p>Si solo quieres sacarlo del mapa, mejor archívalo: así se puede recuperar.</p>
        </Dialog>
      )}
    </div>
  )
}
