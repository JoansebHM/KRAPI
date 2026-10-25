import { useMemo, useState } from 'react'
import { Buscador } from '../../components/Buscador'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { FlechaLista } from '../../components/FlechaLista'
import { Panel } from '../../components/Panel'
import { notificar } from '../../lib/notificar'
import { normalizar, plural } from '../../lib/texto'
import { useAuth } from '../auth/useAuth'
import { mostrarFecha } from '../estudios/campos'
import { mensajeErrorCuenta, useCambiarEstado, useCambiarRol, useUsuarios, type CambioDeEstado, type Rol, type Usuario } from './api'
import './UsuariosPage.css'

type Pestana = 'pendientes' | 'activos' | 'otros'

const PESTANAS: { id: Pestana; texto: string; incluye: (usuario: Usuario) => boolean }[] = [
  { id: 'pendientes', texto: 'Pendientes', incluye: (usuario) => usuario.estado === 'pendiente' },
  { id: 'activos', texto: 'Activos', incluye: (usuario) => usuario.estado === 'activo' },
  { id: 'otros', texto: 'Otros', incluye: (usuario) => usuario.estado === 'rechazado' || usuario.estado === 'desactivado' },
]

const ESTADOS: Record<Usuario['estado'], string> = {
  pendiente: 'Pendiente',
  activo: 'Activa',
  rechazado: 'Rechazada',
  desactivado: 'Desactivada',
}

/** Una acción sobre una cuenta: qué función llama, cómo se muestra y si pide confirmación. */
type Accion =
  | { tipo: 'estado'; cambio: CambioDeEstado }
  | { tipo: 'rol'; rol: Rol }

interface DescripcionAccion {
  boton: string
  estilo: 'primario' | 'secundario' | 'peligro'
  /** Las que quitan acceso o permisos piden confirmación. */
  confirmar?: { titulo: (nombre: string) => string; texto: string; boton: string }
  exito: { titulo: string; descripcion: (nombre: string) => string }
}

function describir(accion: Accion): DescripcionAccion {
  if (accion.tipo === 'rol') {
    return accion.rol === 'admin'
      ? {
          boton: 'Nombrar admin',
          estilo: 'secundario',
          exito: { titulo: 'Ahora es admin', descripcion: (nombre) => `${nombre} puede administrar las cuentas.` },
        }
      : {
          boton: 'Quitar admin',
          estilo: 'secundario',
          confirmar: {
            titulo: (nombre) => `¿Quitarle el rol de admin a ${nombre}?`,
            texto: 'Seguirá con la cuenta activa como miembro, pero ya no podrá administrar cuentas ni borrar catálogos.',
            boton: 'Quitar admin',
          },
          exito: { titulo: 'Ya no es admin', descripcion: (nombre) => `${nombre} sigue como miembro.` },
        }
  }
  switch (accion.cambio) {
    case 'aprobar_usuario':
      return {
        boton: 'Aprobar',
        estilo: 'primario',
        exito: { titulo: 'Cuenta aprobada', descripcion: (nombre) => `${nombre} ya puede entrar a KIRA.` },
      }
    case 'rechazar_usuario':
      return {
        boton: 'Rechazar',
        estilo: 'peligro',
        confirmar: {
          titulo: (nombre) => `¿Rechazar la cuenta de ${nombre}?`,
          texto: 'No podrá entrar a KIRA. Si fue un error, después podrás aprobarla desde "Otros".',
          boton: 'Rechazar',
        },
        exito: { titulo: 'Cuenta rechazada', descripcion: (nombre) => `${nombre} no podrá entrar.` },
      }
    case 'desactivar_usuario':
      return {
        boton: 'Desactivar cuenta',
        estilo: 'peligro',
        confirmar: {
          titulo: (nombre) => `¿Desactivar la cuenta de ${nombre}?`,
          texto: 'Se cerrará su sesión y no podrá ver ni cambiar nada hasta que la reactives. Lo que registró se conserva.',
          boton: 'Desactivar',
        },
        exito: { titulo: 'Cuenta desactivada', descripcion: (nombre) => `${nombre} ya no puede entrar.` },
      }
    case 'reactivar_usuario':
      return {
        boton: 'Reactivar cuenta',
        estilo: 'primario',
        exito: { titulo: 'Cuenta reactivada', descripcion: (nombre) => `${nombre} puede volver a entrar.` },
      }
  }
}

