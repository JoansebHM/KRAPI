import { useMemo, useState } from 'react'
import { Buscador } from '../../components/Buscador'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { Panel } from '../../components/Panel'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { normalizar, plural } from '../../lib/texto'
import {
  semillaDe,
  useEliminarResponsable,
  useResponsables,
  useRestaurarResponsable,
  type Responsable,
} from './api'
import { Avatar } from './Avatar'
import { ResponsableFormulario } from './ResponsableFormulario'

type Formulario = { tipo: 'nuevo' } | { tipo: 'editar'; responsable: Responsable }

export function ResponsablesPage() {
  const { data: responsables, isPending, isError, refetch } = useResponsables()
  const eliminar = useEliminarResponsable()
  const restaurar = useRestaurarResponsable()
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [porEliminar, setPorEliminar] = useState<Responsable | null>(null)

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda)
    return (responsables ?? []).filter((responsable) => normalizar(responsable.nombre).includes(termino))
  }, [responsables, busqueda])

  async function confirmarEliminar(responsable: Responsable) {
    try {
      const eliminado = await eliminar.mutateAsync(responsable)
      setPorEliminar(null)
      notificar.exito('Responsable eliminado', {
        descripcion:
          responsable.estudios > 0
            ? `Se quitó de ${plural(responsable.estudios, 'estudio')}.`
            : `${responsable.nombre} se eliminó.`,
        accion: {
          texto: 'Deshacer',
          alHacer: () => {
            restaurar.mutate(eliminado, {
              onSuccess: () => notificar.info('Responsable restaurado', { descripcion: `${responsable.nombre} volvió.` }),
              onError: (error) =>
                notificar.error('No se pudo restaurar', {
                  descripcion: mensajeErrorDatos(error, { duplicado: 'Ya se agregó otra persona con ese nombre.' }),
                }),
            })
          },
        },
      })
    } catch (error) {
      notificar.error('No se pudo eliminar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  const total = responsables?.length ?? 0
  const botonNuevo = (
    <button type="button" className="fab" onClick={() => setFormulario({ tipo: 'nuevo' })}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Nuevo responsable
    </button>
  )

  return (
    <Panel
      titulo="Responsables"
      subtitulo={responsables ? plural(total, 'persona') : undefined}
      pie={total > 0 ? botonNuevo : undefined}
    >
      {isPending && <ListaCargando />}

      {isError && <ErrorCarga mensaje="No se pudieron cargar los responsables." onReintentar={() => void refetch()} />}

      {responsables && total === 0 && (
        <EstadoVacio
          icono={<IconoPersonas />}
          titulo="Aún no hay responsables"
          descripcion="Agrega a las personas del equipo para poder elegirlas como responsables de cada estudio."
          accion={
            <button type="button" className="btn btn-primary" onClick={() => setFormulario({ tipo: 'nuevo' })}>
              Agregar el primero
            </button>
          }
        />
      )}

      {responsables && total > 0 && (
        <>
          <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar persona" />

          {filtrados.length === 0 ? (
            <EstadoVacio icono={<IconoPersonas />} titulo={`Nadie coincide con «${busqueda.trim()}»`} />
          ) : (
            <ul className="lista">
              {filtrados.map((responsable) => (
                <li key={responsable.id}>
                  <button
                    type="button"
                    className="lista-item"
                    onClick={() => setFormulario({ tipo: 'editar', responsable })}
                  >
                    <Avatar semilla={semillaDe(responsable)} />
                    <span className="lista-item-textos">
                      <span className="lista-item-titulo">{responsable.nombre}</span>
                      <span className="lista-item-detalle">
                        {responsable.estudios > 0 ? `En ${plural(responsable.estudios, 'estudio')}` : 'Sin estudios aún'}
                      </span>
                    </span>
                    <Flecha />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {formulario && (
        <ResponsableFormulario
          responsable={formulario.tipo === 'editar' ? formulario.responsable : undefined}
          existentes={responsables ?? []}
          onCerrar={() => setFormulario(null)}
          onEliminar={(responsable) => {
            // Se cierra el formulario para que la confirmación quede sola en pantalla.
            setFormulario(null)
            setPorEliminar(responsable)
          }}
        />
      )}

      {porEliminar && (
        <Dialog
          titulo={`¿Eliminar a ${porEliminar.nombre}?`}
          onCerrar={eliminar.isPending ? undefined : () => setPorEliminar(null)}
          acciones={
            <>
              <button
                type="button"
                className="btn btn-danger btn-block"
                disabled={eliminar.isPending}
                onClick={() => void confirmarEliminar(porEliminar)}
              >
                {eliminar.isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                disabled={eliminar.isPending}
                onClick={() => setPorEliminar(null)}
              >
                Cancelar
              </button>
            </>
          }
        >
          <p>
            {porEliminar.estudios > 0
              ? `Aparece en ${plural(porEliminar.estudios, 'estudio')} y se quitará de ${porEliminar.estudios === 1 ? 'él' : 'ellos'}. Los estudios no se borran.`
              : 'No aparece en ningún estudio.'}
          </p>
          <p>Podrás deshacerlo durante unos segundos.</p>
        </Dialog>
      )}
    </Panel>
  )
}

function Flecha() {
  return (
    <svg className="lista-item-flecha" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function IconoPersonas() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </svg>
  )
}
