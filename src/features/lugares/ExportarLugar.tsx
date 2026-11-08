import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { mensajeErrorDatos } from '../../lib/errores'
import { notificar } from '../../lib/notificar'
import { plural } from '../../lib/texto'
import { useAuth } from '../auth/useAuth'
import { useEstudios } from '../estudios/api'
import { leerEvidencias } from '../evidencias/api'
import { guardarComo, nombreLimpio } from '../evidencias/descargaZip'
import { mostrarTamano } from '../evidencias/archivos'
import { useUsuarios } from '../usuarios/api'
import type { DetalleLugar } from './api'
import { armarZipDeEntradas, cantidadDeArchivos, pesoDeEntradas, planificarExportacion, type Entrada } from './planDeExportacion'

/** Desde este peso se pide confirmar: armar el ZIP en el navegador gasta memoria y tarda. */
const AVISAR_DESDE_BYTES = 200 * 1024 * 1024
/** Más que esto no se intenta: el navegador se quedaría sin memoria (un ZIP ocupa lo que pesan sus archivos, dos veces). */
const MAX_BYTES = 800 * 1024 * 1024

interface ExportarLugarProps {
  lugar: DetalleLugar
  /** Nombre de su categoría (puntos) o de su tipo de zona (zonas). */
  clasificacion: string | null
}

/**
 * "Exportar lugar (.zip)": todos sus estudios en un ZIP, con una carpeta por estudio y, dentro, una por
 * tipo de evidencia, para subirlo a SharePoint (decisión 0038). No aparece si el lugar no tiene estudios.
 */
export function ExportarLugar({ lugar, clasificacion }: ExportarLugarProps) {
  const { perfil } = useAuth()
  const { data: estudios } = useEstudios(lugar.id)
  const { data: cuentas } = useUsuarios()
  const [fase, setFase] = useState<{ tipo: 'buscando' } | { tipo: 'armando'; hechos: number; total: number } | null>(null)
  const [porConfirmar, setPorConfirmar] = useState<{ entradas: Entrada[]; peso: number } | null>(null)

  if (!estudios || estudios.length === 0) return null
  const ocupado = fase !== null

  async function exportar(entradas: Entrada[]) {
    const aviso = notificar.cargando('Armando la exportación…')
    setFase({ tipo: 'armando', hechos: 0, total: cantidadDeArchivos(entradas) })
    try {
      const { zip, fallidas } = await armarZipDeEntradas(entradas, {
        alAvanzar: (hechos, total) => setFase({ tipo: 'armando', hechos, total }),
      })
      const fecha = new Date().toLocaleDateString('en-CA')
      guardarComo(zip, `${nombreLimpio(lugar.nombre)} - exportación ${fecha}.zip`)
      if (fallidas.length > 0) {
        notificar.aviso('Exportado, pero faltan archivos', { id: aviso, descripcion: `No se pudo bajar: ${fallidas.map((ruta) => ruta.split('/').pop()).join(', ')}.` })
      } else {
        notificar.exito('Lugar exportado', { id: aviso, descripcion: 'Descomprime el ZIP y sube la carpeta a SharePoint.' })
      }
    } catch (error) {
      notificar.error('No se pudo exportar el lugar', { id: aviso, descripcion: mensajeErrorDatos(error) })
    } finally {
      setFase(null)
    }
  }

  async function preparar() {
    if (ocupado || !estudios) return
    setFase({ tipo: 'buscando' })
    try {
      const lista = await Promise.all(estudios.map((estudio) => leerEvidencias({ tipo: 'estudio', id: estudio.id })))
      const nombres = new Map((cuentas ?? []).map((cuenta) => [cuenta.id, cuenta.nombre]))
      const entradas = planificarExportacion({
        lugar,
        clasificacion,
        estudios,
        evidencias: new Map(estudios.map((estudio, i) => [estudio.id, lista[i]])),
        nombreDeCuenta: (id) => nombres.get(id) ?? null,
        exportadoPor: perfil?.nombre ?? 'KIRA',
        exportadoEn: new Date(),
      })
      const peso = pesoDeEntradas(entradas)
      if (peso > MAX_BYTES) {
        notificar.aviso('Pesa demasiado para exportarlo de una vez', {
          descripcion: `Son unos ${mostrarTamano(peso)} y el navegador no los aguanta. Descarga cada estudio por separado desde su presentación.`,
        })
        setFase(null)
        return
      }
      if (peso > AVISAR_DESDE_BYTES) {
        setPorConfirmar({ entradas, peso })
        setFase(null)
        return
      }
      await exportar(entradas)
    } catch (error) {
      notificar.error('No se pudo preparar la exportación', { descripcion: mensajeErrorDatos(error) })
      setFase(null)
    }
  }

  const texto =
    fase?.tipo === 'buscando'
      ? 'Buscando los archivos…'
      : fase?.tipo === 'armando'
        ? `Armando el ZIP… ${fase.hechos} de ${fase.total}`
        : 'Exportar lugar (.zip)'

  return (
    <div className="ficha-exportar">
      <button type="button" className="btn btn-secondary btn-block" disabled={ocupado} aria-live="polite" onClick={() => void preparar()}>
        {texto}
      </button>
      <p className="field-ayuda">
        {plural(estudios.length, 'estudio')}, en carpetas por estudio y tipo, listos para subir a SharePoint.
      </p>

      {porConfirmar && (
        <Dialog
          titulo={`Pesa unos ${mostrarTamano(porConfirmar.peso)}`}
          onCerrar={() => setPorConfirmar(null)}
          acciones={
            <>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => {
                  const { entradas } = porConfirmar
                  setPorConfirmar(null)
                  void exportar(entradas)
                }}
              >
                Exportar de todos modos
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setPorConfirmar(null)}>
                Cancelar
              </button>
            </>
          }
        >
          <p>Armarlo en el navegador puede tardar y gastar mucha memoria. Si el celular se queda sin memoria, descarga cada estudio por separado.</p>
        </Dialog>
      )}
    </div>
  )
}
