import { useCategorias } from '../categorias/api'
import { COLOR_SIN_CATEGORIA } from '../categorias/colores'
import { IconoCategoria } from '../categorias/IconoCategoria'

interface SelectorCategoriaProps {
  valor: string | null
  onCambiar: (categoriaId: string | null) => void
}

/** Botones con el ícono y el color de cada categoría, más "Sin categoría". */
export function SelectorCategoria({ valor, onCambiar }: SelectorCategoriaProps) {
  const { data: categorias, isPending } = useCategorias()

  if (isPending) return <p className="chips-nota">Cargando categorías…</p>

  const opciones = [{ id: null, nombre: 'Sin categoría', color: COLOR_SIN_CATEGORIA, icono: null }, ...(categorias ?? [])]

  return (
    <>
      <div className="chips">
        {opciones.map((categoria) => (
          <button
            key={categoria.id ?? 'ninguna'}
            type="button"
            className="chip"
            aria-pressed={valor === categoria.id}
            onClick={() => onCambiar(categoria.id)}
          >
            <IconoCategoria icono={categoria.icono} color={categoria.color} tamano={28} />
            <span>{categoria.nombre}</span>
          </button>
        ))}
      </div>
      {categorias?.length === 0 && (
        <p className="chips-nota">Aún no hay categorías. Puedes crearlas desde el menú, en Categorías.</p>
      )}
    </>
  )
}