/** Qué se puede hacer con una cuenta según su estado y rol. */
function accionesDe(usuario: Usuario): Accion[] {
  switch (usuario.estado) {
    case 'pendiente':
      return [{ tipo: 'estado', cambio: 'aprobar_usuario' }, { tipo: 'estado', cambio: 'rechazar_usuario' }]
    case 'activo':
      return [
        { tipo: 'rol', rol: usuario.rol === 'admin' ? 'miembro' : 'admin' },
        { tipo: 'estado', cambio: 'desactivar_usuario' },
      ]
    case 'rechazado':
      return [{ tipo: 'estado', cambio: 'aprobar_usuario' }]
    case 'desactivado':
      return [{ tipo: 'estado', cambio: 'reactivar_usuario' }]
  }
}

const CLASE_BOTON = { primario: 'btn btn-primary btn-block', secundario: 'btn btn-secondary btn-block', peligro: 'btn btn-danger btn-block' }

/** Administración de cuentas: solo para admins (la ruta y RLS lo aseguran). */
export function UsuariosPage() {
  const { perfil } = useAuth()
  const { data: usuarios, isPending, isError, refetch } = useUsuarios()
  const cambiarEstado = useCambiarEstado()
  const cambiarRol = useCambiarRol()
  const [pestanaElegida, setPestanaElegida] = useState<Pestana | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Usuario | null>(null)
  const [porConfirmar, setPorConfirmar] = useState<{ usuario: Usuario; accion: Accion } | null>(null)
  const procesando = cambiarEstado.isPending || cambiarRol.isPending

  const pendientes = usuarios?.filter((usuario) => usuario.estado === 'pendiente').length ?? 0
  // Al cargar, si hay cuentas por aprobar se empieza por ellas. Después no cambia sola.
  if (pestanaElegida === null && usuarios) setPestanaElegida(pendientes > 0 ? 'pendientes' : 'activos')
  const pestana = pestanaElegida ?? 'pendientes'
  const nombres = useMemo(() => new Map((usuarios ?? []).map((usuario) => [usuario.id, usuario.nombre])), [usuarios])

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda)
    const incluye = PESTANAS.find(({ id }) => id === pestana)!.incluye
    return (usuarios ?? []).filter(
      (usuario) => incluye(usuario) && (normalizar(usuario.nombre).includes(termino) || usuario.usuario.includes(termino)),
    )
  }, [usuarios, pestana, busqueda])

  async function ejecutar(usuario: Usuario, accion: Accion) {
    const { exito } = describir(accion)
    try {
      if (accion.tipo === 'estado') await cambiarEstado.mutateAsync({ cambio: accion.cambio, usuario })
      else await cambiarRol.mutateAsync({ usuario, rol: accion.rol })
      setAbierto(null)
      setPorConfirmar(null)
      notificar.exito(exito.titulo, { descripcion: exito.descripcion(usuario.nombre) })
    } catch (error) {
      notificar.error('No se pudo cambiar la cuenta', { descripcion: mensajeErrorCuenta(error) })
    }
  }

  function alElegir(usuario: Usuario, accion: Accion) {
    if (describir(accion).confirmar) {
      // Se cierra la ficha para que la confirmación quede sola en pantalla.
      setAbierto(null)
      setPorConfirmar({ usuario, accion })
    } else {
      void ejecutar(usuario, accion)
    }
  }

  const total = usuarios?.length ?? 0

  return (
    <Panel
      titulo="Usuarios"
      subtitulo={usuarios ? `${plural(total, 'cuenta')}${pendientes > 0 ? ` · ${plural(pendientes, 'pendiente')}` : ''}` : undefined}
    >
      {isPending && <ListaCargando />}

      {isError && <ErrorCarga mensaje="No se pudieron cargar las cuentas." onReintentar={() => void refetch()} />}

      {usuarios && (
        <>
          <div className="pestanas" role="tablist" aria-label="Cuentas por estado">
            {PESTANAS.map(({ id, texto, incluye }) => {
              const cantidad = usuarios.filter(incluye).length
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`pestana-${id}`}
                  aria-selected={pestana === id}
                  aria-controls="usuarios-lista"
                  className="pestana"
                  onClick={() => setPestanaElegida(id)}
                >
                  {texto}
                  <span className="pestana-cantidad">{cantidad}</span>
                </button>
              )
            })}
          </div>

          <Buscador valor={busqueda} onCambiar={setBusqueda} placeholder="Buscar por nombre o usuario" />

          <div id="usuarios-lista" role="tabpanel" aria-labelledby={`pestana-${pestana}`}>
            {filtrados.length === 0 ? (
              <EstadoVacio
                icono={<IconoCuenta />}
                titulo={
                  busqueda.trim()
                    ? `Nadie coincide con «${busqueda.trim()}»`
                    : pestana === 'pendientes'
                      ? 'No hay cuentas por aprobar'
                      : pestana === 'activos'
                        ? 'No hay cuentas activas'
                        : 'No hay cuentas rechazadas ni desactivadas'
                }
                descripcion={
                  pestana === 'pendientes' && !busqueda.trim()
                    ? 'Cuando alguien del equipo cree su cuenta, aparecerá aquí para aprobarla.'
                    : undefined
                }
              />
            ) : (
              <ul className="lista">
                {filtrados.map((usuario) => (
                  <li key={usuario.id}>
                    <button type="button" className="lista-item" onClick={() => setAbierto(usuario)}>
                      <span className="usuario-inicial" aria-hidden="true">
                        {usuario.nombre.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="lista-item-textos">
                        <span className="lista-item-titulo">
                          {usuario.nombre}
                          {usuario.id === perfil?.id && <span className="usuario-tu"> (tú)</span>}
                        </span>
                        <span className="lista-item-detalle">
                          {[
                            usuario.usuario,
                            usuario.rol === 'admin' && 'Admin',
                            pestana === 'otros' && ESTADOS[usuario.estado],
                            `desde ${mostrarFecha(usuario.created_at.slice(0, 10))}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <FlechaLista />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {abierto && (
        <Dialog
          titulo={abierto.nombre}
          onCerrar={procesando ? undefined : () => setAbierto(null)}
          acciones={
            <>
              {abierto.id !== perfil?.id &&
                accionesDe(abierto).map((accion) => {
                  const { boton, estilo } = describir(accion)
                  return (
                    <button
                      key={boton}
                      type="button"
                      className={CLASE_BOTON[estilo]}
                      disabled={procesando}
                      onClick={() => alElegir(abierto, accion)}
                    >
                      {boton}
                    </button>
                  )
                })}
              <button type="button" className="btn btn-secondary btn-block" disabled={procesando} onClick={() => setAbierto(null)}>
                Cerrar
              </button>
            </>
          }
        >
          <dl className="ficha-datos">
            <div>
              <dt>Usuario</dt>
              <dd>{abierto.usuario}</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd>{abierto.rol === 'admin' ? 'Admin' : 'Miembro'}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{ESTADOS[abierto.estado]}</dd>
            </div>
            <div>
              <dt>Se registró</dt>
              <dd>{mostrarFecha(abierto.created_at.slice(0, 10))}</dd>
            </div>
            {abierto.aprobado_en && (
              <div>
                <dt>Aprobada</dt>
                <dd>
                  {mostrarFecha(abierto.aprobado_en.slice(0, 10))}
                  {abierto.aprobado_por && nombres.get(abierto.aprobado_por) && ` por ${nombres.get(abierto.aprobado_por)}`}
                </dd>
              </div>
            )}
          </dl>
          {abierto.id === perfil?.id && (
            <p className="alert alert-info">
              Esta es tu cuenta. Nadie puede cambiar su propio rol ni su estado: si necesitas hacerlo, pídeselo a otro admin.
              Así KIRA nunca se queda sin admins.
            </p>
          )}
        </Dialog>
      )}

      {porConfirmar && (
        <ConfirmarAccion
          usuario={porConfirmar.usuario}
          accion={porConfirmar.accion}
          procesando={procesando}
          onConfirmar={() => void ejecutar(porConfirmar.usuario, porConfirmar.accion)}
          onCancelar={() => setPorConfirmar(null)}
        />
      )}
    </Panel>
  )
}

interface ConfirmarAccionProps {
  usuario: Usuario
  accion: Accion
  procesando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

function ConfirmarAccion({ usuario, accion, procesando, onConfirmar, onCancelar }: ConfirmarAccionProps) {
  const confirmar = describir(accion).confirmar!
  return (
    <Dialog
      titulo={confirmar.titulo(usuario.nombre)}
      onCerrar={procesando ? undefined : onCancelar}
      acciones={
        <>
          <button type="button" className="btn btn-danger btn-block" disabled={procesando} onClick={onConfirmar}>
            {procesando ? 'Guardando…' : confirmar.boton}
          </button>
          <button type="button" className="btn btn-secondary btn-block" disabled={procesando} onClick={onCancelar}>
            Cancelar
          </button>
        </>
      }
    >
      <p>{confirmar.texto}</p>
    </Dialog>
  )
}

function IconoCuenta() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}
