import { fechaLocal } from '../estudios/campos'
import type { TipoEvidencia } from '../evidencias/archivos'
import type { Lugar } from '../lugares/api'

/** Lo que hace falta de cada estudio (no archivado) para las cifras. */
export interface EstudioParaAnalitica {
  id: string
  ubicacionId: string
  /** 'AAAA-MM-DD' */
  fecha: string
  /** 'HH:MM' o 'HH:MM:SS' */
  horaInicio: string
  notas: string[]
  entrevistado: string | null
}

export interface EvidenciaParaAnalitica {
  /** Es de un estudio… */
  estudioId: string | null
  /** …o de un elemento. */
  ubicacionId: string | null
  tipo: TipoEvidencia
  bytes: number | null
  creadoPor: string | null
}

export interface ParticipanteParaAnalitica {
  estudioId: string
  usuarioId: string
}

export interface CategoriaParaAnalitica {
  id: string
  nombre: string
  color: string
}

export interface CuentaParaAnalitica {
  id: string
  nombre: string
}

export interface EntradaAnalitica {
  lugares: Lugar[]
  estudios: EstudioParaAnalitica[]
  evidencias: EvidenciaParaAnalitica[]
  participantes: ParticipanteParaAnalitica[]
  categorias: CategoriaParaAnalitica[]
  cuentas: CuentaParaAnalitica[]
  /** 'AAAA-MM-DD'. Se recibe para que el cálculo no dependa del reloj. */
  hoy: string
}

/** Una barra de un gráfico: cuántos hay de algo. */
export interface Barra {
  clave: string
  etiqueta: string
  valor: number
  /** Color propio (el de una categoría). Sin él, el gráfico usa el azul de KIRA. */
  color?: string
}

export interface Analitica {
  locales: number
  localesCerrados: number
  localesConEstudio: number
  elementos: number
  estudios: number
  estudiosEstaSemana: number
  estudiosSemanaPasada: number
  entrevistas: number
  evidencias: number
  /** Peso de los archivos de las evidencias, en bytes. */
  bytes: number
  /** Las últimas semanas, de la más antigua a la actual. `inicio` es el lunes ('AAAA-MM-DD'). */
  semanas: { inicio: string; cantidad: number }[]
  /** De lunes a domingo. */
  dias: { etiqueta: string; nombre: string; cantidad: number }[]
  franjas: Barra[]
  localesPorCategoria: Barra[]
  elementosPorCategoria: Barra[]
  evidenciasPorTipo: Barra[]
  estudiosConEvidencia: number
  estudiosConNotas: number
  estudiosConEntrevistado: number
  estudiosPorIntegrante: Barra[]
  evidenciasPorIntegrante: Barra[]
}

export const SEMANAS_MOSTRADAS = 8

const DIAS = [
  { etiqueta: 'Lu', nombre: 'lunes' },
  { etiqueta: 'Ma', nombre: 'martes' },
  { etiqueta: 'Mi', nombre: 'miércoles' },
  { etiqueta: 'Ju', nombre: 'jueves' },
  { etiqueta: 'Vi', nombre: 'viernes' },
  { etiqueta: 'Sá', nombre: 'sábado' },
  { etiqueta: 'Do', nombre: 'domingo' },
]

const TIPOS_EN_ORDEN: TipoEvidencia[] = ['foto', 'audio', 'documento', 'video', 'texto']
export const NOMBRE_TIPO_PLURAL: Record<TipoEvidencia, string> = {
  foto: 'Fotos',
  audio: 'Audios',
  documento: 'Documentos',
  video: 'Videos',
  texto: 'Textos',
}

export const SIN_CATEGORIA = 'Sin categoría'
export const SIN_AUTOR = 'Cuenta compartida'

/** '2026-10-30' → fecha local (no UTC, para no desfasarse un día). */
function aFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

/** 0 = lunes … 6 = domingo. */
const diaDeLaSemana = (fecha: string) => (aFecha(fecha).getDay() + 6) % 7

