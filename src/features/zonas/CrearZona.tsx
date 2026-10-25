import { useState } from 'react'
import { useNavigate } from 'react-router'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { useCrearZona, ZONA_INVALIDA, ZONA_VACIA, type CamposZona } from './api'
import { DibujarZona } from './DibujarZona'
import { FormularioZona } from './FormularioZona'
import type { Esquina } from './geometria'

/** Crear una zona: se dibuja con la mira y luego se llenan sus datos. Los estudios se agregan desde su ficha. */
export function CrearZona() {
  const navigate = useNavigate()
  const crear = useCrearZona()
  const [esquinas, setEsquinas] = useState<Esquina[] | null>(null)
  const [campos, setCampos] = useState<CamposZona>(ZONA_VACIA)

  async function guardar() {
    try {
      const id = await crear.mutateAsync({ campos, esquinas: esquinas! })
      notificar.exito('Zona guardada', { descripcion: `«${campos.nombre.trim()}» ya está en el mapa.` })
      navigate(`/lugares/${id}`)
    } catch (error) {
      notificar.error('No se pudo guardar la zona', { descripcion: mensajeErrorDatos(error, { invalido: ZONA_INVALIDA }) })
    }
  }

  return (
    <>
      <DibujarZona cancelarA="/" textoTerminar="Terminar" onTerminar={setEsquinas} />
      {esquinas && (
        <FormularioZona
          titulo="Nueva zona"
          campos={campos}
          onCambiar={setCampos}
          onGuardar={guardar}
          textoGuardar="Guardar zona"
          onCerrar={() => setEsquinas(null)}
        />
      )}
    </>
  )
}
