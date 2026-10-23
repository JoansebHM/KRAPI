import { useMemo, useState } from 'react'
import { normalizar } from '../../lib/texto'
import { ICONOS_CATEGORIA } from './iconos'
import './SelectorIcono.css'

interface SelectorIconoProps {
  valor: string
  onCambiar: (clave: string) => void
}

/** Cuadrícula de íconos para tocar, con buscador en español. */
export function SelectorIcono({ valor, onCambiar }: SelectorIconoProps) {
  const [busqueda, setBusqueda] = useState('')

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda)
    if (!termino) return ICONOS_CATEGORIA
    return ICONOS_CATEGORIA.filter(({ nombre, palabras }) => normalizar(`${nombre} ${palabras}`).includes(termino))
  }, [busqueda])

  const elegido = ICONOS_CATEGORIA.find((icono) => icono.clave === valor)

  return (
    <div className="selector-icono">
      <input
        className="field-input selector-icono-buscar"
        type="search"
        enterKeyHint="search"
        placeholder="Buscar ícono: pan, bar, médico…"
        aria-label="Buscar ícono"
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        // Enter en el buscador no debe enviar el formulario.
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') evento.preventDefault()
        }}
      />
      {visibles.length === 0 ? (
        <p className="selector-icono-vacio">Ningún ícono coincide. Prueba con otra palabra.</p>
      ) : (
        <div className="selector-icono-grilla" role="group" aria-label="Ícono">
          {visibles.map(({ clave, nombre, Icono }) => (
            <button
              key={clave}
              type="button"
              className="selector-icono-opcion"
              aria-label={nombre}
              aria-pressed={clave === valor}
              title={nombre}
              onClick={() => onCambiar(clave)}
            >
              <Icono size={22} strokeWidth={2} />
            </button>
          ))}
        </div>
      )}
      {elegido && <p className="selector-icono-elegido">Elegido: {elegido.nombre}</p>}
    </div>
  )
}
