import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { FlechaLista } from '../../components/FlechaLista'
import { Panel } from '../../components/Panel'
import { plural } from '../../lib/texto'
import { useAuth } from '../auth/useAuth'
import { fechaLocal } from '../estudios/campos'
import { useSalidas, type Salida } from './api'
import { FormularioSalida } from './FormularioSalida'
import { cuandoEs } from './textos'
import './Salidas.css'

/** Salidas de campo: las próximas y el histórico. Solo los admins las crean. */
export function SalidasPage() {
  const { esAdmin } = useAuth()
  const { data: salidas, isPending, isError, refetch } = useSalidas()
  const [creando, setCreando] = useState(false)
  const navigate = useNavigate()
  const hoy = fechaLocal()
  const proximas = (salidas ?? []).filter((salida) => salida.fecha >= hoy).reverse()
  const anteriores = (salidas ?? []).filter((salida) => salida.fecha < hoy)

  return (
    <Panel
      titulo="Salidas"
      subtitulo={salidas ? plural(salidas.length, 'salida') : undefined}
      pie={
        esAdmin ? (
          <button type="button" className="fab" onClick={() => setCreando(true)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva salida
          </button>
        ) : undefined
      }
    >
      {isPending && <ListaCargando />}
      {isError && <ErrorCarga mensaje="No se pudieron cargar las salidas." onReintentar={() => void refetch()} />}
      {salidas && salidas.length === 0 && (
        <EstadoVacio
          icono={<IconoSalida />}
          titulo="Aún no hay salidas"
          descripcion={
            esAdmin
              ? 'Crea una salida, dibuja las zonas que hay que cubrir y asígnalas a las personas del equipo.'
              : 'Cuando un admin arme una salida, aquí verás sus zonas y quiénes las cubren.'
          }
        />
      )}
      {proximas.length > 0 && <ListaSalidas titulo="Próximas" salidas={proximas} />}
      {anteriores.length > 0 && <ListaSalidas titulo="Anteriores" salidas={anteriores} />}

      {creando && <FormularioSalida onCerrar={() => setCreando(false)} onGuardada={(id) => navigate(`/salidas/${id}`)} />}
    </Panel>
  )
}

function ListaSalidas({ titulo, salidas }: { titulo: string; salidas: Salida[] }) {
  return (
    <section className="salidas-grupo" aria-label={titulo}>
      <h2 className="salidas-grupo-titulo">{titulo}</h2>
      <ul className="lista">
        {salidas.map((salida) => {
          const participaciones = salida.asignaciones.flatMap((asignacion) => asignacion.participantes)
          const reportadas = participaciones.filter((participacion) => participacion.porcentaje !== null).length
          return (
            <li key={salida.id}>
              <Link to={`/salidas/${salida.id}`} className="lista-item">
                <span className="lista-item-textos">
                  <span className="lista-item-titulo">
                    {salida.nombre}
                    {salida.cancelada && <span className="salida-cancelada"> · cancelada</span>}
                  </span>
                  <span className="lista-item-detalle">{cuandoEs(salida)}</span>
                  <span className="lista-item-detalle">
                    {plural(salida.asignaciones.length, 'zona')} · {plural(participaciones.length, 'asignación', 'asignaciones')}
                    {participaciones.length > 0 && ` · ${reportadas} de ${participaciones.length} reportadas`}
                  </span>
                </span>
                <FlechaLista />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function IconoSalida() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4Z" />
      <path d="M12 9.5h.01M15.5 12.5l-3.5 3-2-2" />
    </svg>
  )
}
