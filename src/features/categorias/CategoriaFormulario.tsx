import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { normalizar } from '../../lib/texto'
import { useActualizarCategoria, useCrearCategoria, type Categoria } from './api'
import { COLOR_POR_DEFECTO } from './colores'
import { SelectorColor } from './SelectorColor'

const MAX_NOMBRE = 50

interface CategoriaFormularioProps {
  /** Si se pasa, se edita esa categoría; si no, se crea una nueva. */
  categoria?: Categoria
  /** Todas las categorías, para avisar de nombres repetidos antes de guardar. */
  existentes: Categoria[]
  onCerrar: () => void
  onEliminar?: (categoria: Categoria) => void
}

export function CategoriaFormulario({ categoria, existentes, onCerrar, onEliminar }: CategoriaFormularioProps) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? '')
  const [color, setColor] = useState(categoria?.color ?? COLOR_POR_DEFECTO)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const crear = useCrearCategoria()
  const actualizar = useActualizarCategoria()
  const guardando = crear.isPending || actualizar.isPending

  const nombreLimpio = nombre.trim()
  const repetida = existentes.some(
    (otra) => otra.id !== categoria?.id && normalizar(otra.nombre) === normalizar(nombreLimpio),
  )
  const error = !nombreLimpio ? 'Escribe un nombre.' : repetida ? 'Ya existe una categoría con ese nombre.' : null
  const mostrarError = error && (intentoGuardar || repetida)

  async function guardar() {
    setIntentoGuardar(true)
    if (error) return
    try {
      if (categoria) {
        await actualizar.mutateAsync({ id: categoria.id, nombre, color })
        notificar.exito('Cambios guardados', { descripcion: `La categoría «${nombreLimpio}» quedó actualizada.` })
      } else {
        await crear.mutateAsync({ nombre, color })
        notificar.exito('Categoría creada', { descripcion: `«${nombreLimpio}» ya se puede usar en las ubicaciones.` })
      }
      onCerrar()
    } catch (errorGuardar) {
      notificar.error('No se pudo guardar', {
        descripcion: mensajeErrorDatos(errorGuardar, { duplicado: 'Ya existe una categoría con ese nombre.' }),
      })
    }
  }

  return (
    <Dialog
      titulo={categoria ? 'Editar categoría' : 'Nueva categoría'}
      onCerrar={guardando ? undefined : onCerrar}
      onSubmit={() => void guardar()}
      acciones={
        <>
          {/* Al editar se enfoca el botón y no el campo, para que en celular no salte el teclado. */}
          <button type="submit" className="btn btn-primary btn-block" disabled={guardando} data-autofocus={categoria ? true : undefined}>
            {guardando ? 'Guardando…' : categoria ? 'Guardar cambios' : 'Crear categoría'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          {categoria && onEliminar && (
            <button
              type="button"
              className="btn-texto btn-texto-peligro"
              onClick={() => onEliminar(categoria)}
              disabled={guardando}
            >
              Eliminar categoría
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
            placeholder="Ej.: Café, Hotelería, Comercio"
            maxLength={MAX_NOMBRE}
            autoCapitalize="sentences"
            enterKeyHint="done"
            value={nombre}
            aria-invalid={Boolean(mostrarError)}
            aria-describedby={mostrarError ? 'categoria-nombre-error' : undefined}
            onChange={(evento) => setNombre(evento.target.value)}
          />
          {mostrarError && (
            <p id="categoria-nombre-error" className="field-error">
              {error}
            </p>
          )}
        </label>

        <div className="field">
          <span className="field-label">Color en el mapa</span>
          <SelectorColor valor={color} onCambiar={setColor} />
        </div>

        <div className="categoria-vista-previa" aria-hidden="true">
          <span className="categoria-punto categoria-punto-grande" style={{ background: color }} />
          <span>{nombreLimpio || 'Vista previa'}</span>
        </div>
      </div>
    </Dialog>
  )
}
