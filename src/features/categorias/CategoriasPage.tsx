import { useMemo, useState } from 'react'
import { Buscador } from '../../components/Buscador'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { FlechaLista } from '../../components/FlechaLista'
import { Panel } from '../../components/Panel'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { normalizar, plural } from '../../lib/texto'
import { NOMBRE_USO, useCategorias, useEliminarCategoria, useRestaurarCategoria, type Categoria } from './api'
import { CategoriaFormulario } from './CategoriaFormulario'
import { IconoCategoria } from './IconoCategoria'
import './CategoriasPage.css'

type Formulario = { tipo: 'nueva' } | { tipo: 'editar'; categoria: Categoria }

export function CategoriasPage() {
  const { data: categorias, isPending, isError, refetch } = useCategorias()
  const eliminar = useEliminarCategoria()
  const restaurar = useRestaurarCategoria()
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [porEliminar, setPorEliminar] = useState<Categoria | null>(null)

  const filtradas = useMemo(() => {
    const termino = normalizar(busqueda)
    return (categorias ?? []).filter((categoria) => normalizar(categoria.nombre).includes(termino))
  }, [categorias, busqueda])

  async function confirmarEliminar(categoria: Categoria) {
    try {
      const eliminada = await eliminar.mutateAsync(categoria)
      setPorEliminar(null)
      notificar.exito('Categoría eliminada', {
        descripcion:
          categoria.ubicaciones > 0
            ? `${plural(categoria.ubicaciones, 'ubicación', 'ubicaciones')} quedaron sin categoría.`
            : `«${categoria.nombre}» se eliminó.`,
        accion: {
          texto: 'Deshacer',
          alHacer: () => {
            restaurar.mutate(eliminada, {
              onSuccess: () => notificar.info('Categoría restaurada', { descripcion: `«${categoria.nombre}» volvió.` }),
              onError: (error) =>
                notificar.error('No se pudo restaurar', {
                  descripcion: mensajeErrorDatos(error, { duplicado: 'Ya se creó otra categoría con ese nombre.' }),
                }),
            })
          },
        },
      })
    } catch (error) {
      notificar.error('No se pudo eliminar', {
        descripcion: mensajeErrorDatos(error, { sinPermiso: 'Solo un admin puede eliminar categorías.' }),
      })
    }
  }

  const total = categorias?.length ?? 0
  const botonNueva = (
    <button type="button" className="fab" onClick={() => setFormulario({ tipo: 'nueva' })}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Nueva categoría
    </button>
  )

  return (
    <Panel
      titulo="Categorías"
      subtitulo={categorias ? plural(total, 'categoría') : undefined}
      pie={total > 0 ? botonNueva : undefined}
    >
      {isPending && <ListaCargando />}

      {isError && <ErrorCarga mensaje="No se pudieron cargar las categorías." onReintentar={() => void refetch()} />}

      {categorias && total === 0 && (
        <EstadoVacio
          icono={<IconoEtiqueta />}
          titulo="Aún no hay categorías"
          descripcion="Las categorías clasifican los lugares del barrio (comercio, café, hotelería…) y los elementos (canecas, postes, árboles…). Cada una tiene un color en el mapa."
          accion={
            <button type="button" className="btn btn-primary" onClick={() => setFormulario({ tipo: 'nueva' })}>
              Crear la primera
            </button>
          }
        />
      )}

      {categorias && total > 0 && (
        <>
          <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar categoría" />

          {filtradas.length === 0 ? (
            <EstadoVacio icono={<IconoEtiqueta />} titulo={`Ninguna categoría coincide con «${busqueda.trim()}»`} />
          ) : (
            <ul className="lista">
              {filtradas.map((categoria) => (
                <li key={categoria.id}>
                  <button
                    type="button"
                    className="lista-item"
                    onClick={() => setFormulario({ tipo: 'editar', categoria })}
                  >
                    <IconoCategoria icono={categoria.icono} color={categoria.color} />
                    <span className="lista-item-textos">
                      <span className="lista-item-titulo">{categoria.nombre}</span>
                      <span className="lista-item-detalle">
                        {NOMBRE_USO[categoria.aplica_a]} ·{' '}
                        {categoria.ubicaciones > 0
                          ? plural(categoria.ubicaciones, 'ubicación', 'ubicaciones')
                          : 'Sin ubicaciones'}
                      </span>
                    </span>
                    <FlechaLista />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {formulario && (
        <CategoriaFormulario
          categoria={formulario.tipo === 'editar' ? formulario.categoria : undefined}
          existentes={categorias ?? []}
          onCerrar={() => setFormulario(null)}
          onEliminar={(categoria) => {
            // Se cierra el formulario para que la confirmación quede sola en pantalla.
            setFormulario(null)
            setPorEliminar(categoria)
          }}
        />
      )}

      {porEliminar && (
        <Dialog
          titulo={`¿Eliminar «${porEliminar.nombre}»?`}
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
            {porEliminar.ubicaciones > 0
              ? `${plural(porEliminar.ubicaciones, 'ubicación usa', 'ubicaciones usan')} esta categoría y ${porEliminar.ubicaciones === 1 ? 'quedará' : 'quedarán'} sin categoría. No se borra ninguna ubicación.`
              : 'Ninguna ubicación usa esta categoría.'}
          </p>
          <p>Podrás deshacerlo durante unos segundos.</p>
        </Dialog>
      )}
    </Panel>
  )
}


function IconoEtiqueta() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  )
}
