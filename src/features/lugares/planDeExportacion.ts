import { zipSync } from 'fflate'
import { plural } from '../../lib/texto'
import { CARPETA, nombreLimpio, nombreUnico, textosYEnlaces } from '../evidencias/descargaZip'
import type { Evidencia } from '../evidencias/api'
import { NOMBRE_TIPO } from '../evidencias/archivos'
import type { Estudio } from '../estudios/api'
import { fueEditado, mostrarFecha, mostrarFechaDe, mostrarHora } from '../estudios/campos'
import type { DetalleLugar } from './api'

/**
 * Exportar un lugar completo en un ZIP (decisión 0038): una carpeta por estudio y, dentro, una por
 * tipo de evidencia, lista para subir a SharePoint.
 *
 *   Café Manila/
 *     Lugar.txt
 *     2026-10-30 14.00 - Ana Pérez/
 *       Resumen.txt
 *       Fotos/  Audios/  Documentos/
 *       Textos y enlaces.txt
 *
 * Todo lo que decide el contenido y los nombres está aquí, en funciones puras; el ZIP se arma en
 * `armarZipDeEntradas`.
 */

/** Un archivo del ZIP: un texto que se escribe tal cual, o el archivo de una evidencia que se descarga. */
export type Entrada = { ruta: string; texto: string } | { ruta: string; evidencia: Evidencia }

export interface DatosExportacion {
  lugar: DetalleLugar
  /** Nombre de su categoría (puntos) o de su tipo de zona (zonas). */
  clasificacion: string | null
  estudios: Estudio[]
  /** Evidencias de cada estudio, por id del estudio. */
  evidencias: Map<string, Evidencia[]>
  /** Nombre de una cuenta a partir de su id; null si ya no existe. */
  nombreDeCuenta: (id: string) => string | null
  /** Quién exporta y cuándo, para dejarlo en Lugar.txt. */
  exportadoPor: string
  exportadoEn: Date
}

/**
 * Cada carpeta o archivo se recorta a este largo. SharePoint limita la ruta completa a 400 caracteres
 * y Windows a 260: con lugar, estudio, tipo y archivo de este tamaño queda margen para donde se guarde.
 */
const MAX_CARPETA = 60
const MAX_ARCHIVO = 80

/** Recorta un nombre, conservando la extensión si la tiene. */
function recortar(nombre: string, max: number, conExtension: boolean) {
  if (nombre.length <= max) return nombre
  const punto = nombre.lastIndexOf('.')
  const extension = conExtension && punto > 0 && nombre.length - punto <= 8 ? nombre.slice(punto) : ''
  return nombre.slice(0, max - extension.length).trimEnd() + extension
}

/** Un nombre de carpeta válido en Windows, macOS, Linux y SharePoint: sin caracteres prohibidos, sin punto ni espacio al final. */
export function nombreDeCarpeta(nombre: string) {
  return recortar(nombreLimpio(nombre), MAX_CARPETA, false).replace(/[. ]+$/, '') || 'Sin nombre'
}

/** Si la carpeta ya existe, le agrega " (2)", " (3)"… al final (no antes del punto, que aquí es parte de la hora). */
function carpetaUnica(nombre: string, usadas: Set<string>) {
  let candidato = nombre
  for (let n = 2; usadas.has(candidato); n++) candidato = `${nombre} (${n})`
  usadas.add(candidato)
  return candidato
}

/**
 * "2026-10-30 14.00 - Ana Pérez": la fecha primero, para que las carpetas queden en orden. Un recorrido
 * (estudio de una zona) no tiene a quién se entrevistó, así que lleva solo la fecha y la hora.
 */
export function nombreDeCarpetaDeEstudio(estudio: Pick<Estudio, 'fecha' | 'horaInicio' | 'entrevistado'>, esZona = false) {
  const base = `${estudio.fecha} ${estudio.horaInicio.replace(':', '.')}`
  return nombreDeCarpeta(estudio.entrevistado && !esZona ? `${base} - ${estudio.entrevistado}` : base)
}

