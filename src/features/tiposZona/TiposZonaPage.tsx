import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { ErrorCarga, EstadoVacio, ListaCargando } from '../../components/Estados'
import { FlechaLista } from '../../components/FlechaLista'
import { Panel } from '../../components/Panel'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { normalizar, plural } from '../../lib/texto'
import { useAuth } from '../auth/useAuth'
import { SelectorColor } from '../categorias/SelectorColor'
import { useEliminarTipoZona, useGuardarTipoZona, useTiposZona, type TipoZona } from './api'
import './TiposZonaPage.css'

const MAX_NOMBRE = 50
const COLOR_NUEVO = '#9E7AE1'

type Formulario = { tipo: 'nuevo' } | { tipo: 'editar'; tipoZona: TipoZona }

/** Tipos de zona (comercial, residencial…), con el color con el que se pintan en el mapa. */
export function TiposZonaPage() {
  const { data: tipos, isPending, isError, refetch } = useTiposZona()
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const total = tipos?.length ?? 0

  return (
    <Panel
      titulo="Tipos de zona"
      subtitulo={tipos ? plural(total, 'tipo') : undefined}
      pie={
        <button type="button" className="fab" onClick={() => setFormulario({ tipo: 'nuevo' })}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo tipo
        </button>
      }
    >
      {isPending && <ListaCargando />}
      {isError && <ErrorCarga mensaje="No se pudieron cargar los tipos de zona." onReintentar={() => void refetch()} />}
      {tipos && total === 0 && (
        <EstadoVacio
          icono={<span className="tipo-zona-muestra tipo-zona-muestra-grande" style={{ background: COLOR_NUEVO }} />}
          titulo="Aún no hay tipos de zona"
          descripcion="Sirven para decir de qué es cada zona (comercial, residencial…) y pintarla con su color en el mapa."
        />
      )}
      {tipos && total > 0 && (
        <ul className="lista">
          {tipos.map((tipo) => (
            <li key={tipo.id}>
              <button type="button" className="lista-item" onClick={() => setFormulario({ tipo: 'editar', tipoZona: tipo })}>
                <span className="tipo-zona-muestra" style={{ background: tipo.color }} aria-hidden="true" />
                <span className="lista-item-textos">
                  <span className="lista-item-titulo">{tipo.nombre}</span>
                  <span className="lista-item-detalle">{tipo.zonas > 0 ? plural(tipo.zonas, 'zona') : 'Sin zonas'}</span>
                </span>
                <FlechaLista />
              </button>
            </li>
          ))}
        </ul>
      )}

      {formulario && (
        <FormularioTipoZona
          tipoZona={formulario.tipo === 'editar' ? formulario.tipoZona : undefined}
          existentes={tipos ?? []}
          onCerrar={() => setFormulario(null)}
        />
      )}
    </Panel>
  )
}

interface FormularioTipoZonaProps {
  tipoZona?: TipoZona
  existentes: TipoZona[]
  onCerrar: () => void
}

function FormularioTipoZona({ tipoZona, existentes, onCerrar }: FormularioTipoZonaProps) {
  const { esAdmin } = useAuth()
  const [nombre, setNombre] = useState(tipoZona?.nombre ?? '')
  const [color, setColor] = useState(tipoZona?.color ?? COLOR_NUEVO)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const guardar = useGuardarTipoZona()
  const eliminar = useEliminarTipoZona()
  const ocupado = guardar.isPending || eliminar.isPending

  const nombreLimpio = nombre.trim()
  const repetido = existentes.some((otro) => otro.id !== tipoZona?.id && normalizar(otro.nombre) === normalizar(nombreLimpio))
  const error = !nombreLimpio ? 'Escribe un nombre.' : repetido ? 'Ya existe un tipo con ese nombre.' : null
  const mostrarError = error && (intentoGuardar || repetido)

  async function alGuardar() {
    setIntentoGuardar(true)
    if (error) return
    try {
      await guardar.mutateAsync({ id: tipoZona?.id, nombre, color })
      notificar.exito(tipoZona ? 'Cambios guardados' : 'Tipo de zona creado', { descripcion: `«${nombreLimpio}» ya se puede usar en las zonas.` })
      onCerrar()
    } catch (errorGuardar) {
      notificar.error('No se pudo guardar', { descripcion: mensajeErrorDatos(errorGuardar, { duplicado: 'Ya existe un tipo con ese nombre.' }) })
    }
  }

  async function alEliminar() {
    if (!tipoZona) return
    try {
      await eliminar.mutateAsync(tipoZona)
      notificar.exito('Tipo de zona eliminado', {
        descripcion: tipoZona.zonas > 0 ? `${plural(tipoZona.zonas, 'zona')} quedaron sin tipo.` : `«${tipoZona.nombre}» se eliminó.`,
      })
      onCerrar()
    } catch (errorEliminar) {
      notificar.error('No se pudo eliminar', {
        descripcion: mensajeErrorDatos(errorEliminar, { sinPermiso: 'Solo un admin puede eliminar tipos de zona.' }),
      })
    }
  }

  if (confirmarEliminar && tipoZona) {
    return (
      <Dialog
        titulo={`¿Eliminar «${tipoZona.nombre}»?`}
        onCerrar={eliminar.isPending ? undefined : () => setConfirmarEliminar(false)}
        acciones={
          <>
            <button type="button" className="btn btn-danger btn-block" disabled={eliminar.isPending} onClick={() => void alEliminar()}>
              {eliminar.isPending ? 'Eliminando…' : 'Eliminar'}
            </button>
            <button type="button" className="btn btn-secondary btn-block" disabled={eliminar.isPending} onClick={() => setConfirmarEliminar(false)}>
              Cancelar
            </button>
          </>
        }
      >
        <p>{tipoZona.zonas > 0 ? `${plural(tipoZona.zonas, 'zona')} quedarán sin tipo.` : 'Ninguna zona es de este tipo.'}</p>
      </Dialog>
    )
  }

  return (
    <Dialog
      titulo={tipoZona ? 'Editar tipo de zona' : 'Nuevo tipo de zona'}
      onCerrar={ocupado ? undefined : onCerrar}
      onSubmit={() => void alGuardar()}
      acciones={
        <>
          <button type="submit" className="btn btn-primary btn-block" disabled={ocupado} data-autofocus={tipoZona ? true : undefined}>
            {guardar.isPending ? 'Guardando…' : tipoZona ? 'Guardar cambios' : 'Crear tipo'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={ocupado}>
            Cancelar
          </button>
          {tipoZona && esAdmin && (
            <button type="button" className="btn-texto btn-texto-peligro" onClick={() => setConfirmarEliminar(true)} disabled={ocupado}>
              Eliminar tipo
            </button>
          )}
        </>
      }
    >
      <div className="formulario">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className="field-input"
            type="text"
            placeholder="Ej.: Comercial, Residencial"
            maxLength={MAX_NOMBRE}
            autoCapitalize="sentences"
            value={nombre}
            aria-invalid={Boolean(mostrarError)}
            aria-describedby={mostrarError ? 'tipo-zona-error' : undefined}
            onChange={(evento) => setNombre(evento.target.value)}
          />
          {mostrarError && (
            <p id="tipo-zona-error" className="field-error">
              {error}
            </p>
          )}
        </label>
        <div className="field">
          <span className="field-label">Color en el mapa</span>
          <SelectorColor valor={color} onCambiar={setColor} />
        </div>
      </div>
    </Dialog>
  )
}
