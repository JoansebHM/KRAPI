import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useAuth } from '../auth/useAuth'
import { EditarElemento } from '../elementos/EditarElemento'
import { EditarZona } from '../zonas/EditarZona'
import { useArchivarLugar, useBorrarLugar, useCambiarEstadoLugar, type DetalleLugar } from './api'
import { EditarPunto } from './EditarPunto'

/** Editar, mover (o redibujar una zona), cerrar un punto, archivar (o recuperar) y borrar un lugar o un elemento. */
export function AccionesDelLugar({ lugar }: { lugar: DetalleLugar }) {
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
  const esZona = lugar.tipo === 'zona'
  const esElemento = lugar.tipo === 'elemento'
  const nombreTipo = esElemento ? 'Elemento' : 'Lugar'
  // Solo se borra de verdad un lugar sin estudios (o un elemento sin evidencias), y solo quien lo creó o un admin (lo asegura RLS).
  const puedeBorrar =
    lugar.estudios === 0 && lugar.evidencias === 0 && (esAdmin || (lugar.creadoPor !== null && lugar.creadoPor === perfil?.id))

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
        notificar.exito(`${nombreTipo} recuperado`, { descripcion: `«${lugar.nombre}» volvió al mapa.` })
        return
      }
      navigate('/')
      notificar.exito(`${nombreTipo} archivado`, {
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
      notificar.exito(`${nombreTipo} borrado`, { descripcion: `«${lugar.nombre}» se borró.` })
    } catch (error) {
      notificar.error('No se pudo borrar', {
        descripcion: mensajeErrorDatos(error, {
          sinPermiso: esElemento
            ? 'Solo se borra un elemento sin evidencias, y solo quien lo creó o un admin.'
            : 'Solo se borra un lugar sin estudios, y solo quien lo creó o un admin.',
        }),
      })
    }
  }

  return (
    <div className="ficha-acciones">
      {archivado ? (
        <button type="button" className="btn btn-primary btn-block" onClick={() => void cambiarArchivado(false)} disabled={procesando}>
          Recuperar {esElemento ? 'elemento' : 'lugar'}
        </button>
      ) : (
        <div className="ficha-acciones-grilla">
          <button type="button" className="btn btn-secondary" onClick={() => setEditando(true)} disabled={procesando}>
            Editar datos
          </button>
          <Link to={`/lugares/${lugar.id}/${esZona ? 'redibujar' : 'mover'}`} className="btn btn-secondary">
            {esZona ? 'Redibujar' : 'Mover'}
          </Link>
          {lugar.tipo === 'punto' && (
            <button type="button" className="btn btn-secondary" onClick={() => void alternarCerrado()} disabled={procesando}>
              {cerrado ? 'Marcar activo' : 'Marcar cerrado'}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => void cambiarArchivado(true)} disabled={procesando}>
            Archivar
          </button>
        </div>
      )}
      {puedeBorrar && (
        <button type="button" className="btn-texto btn-texto-peligro" onClick={() => setConfirmarBorrar(true)} disabled={procesando}>
          {esZona ? 'Borrar zona' : esElemento ? 'Borrar elemento' : 'Borrar lugar'}
        </button>
      )}

      {editando &&
        (esZona ? (
          <EditarZona lugar={lugar} onCerrar={() => setEditando(false)} />
        ) : esElemento ? (
          <EditarElemento lugar={lugar} onCerrar={() => setEditando(false)} />
        ) : (
          <EditarPunto lugar={lugar} onCerrar={() => setEditando(false)} />
        ))}

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
          <p>{esElemento ? 'No tiene evidencias' : 'No tiene estudios'}, así que se borra de verdad. No se puede deshacer.</p>
          <p>Si solo quieres sacarlo del mapa, mejor archívalo: así se puede recuperar.</p>
        </Dialog>
      )}
    </div>
  )
}
