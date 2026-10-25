import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, ListaCargando } from '../../components/Estados'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useAuth } from '../auth/useAuth'
import { mostrarFechaDe } from '../estudios/campos'
import { Avatar } from '../usuarios/Avatar'
import { CUENTA_COMPARTIDA, semillaDe, useUsuarios } from '../usuarios/api'
import { useBorrarComentario, useComentar, useComentariosZona, type Comentario } from './api'
import './FichaZona.css'

const MAX_COMENTARIO = 2000

/** Comentarios del equipo sobre la zona: quién lo escribió y cuándo. Lo borra quien lo escribió o un admin. */
export function ComentariosZona({ zonaId }: { zonaId: string }) {
  const { perfil, esAdmin } = useAuth()
  const { data: comentarios, isPending, isError, refetch } = useComentariosZona(zonaId)
  const { data: cuentas } = useUsuarios()
  const comentar = useComentar(zonaId)
  const borrar = useBorrarComentario(zonaId)
  const [texto, setTexto] = useState('')
  const [porBorrar, setPorBorrar] = useState<Comentario | null>(null)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!texto.trim()) return
    try {
      await comentar.mutateAsync(texto)
      setTexto('')
    } catch (error) {
      notificar.error('No se pudo comentar', { descripcion: mensajeErrorDatos(error) })
    }
  }

  async function confirmarBorrar(comentario: Comentario) {
    try {
      await borrar.mutateAsync(comentario)
      setPorBorrar(null)
      notificar.exito('Comentario borrado')
    } catch (error) {
      notificar.error('No se pudo borrar', {
        descripcion: mensajeErrorDatos(error, { sinPermiso: 'Solo quien lo escribió o un admin puede borrarlo.' }),
      })
    }
  }

  return (
    <section className="zona-seccion" aria-labelledby="zona-comentarios-titulo">
      <h2 id="zona-comentarios-titulo" className="zona-seccion-titulo">
        Comentarios
        {comentarios && comentarios.length > 0 && <span className="zona-seccion-cantidad"> · {comentarios.length}</span>}
      </h2>

      <form className="zona-comentar" onSubmit={enviar}>
        <textarea
          className="field-input field-textarea"
          aria-label="Nuevo comentario"
          placeholder="¿Qué pasa en esta zona? Ej.: Hay mucho comercio informal en las tardes."
          rows={2}
          maxLength={MAX_COMENTARIO}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
        />
        <button type="submit" className="btn btn-secondary" disabled={!texto.trim() || comentar.isPending}>
          {comentar.isPending ? 'Publicando…' : 'Comentar'}
        </button>
      </form>

      {isPending ? (
        <ListaCargando filas={1} />
      ) : isError ? (
        <ErrorCarga mensaje="No se pudieron cargar los comentarios." onReintentar={() => void refetch()} />
      ) : comentarios.length === 0 ? (
        <p className="zona-vacio">Aún no hay comentarios.</p>
      ) : (
        <ul className="zona-comentarios">
          {comentarios.map((comentario) => {
            const autor = cuentas?.find((cuenta) => cuenta.id === comentario.creadoPor)
            const puedeBorrar = esAdmin || (comentario.creadoPor !== null && comentario.creadoPor === perfil?.id)
            return (
              <li key={comentario.id} className="zona-comentario">
                {autor ? <Avatar semilla={semillaDe(autor)} tamano={32} /> : <span className="zona-comentario-sin-autor" aria-hidden="true" />}
                <div className="zona-comentario-cuerpo">
                  <p className="zona-comentario-meta">
                    <strong>{autor?.nombre ?? CUENTA_COMPARTIDA}</strong> · {mostrarFechaDe(comentario.creadoEn)}
                  </p>
                  <p className="zona-comentario-texto">{comentario.texto}</p>
                </div>
                {puedeBorrar && (
                  <button type="button" className="icon-btn zona-comentario-borrar" aria-label="Borrar comentario" title="Borrar" onClick={() => setPorBorrar(comentario)}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {porBorrar && (
        <Dialog
          titulo="¿Borrar este comentario?"
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
          <p>No se puede deshacer.</p>
        </Dialog>
      )}
    </section>
  )
}
