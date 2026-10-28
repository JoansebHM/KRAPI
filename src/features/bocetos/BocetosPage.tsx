import { PenLine } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { FlechaLista } from '../../components/FlechaLista'
import { Panel } from '../../components/Panel'
import { notificar } from '../../lib/notificar'
import { plural } from '../../lib/texto'
import { useAuth } from '../auth/useAuth'
import { mostrarFechaDe } from '../estudios/campos'
import { useNombreDeCuenta } from '../usuarios/api'
import { mensajeDeError, useBocetos, useBorrarBoceto, type Boceto } from './api'
import { VerBoceto } from './VerBoceto'
import './Bocetos.css'

/** Registro de bocetos (`/bocetos`): los dibujos hechos en la pizarra, del más reciente al más antiguo. */
export function BocetosPage() {
  const { data: bocetos, isPending, isError, refetch } = useBocetos()
  const { perfil, esAdmin } = useAuth()
  const nombreDe = useNombreDeCuenta()
  const borrar = useBorrarBoceto()
  const [abierto, setAbierto] = useState<Boceto | null>(null)
  const [porBorrar, setPorBorrar] = useState<Boceto | null>(null)

  // Solo lo borra quien lo hizo o un admin (lo asegura RLS).
  const puedeBorrar = (boceto: Boceto) => esAdmin || (boceto.creadoPor !== null && boceto.creadoPor === perfil?.id)

  async function confirmarBorrar(boceto: Boceto) {
    try {
      await borrar.mutateAsync(boceto)
      setPorBorrar(null)
      notificar.exito('Boceto borrado', { descripcion: `«${boceto.titulo}» se borró.` })
    } catch (error) {
      notificar.error('No se pudo borrar', { descripcion: mensajeDeError(error, 'Solo quien lo hizo o un admin puede borrarlo.') })
    }
  }

  const botonNuevo = (
    <Link to="/pizarra" className="fab">
      <PenLine size={22} strokeWidth={2.4} aria-hidden="true" />
      Nuevo boceto
    </Link>
  )

  return (
    <Panel titulo="Bocetos" subtitulo={bocetos ? plural(bocetos.length, 'boceto') : undefined} pie={bocetos && bocetos.length > 0 ? botonNuevo : undefined}>
      {isPending && <ListaCargando />}
      {isError && <ErrorCarga mensaje="No se pudieron cargar los bocetos." onReintentar={() => void refetch()} />}

      {bocetos && bocetos.length === 0 && (
        <EstadoVacio
          icono={<PenLine size={28} aria-hidden="true" />}
          titulo="Aún no hay bocetos"
          descripcion="Dibuja sobre el mapa para explicar una ruta, por dónde se mueve la gente o lo que quieras mostrar en una reunión, y guárdalo aquí."
          accion={
            <Link to="/pizarra" className="btn btn-primary">
              Dibujar el primero
            </Link>
          }
        />
      )}

      {bocetos && bocetos.length > 0 && (
        <ul className="lista">
          {bocetos.map((boceto) => (
            <li key={boceto.id}>
              <button type="button" className="lista-item boceto-item" onClick={() => setAbierto(boceto)}>
                {boceto.miniatura ? (
                  <img className="boceto-miniatura" src={boceto.miniatura} alt="" width={72} height={56} loading="lazy" />
                ) : (
                  <span className="boceto-miniatura boceto-miniatura-vacia" aria-hidden="true" />
                )}
                <span className="lista-item-textos">
                  <span className="lista-item-titulo">{boceto.titulo}</span>
                  <span className="lista-item-detalle">{[nombreDe(boceto.creadoPor), mostrarFechaDe(boceto.creadoEn)].filter(Boolean).join(' · ')}</span>
                </span>
                <FlechaLista />
              </button>
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <VerBoceto
          boceto={abierto}
          puedeBorrar={puedeBorrar(abierto)}
          onBorrar={() => {
            // El visor está por encima de los diálogos: se cierra para que la confirmación quede sola.
            setPorBorrar(abierto)
            setAbierto(null)
          }}
          onCerrar={() => setAbierto(null)}
        />
      )}

      {porBorrar && (
        <Dialog
          titulo={`¿Borrar «${porBorrar.titulo}»?`}
          onCerrar={borrar.isPending ? undefined : () => setPorBorrar(null)}
          acciones={
            <>
              <button type="button" className="btn btn-danger btn-block" disabled={borrar.isPending} onClick={() => void confirmarBorrar(porBorrar)}>
                {borrar.isPending ? 'Borrando…' : 'Borrar'}
              </button>
              <button type="button" className="btn btn-secondary btn-block" disabled={borrar.isPending} onClick={() => setPorBorrar(null)}>
                Cancelar
              </button>
            </>
          }
        >
          <p>
            Se borra el boceto con su imagen, para siempre. <strong>No se puede deshacer.</strong>
          </p>
        </Dialog>
      )}
    </Panel>
  )
}
