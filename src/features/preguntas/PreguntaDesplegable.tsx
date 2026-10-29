import { ChevronDown, Star } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import type { Bloque, Pregunta } from './guias'
import { EjercicioTarjetas } from './EjercicioTarjetas'

interface PreguntaDesplegableProps {
  pregunta: Pregunta
  bloque: Bloque
  esDeModulo: boolean
  abierta: boolean
  onAlternar: () => void
}

/** Una pregunta como desplegable: cerrada se lee de corrido; abierta muestra por qué se hace y la información adicional. */
export function PreguntaDesplegable({ pregunta, bloque, esDeModulo, abierta, onAlternar }: PreguntaDesplegableProps) {
  const panelId = useId()

  return (
    <Desplegable
      panelId={panelId}
      abierta={abierta}
      onAlternar={onAlternar}
      destacada={pregunta.imprescindible}
      encabezado={
        <>
          <span className="pregunta-meta">
            {pregunta.imprescindible && <Star size={14} className="pregunta-estrella" fill="currentColor" aria-label="Imprescindible" role="img" />}
            <span className="pregunta-codigo">{pregunta.codigo}</span>
            {pregunta.ejercicio && <span className="pregunta-etiqueta">Ejercicio</span>}
          </span>
          <span className="pregunta-texto">{pregunta.texto}</span>
        </>
      }
    >
      <Seccion titulo="Por qué se pregunta">
        <p>
          <strong>
            {bloque.codigo} · {bloque.titulo}
          </strong>
        </p>
        {esDeModulo && bloque.aQuien && (
          <p>
            <em>A quién:</em> {bloque.aQuien}
          </p>
        )}
        <p>{bloque.proposito}</p>
        {bloque.notas?.map((nota) => (
          <p key={nota} className="pregunta-aviso">
            {nota}
          </p>
        ))}
      </Seccion>
      <Seccion titulo="Qué buscamos obtener">
        <p>{pregunta.evidencia}</p>
      </Seccion>
      {pregunta.profundizacion && (
        <Seccion titulo="Repreguntas">
          <p>{pregunta.profundizacion}</p>
        </Seccion>
      )}
      {bloque.registroTecnico && bloque.registroTecnico.length > 0 && (
        <Seccion titulo="Registro técnico">
          <ul>
            {bloque.registroTecnico.map((indicacion) => (
              <li key={indicacion}>{indicacion}</li>
            ))}
          </ul>
        </Seccion>
      )}
      {pregunta.ejercicio && (
        <Seccion titulo="Ejercicio" claro>
          <EjercicioTarjetas ejercicio={pregunta.ejercicio} />
        </Seccion>
      )}
      <Seccion titulo="Lente">
        <ul className="pregunta-lentes">
          {pregunta.lentes.map((lente) => (
            <li key={lente} className="pregunta-lente">
              {lente}
            </li>
          ))}
        </ul>
      </Seccion>
    </Desplegable>
  )
}

interface DesplegableProps {
  panelId: string
  abierta: boolean
  onAlternar: () => void
  destacada?: boolean
  encabezado: ReactNode
  children: ReactNode
}

/** Fila tocable de 44 px o más que abre y cierra su contenido. Se usa también para el cierre de la entrevista. */
export function Desplegable({ panelId, abierta, onAlternar, destacada, encabezado, children }: DesplegableProps) {
  return (
    <li className={`pregunta${destacada ? ' pregunta-imprescindible' : ''}${abierta ? ' pregunta-abierta' : ''}`}>
      <button type="button" className="pregunta-boton" aria-expanded={abierta} aria-controls={panelId} onClick={onAlternar}>
        <span className="pregunta-encabezado">{encabezado}</span>
        <ChevronDown size={20} className="pregunta-chevron" aria-hidden="true" />
      </button>
      {abierta && (
        <div id={panelId} className="pregunta-panel">
          {children}
        </div>
      )}
    </li>
  )
}

function Seccion({ titulo, claro, children }: { titulo: string; claro?: boolean; children: ReactNode }) {
  return (
    <section className={`pregunta-seccion${claro ? ' pregunta-seccion-clara' : ''}`}>
      <h4 className="pregunta-subtitulo">{titulo}</h4>
      {children}
    </section>
  )
}
