import { CalendarCheck, Plus } from 'lucide-react'
import { useState } from 'react'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { Panel } from '../../components/Panel'
import { plural } from '../../lib/texto'
import { useCronograma, type Fragmento } from './api'
import { FormularioFragmento } from './FormularioFragmento'
import { FragmentoTarjeta } from './FragmentoTarjeta'
import { agruparFragmentos } from './textos'
import './Cronograma.css'

/**
 * Cronograma (`/cronograma`): el calendario partido en fragmentos de fechas libres, cada uno con su
 * checklist de lo que se va a hacer. Todas las cuentas activas lo editan.
 */
export function CronogramaPage() {
  const { data: fragmentos, isPending, isError, refetch } = useCronograma()
  const [creando, setCreando] = useState(false)
  const grupos = agruparFragmentos(fragmentos ?? [])

  return (
    <Panel
      titulo="Cronograma"
      subtitulo={fragmentos ? plural(fragmentos.length, 'fragmento') : undefined}
      pie={
        <button type="button" className="fab" onClick={() => setCreando(true)}>
          <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
          Nuevo fragmento
        </button>
      }
    >
      {isPending && <ListaCargando />}
      {isError && <ErrorCarga mensaje="No se pudo cargar el cronograma." onReintentar={() => void refetch()} />}
      {fragmentos && fragmentos.length === 0 && (
        <EstadoVacio
          icono={<CalendarCheck size={28} aria-hidden="true" />}
          titulo="Aún no hay fragmentos"
          descripcion="Parte el calendario en fragmentos (por ejemplo, una semana) y arma en cada uno el checklist de lo que se va a hacer."
          accion={
            <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
              Crear el primero
            </button>
          }
        />
      )}
      <Grupo titulo="En curso" fragmentos={grupos.enCurso} abiertos />
      <Grupo titulo="Próximos" fragmentos={grupos.proximos} abiertos />
      <Grupo titulo="Anteriores" fragmentos={grupos.anteriores} />

      {creando && <FormularioFragmento onCerrar={() => setCreando(false)} />}
    </Panel>
  )
}

function Grupo({ titulo, fragmentos, abiertos = false }: { titulo: string; fragmentos: Fragmento[]; abiertos?: boolean }) {
  if (fragmentos.length === 0) return null
  return (
    <section className="cronograma-grupo" aria-label={titulo}>
      <h2 className="cronograma-grupo-titulo">{titulo}</h2>
      <ul className="cronograma-lista">
        {fragmentos.map((fragmento) => (
          <FragmentoTarjeta key={fragmento.id} fragmento={fragmento} abierto={abiertos} />
        ))}
      </ul>
    </section>
  )
}
