import { useState } from 'react'
import { Panel } from '../../components/Panel'
import { useCategorias } from '../categorias/api'
import { COLOR_SIN_CATEGORIA } from '../categorias/colores'
import { IconoCategoria } from '../categorias/IconoCategoria'
import { AgregarEvidencia } from '../evidencias/AgregarEvidencia'
import { AgregarVideo } from '../evidencias/AgregarVideo'
import { useEvidencias, type DuenoEvidencia } from '../evidencias/api'
import { CarruselFotos } from '../evidencias/CarruselFotos'
import { GrabadorAudio } from '../evidencias/GrabadorAudio'
import { ListaEvidencias } from '../evidencias/ListaEvidencias'
import { agregarArchivos } from '../evidencias/subidas'
import { AccionesDelLugar } from '../lugares/AccionesDelLugar'
import type { DetalleLugar } from '../lugares/api'
import '../lugares/FichaLugar.css'

/** Ficha de un elemento: sus datos y sus evidencias, que cuelgan de él directamente (no tiene estudios). */
export function FichaElemento({ lugar }: { lugar: DetalleLugar }) {
  const { data: categorias } = useCategorias()
  const categoria = lugar.categoriaId ? categorias?.find((c) => c.id === lugar.categoriaId) : undefined
  const archivado = lugar.archivadaEn !== null
  const dueno: DuenoEvidencia = { tipo: 'elemento', id: lugar.id }
  const { data: evidencias } = useEvidencias(dueno)
  const fotos = (evidencias ?? []).filter((evidencia) => evidencia.tipo === 'foto')
  const [agregando, setAgregando] = useState<'opciones' | 'audio' | 'video' | null>(null)

  function subir(archivos: File[]) {
    setAgregando(null)
    agregarArchivos(dueno, archivos)
  }

  return (
    <Panel
      titulo={lugar.nombre}
      subtitulo={`Elemento · ${categoria?.nombre ?? 'Sin categoría'}`}
      pie={
        archivado ? undefined : (
          <button type="button" className="fab" onClick={() => setAgregando('opciones')}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Agregar evidencia
          </button>
        )
      }
    >
      {archivado && <p className="alert alert-info ficha-archivado">Este elemento está archivado: no aparece en el mapa.</p>}

      <dl className="ficha-datos">
        <div>
          <dt>Categoría</dt>
          <dd className="ficha-categoria">
            <IconoCategoria icono={categoria?.icono} color={categoria?.color ?? COLOR_SIN_CATEGORIA} tamano={28} />
            {categoria?.nombre ?? 'Sin categoría'}
          </dd>
        </div>
        {lugar.descripcion && (
          <div>
            <dt>Descripción</dt>
            <dd className="ficha-descripcion">{lugar.descripcion}</dd>
          </div>
        )}
      </dl>

      <AccionesDelLugar lugar={lugar} />

      {fotos.length > 0 && <CarruselFotos fotos={fotos} />}

      <ListaEvidencias dueno={dueno} />

      {agregando === 'opciones' && (
        <AgregarEvidencia
          onArchivos={subir}
          onGrabarAudio={() => setAgregando('audio')}
          onVideo={() => setAgregando('video')}
          onCerrar={() => setAgregando(null)}
        />
      )}
      {agregando === 'audio' && <GrabadorAudio onUsar={(audio) => subir([audio])} onCerrar={() => setAgregando(null)} />}
      {agregando === 'video' && <AgregarVideo dueno={dueno} onCerrar={() => setAgregando(null)} />}
    </Panel>
  )
}
