import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { contarFiltrosActivos } from './api'
import { useFiltros } from './filtrosContexto'
import { PanelFiltros } from './PanelFiltros'
import './Filtros.css'

/** Botón flotante del mapa: abre el panel de filtros y muestra cuántos grupos están activos. */
export function BotonFiltros() {
  const { filtros } = useFiltros()
  const [abierto, setAbierto] = useState(false)
  const activos = contarFiltrosActivos(filtros)

  return (
    <>
      <button type="button" className="boton-filtros" onClick={() => setAbierto(true)} aria-pressed={abierto}>
        <SlidersHorizontal size={18} aria-hidden="true" />
        Filtros
        {activos > 0 && (
          <span className="boton-filtros-contador" aria-label={`${activos} filtros activos`}>
            {activos}
          </span>
        )}
      </button>
      {abierto && <PanelFiltros onCerrar={() => setAbierto(false)} />}
    </>
  )
}
