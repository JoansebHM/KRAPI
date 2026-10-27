import { aplicaA, useCategorias } from '../categorias/api'
import { COLOR_SIN_CATEGORIA } from '../categorias/colores'
import { IconoCategoria } from '../categorias/IconoCategoria'

interface SelectorCategoriaProps {
  valor: string | null
  onCambiar: (categoriaId: string | null) => void
  /** Solo se ofrecen las categorías que se usan en lugares o en elementos (y la que ya tenía). */
  para?: 'lugares' | 'elementos'
}

/** Botones con el ícono y el color de cada categoría, más "Sin categoría". */
export function SelectorCategoria({ valor, onCambiar, para = 'lugares' }: SelectorCategoriaProps) {
  const { data: categorias, isPending } = useCategorias()

  if (isPending) return <p className="chips-nota">Cargando categorías…</p>

  const aplicables = (categorias ?? []).filter((categoria) => aplicaA(categoria, para) || categoria.id === valor)
  const opciones = [{ id: null, nombre: 'Sin categoría', color: COLOR_SIN_CATEGORIA, icono: null }, ...aplicables]

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
      {aplicables.length === 0 && (
        <p className="chips-nota">
          {para === 'elementos'
            ? 'Aún no hay categorías de elementos. Puedes crearlas desde el menú, en Categorías.'
            : 'Aún no hay categorías. Puedes crearlas desde el menú, en Categorías.'}
        </p>
      )}
    </>
  )
}