/** Líneas "Etiqueta: valor", sin las que no tienen valor. */
const campos = (...filas: [string, string | null | undefined | false][]) =>
  filas.flatMap(([etiqueta, valor]) => (valor ? [`${etiqueta}: ${valor}`] : []))

export function textoDeLugar({ lugar, clasificacion, estudios, exportadoPor, exportadoEn }: DatosExportacion) {
  const esZona = lugar.tipo === 'zona'
  const descripcion = lugar.descripcion ? ['', 'Descripción:', lugar.descripcion] : []
  return [
    lugar.nombre.toUpperCase(),
    '',
    ...campos(
      ['Tipo', esZona ? 'Zona' : 'Punto'],
      [esZona ? 'Tipo de zona' : 'Categoría', clasificacion],
      ['Estado', esZona ? null : lugar.estado === 'cerrada' ? 'Cerrado' : 'Activo'],
      ['Archivado', lugar.archivadaEn ? `sí, el ${mostrarFechaDe(lugar.archivadaEn)}` : null],
      ['Dirección', lugar.direccion],
      ['Complemento', lugar.complemento],
      ['Contacto', lugar.contactoNombre],
      ['Teléfono', lugar.contactoTelefono],
    ),
    ...descripcion,
    '',
    `Estudios exportados: ${estudios.length}`,
    `Exportado el ${mostrarFechaDe(exportadoEn.toISOString())} por ${exportadoPor}`,
  ].join('\n')
}

export function textoDeEstudio(estudio: Estudio, { lugar, nombreDeCuenta }: DatosExportacion, evidencias: Evidencia[]) {
  const participantes = [...estudio.participanteIds.map((id) => nombreDeCuenta(id)).filter(Boolean), ...estudio.participantesAnteriores]
  const quienLoRegistro = estudio.creadoPor ? nombreDeCuenta(estudio.creadoPor) : null
  const quienLoEdito = estudio.actualizadoPor && fueEditado(estudio.creadoEn, estudio.actualizadoEn) ? nombreDeCuenta(estudio.actualizadoPor) : null
  const conteo = (Object.keys(NOMBRE_TIPO) as (keyof typeof NOMBRE_TIPO)[])
    .map((tipo) => [tipo, evidencias.filter((evidencia) => evidencia.tipo === tipo).length] as const)
    .filter(([, cantidad]) => cantidad > 0)
    .map(([tipo, cantidad]) => plural(cantidad, NOMBRE_TIPO[tipo].toLowerCase()))
  const notas = estudio.notas.length > 0 ? ['', 'Notas:', ...estudio.notas.map((nota, i) => `${i + 1}. ${nota}`)] : []
  return [
    `ESTUDIO DEL ${mostrarFecha(estudio.fecha).toUpperCase()}`,
    '',
    ...campos(
      ['Lugar', lugar.nombre],
      ['Fecha', mostrarFecha(estudio.fecha)],
      ['Hora', `${mostrarHora(estudio.horaInicio)} – ${mostrarHora(estudio.horaFin)}`],
      // Un recorrido (estudio de una zona) no tiene a quién se entrevistó.
      ['Entrevistado', lugar.tipo === 'zona' ? null : estudio.entrevistado],
      ['Participantes', participantes.join(', ')],
      ['Registrado por', quienLoRegistro && `${quienLoRegistro}, el ${mostrarFechaDe(estudio.creadoEn)}`],
      ['Editado por', quienLoEdito && `${quienLoEdito}, el ${mostrarFechaDe(estudio.actualizadoEn)}`],
    ),
    ...notas,
    '',
    `Evidencias: ${conteo.length > 0 ? conteo.join(', ') : 'ninguna'}`,
  ].join('\n')
}

/**
 * Qué lleva el ZIP y en qué ruta. Un estudio archivado no entra (quien llama pasa solo los visibles),
 * y las carpetas sin archivos no se crean porque el ZIP solo tiene las rutas de lo que sí hay.
 */
