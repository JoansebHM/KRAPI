import { plural } from '../../lib/texto'
import { mostrarFecha } from '../estudios/campos'
import { Cifra, Seccion } from '../analitica/Graficos'
import '../analitica/Analitica.css'
import type { Fragmento } from './api'
import { resumirCronograma, TEXTO_DE_ESTADO, type FilaDeFragmento } from './resumen'
import { tituloDe } from './textos'

const dias = (cantidad: number) => (cantidad === 0 ? 'Hoy' : plural(cantidad, 'día'))

/**
 * Lo primero que se ve en el cronograma: cómo vamos con las tareas y con los tiempos de entrega (la fecha de fin
 * de cada fragmento), en cifras y en una gráfica que pone el avance de las tareas junto al tiempo que ya pasó.
 */
export function ResumenCronograma({ fragmentos }: { fragmentos: Fragmento[] }) {
  const resumen = resumirCronograma(fragmentos)
  const hechasConFecha = resumen.aTiempo + resumen.tarde

  return (
    <div className="analitica cronograma-resumen-general" aria-label="Cómo va el cronograma" role="region">
      <div className="analitica-cifras">
        <Cifra
          etiqueta="Avance"
          valor={resumen.tareas === 0 ? '—' : `${resumen.porcentaje} %`}
          detalle={resumen.tareas === 0 ? 'Aún no hay tareas' : `${resumen.hechas} de ${plural(resumen.tareas, 'tarea')}`}
        />
        <Cifra
          etiqueta="Vencidas sin hacer"
          valor={String(resumen.vencidas)}
          detalle={resumen.vencidas === 0 ? 'Nada vencido' : `en ${plural(resumen.fragmentosVencidos, 'fragmento')} ya entregado${resumen.fragmentosVencidos === 1 ? '' : 's'}`}
        />
        <Cifra
          etiqueta="Hechas a tiempo"
          valor={hechasConFecha === 0 ? '—' : `${Math.round((resumen.aTiempo / hechasConFecha) * 100)} %`}
          detalle={hechasConFecha === 0 ? 'Aún no hay tareas hechas' : `${resumen.aTiempo} a tiempo · ${resumen.tarde} tarde`}
        />
        <Cifra
          etiqueta="Entrega en curso"
          valor={resumen.enCurso ? dias(resumen.enCurso.diasRestantes) : '—'}
          detalle={
            resumen.enCurso
              ? `${resumen.enCurso.avance} % de las tareas · ${resumen.enCurso.tiempo} % del tiempo`
              : 'Ningún fragmento en curso hoy'
          }
        />
      </div>

      <Seccion
        titulo="Tareas y tiempo por fragmento"
        descripcion="La fecha de fin de cada fragmento es su fecha de entrega. Compara cuántas tareas van hechas con cuánto del tiempo ya pasó."
      >
        <ul className="cronograma-grafica">
          {resumen.filas.map((fila) => (
            <FilaGrafica key={fila.fragmento.id} fila={fila} />
          ))}
        </ul>
      </Seccion>
    </div>
  )
}

function FilaGrafica({ fila }: { fila: FilaDeFragmento }) {
  const { fragmento, avance, tiempo, estado } = fila
  return (
    <li className="cronograma-grafica-fila">
      <p className="cronograma-grafica-titulo">
        <span>{tituloDe(fragmento)}</span>
        <span className={`cronograma-estado cronograma-estado-${estado}`}>{TEXTO_DE_ESTADO[estado]}</span>
      </p>
      <p className="lista-item-detalle">Entrega: {mostrarFecha(fragmento.fechaFin)}</p>
      <Barra etiqueta="Tareas" valor={avance} clase="tareas" />
      <Barra etiqueta="Tiempo" valor={tiempo} clase="tiempo" />
    </li>
  )
}

function Barra({ etiqueta, valor, clase }: { etiqueta: string; valor: number; clase: 'tareas' | 'tiempo' }) {
  return (
    <div className="cronograma-grafica-barra">
      <span className="cronograma-grafica-etiqueta">{etiqueta}</span>
      <span className="cronograma-grafica-pista" aria-hidden="true">
        {valor > 0 && <span className={`cronograma-grafica-relleno cronograma-grafica-${clase}`} style={{ width: `${valor}%` }} />}
      </span>
      <span className="cronograma-grafica-valor">
        {valor} %<span className="solo-lector"> de {etiqueta.toLowerCase()}</span>
      </span>
    </div>
  )
}