/** El lunes de la semana de esa fecha. */
export function inicioDeSemana(fecha: string) {
  const lunes = aFecha(fecha)
  lunes.setDate(lunes.getDate() - diaDeLaSemana(fecha))
  return fechaLocal(lunes)
}

function sumarDias(fecha: string, dias: number) {
  const resultado = aFecha(fecha)
  resultado.setDate(resultado.getDate() + dias)
  return fechaLocal(resultado)
}

function contarPor<T>(elementos: T[], clave: (elemento: T) => string | null) {
  const conteo = new Map<string, number>()
  for (const elemento of elementos) {
    const valor = clave(elemento)
    if (valor !== null) conteo.set(valor, (conteo.get(valor) ?? 0) + 1)
  }
  return conteo
}

/** De mayor a menor; a igualdad, por nombre, para que el orden no salte entre cargas. */
const porValor = (a: Barra, b: Barra) => b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, 'es')

function barrasPorCategoria(lugares: Lugar[], categorias: CategoriaParaAnalitica[]): Barra[] {
  const conteo = contarPor(lugares, (lugar) => lugar.categoriaId ?? '')
  const barras: Barra[] = []
  for (const categoria of categorias) {
    const valor = conteo.get(categoria.id) ?? 0
    if (valor > 0) barras.push({ clave: categoria.id, etiqueta: categoria.nombre, valor, color: categoria.color })
  }
  // Una categoría que ya no existe cae en "sin categoría", igual que en el mapa.
  const conocidas = new Set(categorias.map((categoria) => categoria.id))
  const sinCategoria = lugares.filter((lugar) => !lugar.categoriaId || !conocidas.has(lugar.categoriaId)).length
  barras.sort(porValor)
  // En gris, para que no se confunda con ninguna categoría (como el círculo blanco del mapa).
  if (sinCategoria > 0) barras.push({ clave: 'sin-categoria', etiqueta: SIN_CATEGORIA, valor: sinCategoria, color: 'var(--color-text-muted)' })
  return barras
}

