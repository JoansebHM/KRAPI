import { useId, useState } from 'react'
import type { Guia } from './guias'
import { ordenarPreguntas } from './ordenar'
import { Desplegable, PreguntaDesplegable } from './PreguntaDesplegable'

/** Imprescindibles (★) primero, luego complementarias, y al final el cierre. Se monta de nuevo al cambiar de guía, así se cierran todas. */
export function ListaPreguntas({ guia, moduloId }: { guia: Guia; moduloId: string | null }) {
  const { imprescindibles, complementarias } = ordenarPreguntas(guia, moduloId)
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set())
  const cierreId = useId()

  function alternar(codigo: string) {
    setAbiertas((previas) => {
      const siguientes = new Set(previas)
      if (!siguientes.delete(codigo)) siguientes.add(codigo)
      return siguientes
    })
  }

  return (
    <div className="preguntas-lista">
      <h3 className="preguntas-grupo">Imprescindibles · {imprescindibles.length}</h3>
      <p className="preguntas-grupo-nota">Con solo estas se hace la versión de 40 minutos.</p>
      <ul className="lista-preguntas">
        {imprescindibles.map(({ pregunta, bloque, esDeModulo }) => (
          <PreguntaDesplegable
            key={pregunta.codigo}
            pregunta={pregunta}
            bloque={bloque}
            esDeModulo={esDeModulo}
            abierta={abiertas.has(pregunta.codigo)}
            onAlternar={() => alternar(pregunta.codigo)}
          />
        ))}
      </ul>
      <h3 className="preguntas-grupo">Complementarias · {complementarias.length}</h3>
      <ul className="lista-preguntas">
        {complementarias.map(({ pregunta, bloque, esDeModulo }) => (
          <PreguntaDesplegable
            key={pregunta.codigo}
            pregunta={pregunta}
            bloque={bloque}
            esDeModulo={esDeModulo}
            abierta={abiertas.has(pregunta.codigo)}
            onAlternar={() => alternar(pregunta.codigo)}
          />
        ))}
      </ul>
      <ul className="lista-preguntas preguntas-cierre">
        <Desplegable
          panelId={cierreId}
          abierta={abiertas.has('cierre')}
          onAlternar={() => alternar('cierre')}
          encabezado={<span className="pregunta-texto">Cierre de la entrevista</span>}
        >
          {guia.cierre.map((parrafo) => (
            <p key={parrafo} className="pregunta-lectura">
              {parrafo}
            </p>
          ))}
        </Desplegable>
      </ul>
    </div>
  )
}