export function planificarExportacion(datos: DatosExportacion): Entrada[] {
  const raiz = nombreDeCarpeta(datos.lugar.nombre)
  const entradas: Entrada[] = [{ ruta: `${raiz}/Lugar.txt`, texto: textoDeLugar(datos) }]
  const carpetas = new Set<string>()
  const rutas = new Set<string>()

  // Del más antiguo al más reciente: así, con la fecha primero, el orden de las carpetas es el del tiempo.
  const ordenados = [...datos.estudios].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio))
  for (const estudio of ordenados) {
    const evidencias = datos.evidencias.get(estudio.id) ?? []
    const carpeta = `${raiz}/${carpetaUnica(nombreDeCarpetaDeEstudio(estudio, datos.lugar.tipo === 'zona'), carpetas)}`
    entradas.push({ ruta: `${carpeta}/Resumen.txt`, texto: textoDeEstudio(estudio, datos, evidencias) })

    // Las más antiguas primero, para que a un nombre repetido le toque el "(2)" al más reciente.
    for (const evidencia of [...evidencias].reverse()) {
      if (!evidencia.archivo) continue
      const subcarpeta = CARPETA[evidencia.tipo]
      const nombre = recortar(nombreLimpio(evidencia.archivo.nombre), MAX_ARCHIVO, true)
      const ruta = nombreUnico(`${carpeta}/${subcarpeta ? `${subcarpeta}/` : ''}${nombre}`, rutas)
      entradas.push({ ruta, evidencia })
    }

    const textos = textosYEnlaces(evidencias)
    if (textos) entradas.push({ ruta: `${carpeta}/Textos y enlaces.txt`, texto: textos })
  }
  return entradas
}

/** Cuánto pesan en total los archivos que habría que descargar. */
export const pesoDeEntradas = (entradas: Entrada[]) =>
  entradas.reduce((total, entrada) => total + ('evidencia' in entrada ? (entrada.evidencia.archivo?.bytes ?? 0) : 0), 0)

/** Cuántos archivos hay que descargar (los textos no cuentan: ya están escritos). */
export const cantidadDeArchivos = (entradas: Entrada[]) => entradas.filter((entrada) => 'evidencia' in entrada).length

export interface ResultadoExportacion {
  zip: Uint8Array
  /** Rutas de los archivos que no se pudieron descargar. */
  fallidas: string[]
}

/** Cuántos archivos se bajan a la vez: lo bastante para ir rápido sin saturar la conexión del celular. */
const DESCARGAS_SIMULTANEAS = 4

/** Descarga los archivos y arma el ZIP. No se comprime: fotos, audios y PDF ya vienen comprimidos. */
export async function armarZipDeEntradas(
  entradas: Entrada[],
  { alAvanzar }: { alAvanzar?: (hechos: number, total: number) => void } = {},
): Promise<ResultadoExportacion> {
  const archivos: Record<string, Uint8Array> = {}
  const fallidas: string[] = []
  const codificador = new TextEncoder()

  for (const entrada of entradas) if ('texto' in entrada) archivos[entrada.ruta] = codificador.encode(entrada.texto)

  const pendientes = entradas.filter((entrada) => 'evidencia' in entrada)
  let siguiente = 0
  let hechos = 0
  async function trabajar() {
    while (siguiente < pendientes.length) {
      const entrada = pendientes[siguiente++]
      try {
        const enlace = entrada.evidencia.enlace
        if (!enlace) throw new Error('sin enlace')
        const respuesta = await fetch(enlace)
        if (!respuesta.ok) throw new Error(String(respuesta.status))
        archivos[entrada.ruta] = new Uint8Array(await respuesta.arrayBuffer())
      } catch {
        fallidas.push(entrada.ruta)
      }
      alAvanzar?.(++hechos, pendientes.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(DESCARGAS_SIMULTANEAS, pendientes.length) }, trabajar))

  return { zip: zipSync(archivos, { level: 0 }), fallidas }
}