/** Las cifras del avance del levantamiento: locales, estudios, evidencias y quién los hizo. Sin zonas ni salidas. */
export function calcularAnalitica({ lugares, estudios, evidencias, participantes, categorias, cuentas, hoy }: EntradaAnalitica): Analitica {
  const puntos = lugares.filter((lugar) => lugar.tipo === 'punto')
  const elementos = lugares.filter((lugar) => lugar.tipo === 'elemento')
  const idsDePuntos = new Set(puntos.map((lugar) => lugar.id))
  const idsDeElementos = new Set(elementos.map((lugar) => lugar.id))

  // Solo cuentan los estudios de locales (los de zonas son recorridos) que siguen en el mapa.
  const delLocal = estudios.filter((estudio) => idsDePuntos.has(estudio.ubicacionId))
  const idsDeEstudios = new Set(delLocal.map((estudio) => estudio.id))
  const deLocales = evidencias.filter((evidencia) =>
    evidencia.estudioId !== null ? idsDeEstudios.has(evidencia.estudioId) : evidencia.ubicacionId !== null && idsDeElementos.has(evidencia.ubicacionId),
  )

  const lunesActual = inicioDeSemana(hoy)
  const porSemana = contarPor(delLocal, (estudio) => inicioDeSemana(estudio.fecha))
  const semanas = Array.from({ length: SEMANAS_MOSTRADAS }, (_, i) => {
    const inicio = sumarDias(lunesActual, -7 * (SEMANAS_MOSTRADAS - 1 - i))
    return { inicio, cantidad: porSemana.get(inicio) ?? 0 }
  })

  const porDia = contarPor(delLocal, (estudio) => String(diaDeLaSemana(estudio.fecha)))
  const franjaDe = (hora: string) => (hora < '12:00' ? 'manana' : hora < '18:00' ? 'tarde' : 'noche')
  const porFranja = contarPor(delLocal, (estudio) => franjaDe(estudio.horaInicio.slice(0, 5)))

  const evidenciasPorEstudio = contarPor(
    deLocales.filter((evidencia) => evidencia.estudioId !== null),
    (evidencia) => evidencia.estudioId,
  )
  const porTipo = contarPor(deLocales, (evidencia) => evidencia.tipo)

  const nombreDe = new Map(cuentas.map((cuenta) => [cuenta.id, cuenta.nombre]))
  const estudiosPorCuenta = contarPor(
    participantes.filter((participante) => idsDeEstudios.has(participante.estudioId)),
    (participante) => participante.usuarioId,
  )
  const evidenciasPorCuenta = contarPor(deLocales, (evidencia) => evidencia.creadoPor ?? '')
  const aBarras = (conteo: Map<string, number>, conSinAutor: boolean): Barra[] =>
    [...conteo.entries()]
      .flatMap(([id, valor]): Barra[] => {
        const nombre = id === '' ? SIN_AUTOR : nombreDe.get(id)
        // Un participante cuya cuenta ya no existe no tiene nombre que mostrar.
        if (nombre === undefined || (id === '' && !conSinAutor)) return []
        return [{ clave: id || 'sin-autor', etiqueta: nombre, valor }]
      })
      .sort(porValor)

  return {
    locales: puntos.length,
    localesCerrados: puntos.filter((lugar) => lugar.estado === 'cerrada').length,
    localesConEstudio: new Set(delLocal.map((estudio) => estudio.ubicacionId)).size,
    elementos: elementos.length,
    estudios: delLocal.length,
    estudiosEstaSemana: semanas[SEMANAS_MOSTRADAS - 1].cantidad,
    estudiosSemanaPasada: semanas[SEMANAS_MOSTRADAS - 2].cantidad,
    entrevistas: delLocal.filter((estudio) => (estudio.entrevistado ?? '').trim() !== '').length,
    evidencias: deLocales.length,
    bytes: deLocales.reduce((total, evidencia) => total + (evidencia.bytes ?? 0), 0),
    semanas,
    dias: DIAS.map((dia, i) => ({ ...dia, cantidad: porDia.get(String(i)) ?? 0 })),
    franjas: [
      { clave: 'manana', etiqueta: 'Mañana (antes de las 12)', valor: porFranja.get('manana') ?? 0 },
      { clave: 'tarde', etiqueta: 'Tarde (12 a 6 p. m.)', valor: porFranja.get('tarde') ?? 0 },
      { clave: 'noche', etiqueta: 'Noche (desde las 6 p. m.)', valor: porFranja.get('noche') ?? 0 },
    ],
    localesPorCategoria: barrasPorCategoria(puntos, categorias),
    elementosPorCategoria: barrasPorCategoria(elementos, categorias),
    // Foto, audio, documento y video se muestran siempre (aunque estén en cero); texto solo si hay.
    evidenciasPorTipo: TIPOS_EN_ORDEN.filter((tipo) => tipo !== 'texto' || (porTipo.get(tipo) ?? 0) > 0).map((tipo) => ({
      clave: tipo,
      etiqueta: NOMBRE_TIPO_PLURAL[tipo],
      valor: porTipo.get(tipo) ?? 0,
    })),
    estudiosConEvidencia: delLocal.filter((estudio) => (evidenciasPorEstudio.get(estudio.id) ?? 0) > 0).length,
    estudiosConNotas: delLocal.filter((estudio) => estudio.notas.some((nota) => nota.trim() !== '')).length,
    estudiosConEntrevistado: delLocal.filter((estudio) => (estudio.entrevistado ?? '').trim() !== '').length,
    estudiosPorIntegrante: aBarras(estudiosPorCuenta, false),
    evidenciasPorIntegrante: aBarras(evidenciasPorCuenta, true),
  }
}
