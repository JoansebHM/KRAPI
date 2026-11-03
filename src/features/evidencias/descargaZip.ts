import { zipSync } from 'fflate'
import { useState } from 'react'
import { notificar } from '../../lib/notificar'
import type { Evidencia } from './api'
import { NOMBRE_TIPO, type TipoEvidencia } from './archivos'

/** Carpeta de cada tipo dentro del ZIP con todas las evidencias. */
const CARPETA: Record<TipoEvidencia, string> = {
  foto: 'Fotos',
  audio: 'Audios',
  documento: 'Documentos',
  texto: '',
  video: '',
}

/** Un nombre de archivo sin los caracteres que Windows, macOS o Linux no aceptan. */
const nombreLimpio = (nombre: string) =>
  [...nombre].map((letra) => (letra.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(letra) ? '-' : letra)).join('').trim() || 'archivo'

/** Si el nombre ya se usó, le agrega " (2)", " (3)"… antes de la extensión. */
function nombreUnico(nombre: string, usados: Set<string>) {
  let candidato = nombre
  const punto = nombre.lastIndexOf('.')
  const base = punto > 0 ? nombre.slice(0, punto) : nombre
  const extension = punto > 0 ? nombre.slice(punto) : ''
  for (let n = 2; usados.has(candidato); n++) candidato = `${base} (${n})${extension}`
  usados.add(candidato)
  return candidato
}

/** Textos y enlaces (que no son archivos) en un solo `.txt` para incluirlos en el ZIP. */
function textosYEnlaces(evidencias: Evidencia[]) {
  const partes = evidencias.flatMap((evidencia) => {
    const contenido = evidencia.urlExterna ?? evidencia.texto
    if (!contenido || evidencia.archivo) return []
    return [`${evidencia.titulo ?? NOMBRE_TIPO[evidencia.tipo]}\n${contenido}`]
  })
  return partes.length > 0 ? partes.join('\n\n---\n\n') : null
}

export interface ResultadoZip {
  zip: Uint8Array
  /** Evidencias cuyo archivo no se pudo descargar. */
  fallidas: string[]
}

/**
 * Arma un ZIP con los archivos de las evidencias (cada uno se baja con su enlace temporal). Con `carpetas`
 * se separan por tipo y se suman los textos y enlaces en un `.txt`. No se comprime: fotos, audios y PDF ya vienen comprimidos.
 */
export async function armarZip(evidencias: Evidencia[], { carpetas }: { carpetas: boolean }): Promise<ResultadoZip> {
  const archivos: Record<string, Uint8Array> = {}
  const usados = new Set<string>()
  const fallidas: string[] = []

  await Promise.all(
    evidencias.map(async (evidencia) => {
      if (!evidencia.archivo || !evidencia.enlace) return
      try {
        const respuesta = await fetch(evidencia.enlace)
        if (!respuesta.ok) throw new Error(String(respuesta.status))
        const datos = new Uint8Array(await respuesta.arrayBuffer())
        const carpeta = carpetas && CARPETA[evidencia.tipo] ? `${CARPETA[evidencia.tipo]}/` : ''
        archivos[nombreUnico(`${carpeta}${nombreLimpio(evidencia.archivo.nombre)}`, usados)] = datos
      } catch {
        fallidas.push(evidencia.archivo.nombre)
      }
    }),
  )

  const textos = carpetas ? textosYEnlaces(evidencias) : null
  if (textos) archivos[nombreUnico('Textos y enlaces.txt', usados)] = new TextEncoder().encode(textos)

  if (Object.keys(archivos).length === 0) throw new Error('No se pudo descargar ningún archivo')
  return { zip: zipSync(archivos, { level: 0 }), fallidas }
}

function guardarComo(zip: Uint8Array, nombre: string) {
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Descarga evidencias en un ZIP, avisando mientras se arma y si alguna falló. */
export function useDescargaZip() {
  const [descargando, setDescargando] = useState(false)

  async function descargar(evidencias: Evidencia[], nombreZip: string, carpetas: boolean) {
    if (descargando) return
    setDescargando(true)
    const aviso = notificar.cargando('Preparando el ZIP…')
    try {
      const { zip, fallidas } = await armarZip(evidencias, { carpetas })
      guardarComo(zip, `${nombreLimpio(nombreZip)}.zip`)
      if (fallidas.length > 0) {
        notificar.aviso('ZIP descargado, pero faltan archivos', { id: aviso, descripcion: `No se pudo bajar: ${fallidas.join(', ')}.` })
      } else {
        notificar.exito('ZIP descargado', { id: aviso })
      }
    } catch {
      notificar.error('No se pudo preparar el ZIP', { id: aviso, descripcion: 'Revisa tu conexión e inténtalo de nuevo.' })
    } finally {
      setDescargando(false)
    }
  }

  return { descargar, descargando }
}
