import { Link } from 'react-router'
import { ErrorCarga, ListaCargando } from '../../components/Estados'
import { useCategorias } from '../categorias/api'
import { COLOR_SIN_CATEGORIA } from '../categorias/colores'
import { IconoCategoria } from '../categorias/IconoCategoria'
import { mostrarFecha } from '../estudios/campos'
import { useLocalesEnZona } from './api'
import './FichaZona.css'

/** Locales dentro de la zona, con poca información: para ver todo se va a la ficha de cada uno. */
export function LocalesEnZona({ zonaId }: { zonaId: string }) {
  const { data: locales, isPending, isError, refetch } = useLocalesEnZona(zonaId)
  const { data: categorias } = useCategorias()

  return (
    <section className="zona-seccion" aria-labelledby="zona-locales-titulo">
      <h2 id="zona-locales-titulo" className="zona-seccion-titulo">
        Locales en la zona
        {locales && locales.length > 0 && <span className="zona-seccion-cantidad"> · {locales.length}</span>}
      </h2>
      {isPending ? (
        <ListaCargando filas={2} />
      ) : isError ? (
        <ErrorCarga mensaje="No se pudieron cargar los locales." onReintentar={() => void refetch()} />
      ) : locales.length === 0 ? (
        <p className="zona-vacio">No hay locales registrados dentro de esta zona.</p>
      ) : (
        <ul className="zona-locales">
          {locales.map((local) => {
            const categoria = local.categoriaId ? categorias?.find((c) => c.id === local.categoriaId) : undefined
            return (
              <li key={local.id} className="zona-local">
                <IconoCategoria icono={categoria?.icono} color={categoria?.color ?? COLOR_SIN_CATEGORIA} tamano={28} />
                <span className="zona-local-textos">
                  <span className="zona-local-nombre">
                    {local.nombre}
                    {local.cerrado && <span className="zona-local-cerrado"> · cerrado</span>}
                  </span>
                  <span className="zona-local-detalle">
                    {local.ultimoEstudio ? `Último estudio: ${mostrarFecha(local.ultimoEstudio)}` : 'Sin estudios'}
                  </span>
                </span>
                <Link to={`/lugares/${local.id}`} className="btn btn-secondary zona-local-ver" aria-label={`Ver la ficha de ${local.nombre}`}>
                  Ver
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
