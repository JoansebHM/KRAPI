import { useCategorias } from '../categorias/api'
import { COLOR_SIN_CATEGORIA } from '../categorias/colores'
import { IconoCategoria } from '../categorias/IconoCategoria'
import './SelectorCategoria.css'

interface SelectorCategoriaProps {
  valor: string | null
  onCambiar: (categoriaId: string | null) => void
}

/** Botones con el ícono y el color de cada categoría, más "Sin categoría". */
export function SelectorCategoria({ valor, onCambiar }: SelectorCategoriaProps) {
  const { data: categorias, isPending } = useCategorias()

  if (isPending) return <p className="selector-categoria-nota">Cargando categorías…</p>

  const opciones = [{ id: null, nombre: 'Sin categoría', color: COLOR_SIN_CATEGORIA, icono: null }, ...(categorias ?? [])]

  return (
    <>
      <div className="selector-categoria">
        {opciones.map((categoria) => (
          <button
            key={categoria.id ?? 'ninguna'}
            type="button"
            className="selector-categoria-opcion"
            aria-pressed={valor === categoria.id}
            onClick={() => onCambiar(categoria.id)}
          >
            <IconoCategoria icono={categoria.icono} color={categoria.color} tamano={28} />
            <span>{categoria.nombre}</span>
          </button>
        ))}
      </div>
      {categorias?.length === 0 && (
        <p className="selector-categoria-nota">Aún no hay categorías. Puedes crearlas desde el menú, en Categorías.</p>
      )}
    </>
  )
}
