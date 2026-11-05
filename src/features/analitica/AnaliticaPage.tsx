import { BarChart3 } from 'lucide-react'
import { Link } from 'react-router'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { Panel } from '../../components/Panel'
import { plural } from '../../lib/texto'
import { mostrarFecha } from '../estudios/campos'
import { mostrarTamano } from '../evidencias/archivos'
import { useAnalitica } from './api'
import type { Analitica } from './calculos'
import { numero } from './formato'
import { BarrasHorizontales, Cifra, Columnas, Medidor, Seccion, type Columna } from './Graficos'
import './Analitica.css'

/** "3 más que la semana pasada", "igual que…" o "1 menos…". */
function comparacion(estaSemana: number, semanaPasada: number) {
  const diferencia = estaSemana - semanaPasada
  if (diferencia === 0) return 'Igual que la semana pasada'
  return `${numero(Math.abs(diferencia))} ${diferencia > 0 ? 'más' : 'menos'} que la semana pasada`
}

const columnasDeSemanas = (semanas: Analitica['semanas']): Columna[] =>
  semanas.map((semana, indice) => ({
    clave: semana.inicio,
    // Bajo la columna va el día del mes del lunes; la lectura completa trae el mes.
    etiqueta: semana.inicio.slice(8).replace(/^0/, ''),
    valor: semana.cantidad,
    descripcion: `${indice === semanas.length - 1 ? 'Esta semana' : `Semana del ${mostrarFecha(semana.inicio)}`}: ${plural(semana.cantidad, 'estudio')}`,
  }))

const columnasDeDias = (dias: Analitica['dias']): Columna[] =>
  dias.map((dia) => ({
    clave: dia.nombre,
    etiqueta: dia.etiqueta,
    valor: dia.cantidad,
    descripcion: `${dia.nombre.charAt(0).toUpperCase()}${dia.nombre.slice(1)}: ${plural(dia.cantidad, 'estudio')}`,
  }))

/** Analítica (`/analitica`): cómo va el levantamiento, con los locales, estudios y evidencias que ya hay. */
export function AnaliticaPage() {
  const { datos, isPending, isError, refetch } = useAnalitica()

  return (
    <Panel titulo="Analítica" subtitulo="Cómo va el levantamiento">
      {isPending && <ListaCargando />}
      {isError && <ErrorCarga mensaje="No se pudieron cargar las cifras." onReintentar={refetch} />}

      {datos && datos.locales === 0 && datos.estudios === 0 && (
        <EstadoVacio
          icono={<BarChart3 size={28} aria-hidden="true" />}
          titulo="Aún no hay cifras"
          descripcion="Cuando se registren locales y estudios en el mapa, aquí verás cómo va el levantamiento."
          accion={
            <Link to="/" className="btn btn-primary">
              Ir al mapa
            </Link>
          }
        />
      )}

      {datos && (datos.locales > 0 || datos.estudios > 0) && <Resumen datos={datos} />}
    </Panel>
  )
}

function Resumen({ datos }: { datos: Analitica }) {
  const diaMasActivo = datos.dias.reduce((mejor, dia, indice) => (dia.cantidad > datos.dias[mejor].cantidad ? indice : mejor), 0)
  const localesSinEstudio = datos.locales - datos.localesConEstudio

  return (
    <div className="analitica">
      <div className="analitica-cifras">
        <Cifra
          etiqueta="Locales"
          valor={numero(datos.locales)}
          detalle={datos.elementos > 0 ? `y ${plural(datos.elementos, 'elemento')}` : datos.localesCerrados > 0 ? `${numero(datos.localesCerrados)} cerrados` : undefined}
        />
        <Cifra etiqueta="Estudios" valor={numero(datos.estudios)} detalle={`${numero(datos.estudiosEstaSemana)} esta semana`} />
        <Cifra
          etiqueta="Entrevistas"
          valor={numero(datos.entrevistas)}
          detalle={datos.estudios > 0 ? `${Math.round((datos.entrevistas / datos.estudios) * 100)} % de los estudios` : undefined}
        />
        <Cifra etiqueta="Evidencias" valor={numero(datos.evidencias)} detalle={datos.bytes > 0 ? mostrarTamano(datos.bytes) : undefined} />
      </div>

      <Seccion titulo="Cobertura" descripcion="Cuántos locales ya se visitaron al menos una vez.">
        <Medidor
          etiqueta="Locales con estudio"
          valor={datos.localesConEstudio}
          total={datos.locales}
          detalle={
            localesSinEstudio > 0
              ? `${numero(datos.localesConEstudio)} de ${numero(datos.locales)} · faltan ${plural(localesSinEstudio, 'local', 'locales')}`
              : `${numero(datos.localesConEstudio)} de ${numero(datos.locales)}`
          }
        />
      </Seccion>

      <Seccion titulo="Ritmo" descripcion={`Estudios por semana. ${comparacion(datos.estudiosEstaSemana, datos.estudiosSemanaPasada)}.`}>
        <Columnas columnas={columnasDeSemanas(datos.semanas)} destacada={datos.semanas.length - 1} titulo="Estudios por semana" />
        <h3 className="analitica-subtitulo">Por día de la semana</h3>
        <Columnas columnas={columnasDeDias(datos.dias)} destacada={diaMasActivo} titulo="Estudios por día de la semana" />
        <h3 className="analitica-subtitulo">Por momento del día</h3>
        <BarrasHorizontales barras={datos.franjas} unidad="estudios" />
      </Seccion>

      <Seccion titulo="Locales por categoría">
        <BarrasHorizontales barras={datos.localesPorCategoria} vacio="Aún no hay locales." unidad="locales" />
        {datos.elementosPorCategoria.length > 0 && (
          <>
            <h3 className="analitica-subtitulo">Elementos por categoría</h3>
            <BarrasHorizontales barras={datos.elementosPorCategoria} unidad="elementos" />
          </>
        )}
      </Seccion>

      <Seccion titulo="Evidencias" descripcion="Qué material se ha subido y qué tan completos están los estudios.">
        <BarrasHorizontales barras={datos.evidenciasPorTipo} unidad="evidencias" />
        {datos.estudios > 0 && (
          <div className="analitica-medidores">
            <Medidor etiqueta="Estudios con evidencia" valor={datos.estudiosConEvidencia} total={datos.estudios} />
            <Medidor etiqueta="Estudios con notas" valor={datos.estudiosConNotas} total={datos.estudios} />
            <Medidor etiqueta="Estudios con entrevistado" valor={datos.estudiosConEntrevistado} total={datos.estudios} />
          </div>
        )}
      </Seccion>

      <Seccion titulo="Equipo" descripcion="Para repartir la carga, no para comparar a nadie.">
        <h3 className="analitica-subtitulo analitica-subtitulo-primero">Estudios en los que participó</h3>
        <BarrasHorizontales barras={datos.estudiosPorIntegrante} vacio="Aún no hay estudios con participantes." unidad="estudios" />
        <h3 className="analitica-subtitulo">Evidencias que subió</h3>
        <BarrasHorizontales barras={datos.evidenciasPorIntegrante} vacio="Aún no hay evidencias." unidad="evidencias" />
      </Seccion>
    </div>
  )
}
