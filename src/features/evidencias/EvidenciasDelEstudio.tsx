import { ExternalLink, RotateCw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useBorrarEvidencia, useEvidencias, type Evidencia } from './api'
import { mostrarTamano, NOMBRE_TIPO } from './archivos'
import { IconoTipoEvidencia } from './IconoTipoEvidencia'
import { quitar, reintentar, useSubidas, type Subida } from './subidas'
import './Evidencias.css'

/** Evidencias de un estudio: las que se están subiendo y las ya guardadas, con la opción de borrarlas. */
export function EvidenciasDelEstudio({ estudioId }: { estudioId: string }) {
  const { data: evidencias, isPending, isError, refetch } = useEvidencias(estudioId)
  const subidas = useSubidas(estudioId)
  const borrar = useBorrarEvidencia()
  const [porBorrar, setPorBorrar] = useState<Evidencia | null>(null)

  async function confirmarBorrar(evidencia: Evidencia) {
    try {
      await borrar.mutateAsync(evidencia)
      setPorBorrar(null)
      notificar.exito('Evidencia borrada', { descripcion: `«${nombreDe(evidencia)}» se borró.` })
    } catch (error) {
      notificar.error('No se pudo borrar', {
        descripcion: mensajeErrorDatos(error, { sinPermiso: 'Solo quien la subió o un admin puede borrarla.' }),
      })
    }
  }

  return (
    <section className="evidencias" aria-labelledby="evidencias-titulo">
      <h2 id="evidencias-titulo" className="evidencias-titulo">
        Evidencias
        {evidencias && evidencias.length > 0 && <span className="evidencias-cantidad"> · {evidencias.length}</span>}
      </h2>

      {subidas.length > 0 && (
        <ul className="lista" aria-label="Subidas">
          {subidas.map((subida) => (
            <FilaSubida key={subida.id} subida={subida} />
          ))}
        </ul>
      )}

      {isPending ? (
        <ListaCargando filas={2} />
      ) : isError ? (
        <ErrorCarga mensaje="No se pudieron cargar las evidencias." onReintentar={() => refetch()} />
      ) : evidencias.length === 0 ? (
        subidas.length === 0 && (
          <EstadoVacio
            icono={<IconoTipoEvidencia tipo="foto" />}
            titulo="Aún no hay evidencias"
            descripcion="Agrega las fotos, los audios y los documentos de esta visita."
          />
        )
      ) : (
        <ul className="lista">
          {evidencias.map((evidencia) => (
            <li key={evidencia.id} className="evidencia">
              <a
                className="lista-item"
                href={evidencia.enlace ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!evidencia.enlace}
              >
                <IconoTipoEvidencia tipo={evidencia.tipo} mime={evidencia.archivo?.mime} />
                <span className="lista-item-textos">
                  <span className="lista-item-titulo">{nombreDe(evidencia)}</span>
                  <span className="lista-item-detalle">
                    {NOMBRE_TIPO[evidencia.tipo]}
                    {evidencia.archivo && ` · ${mostrarTamano(evidencia.archivo.bytes)}`}
                  </span>
                </span>
                <ExternalLink className="lista-item-flecha" size={18} aria-hidden="true" />
              </a>
              <button
                type="button"
                className="evidencia-accion"
                aria-label={`Borrar «${nombreDe(evidencia)}»`}
                title="Borrar"
                onClick={() => setPorBorrar(evidencia)}
              >
                <Trash2 size={20} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {porBorrar && (
        <Dialog
          titulo="¿Borrar esta evidencia?"
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
            Se borra «{nombreDe(porBorrar)}» con su archivo, para siempre. <strong>No se puede deshacer.</strong>
          </p>
        </Dialog>
      )}
    </section>
  )
}

const nombreDe = (evidencia: Evidencia) => evidencia.titulo ?? evidencia.archivo?.nombre ?? NOMBRE_TIPO[evidencia.tipo]

function FilaSubida({ subida }: { subida: Subida }) {
  const conError = subida.estado === 'error'
  const porcentaje = Math.round(subida.avance * 100)
  const estado =
    subida.estado === 'en-cola' ? 'En espera' : subida.estado === 'preparando' ? 'Preparando…' : subida.estado === 'subiendo' ? `Subiendo… ${porcentaje} %` : subida.error

  return (
    <li className={`evidencia evidencia-subida${conError ? ' evidencia-subida-error' : ''}`}>
      <div className="lista-item">
        <IconoTipoEvidencia tipo={subida.tipo ?? 'documento'} mime={subida.archivo.type} />
        <span className="lista-item-textos">
          <span className="lista-item-titulo">{subida.nombre}</span>
          <span className="lista-item-detalle" role={conError ? 'alert' : undefined}>
            {estado}
          </span>
          {!conError && (
            <span
              className="evidencia-progreso"
              role="progressbar"
              aria-label={`Subiendo ${subida.nombre}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={porcentaje}
            >
              <span style={{ width: `${porcentaje}%` }} />
            </span>
          )}
        </span>
      </div>
      {conError && subida.reintentable && (
        <button type="button" className="evidencia-accion" aria-label={`Reintentar «${subida.nombre}»`} title="Reintentar" onClick={() => reintentar(subida.id)}>
          <RotateCw size={20} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        className="evidencia-accion"
        aria-label={conError ? `Descartar «${subida.nombre}»` : `Cancelar la subida de «${subida.nombre}»`}
        title={conError ? 'Descartar' : 'Cancelar'}
        onClick={() => quitar(subida.id)}
      >
        <X size={20} aria-hidden="true" />
      </button>
    </li>
  )
}
