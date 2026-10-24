/*
 * Conversor de Markdown a HTML para la documentación (/docs).
 * Cubre solo lo que usan los .md del repositorio: títulos, párrafos, listas (también anidadas),
 * tablas, citas, bloques de código, imágenes en su propia línea, negrita, cursiva, código en línea y enlaces.
 * Así no hace falta ninguna dependencia nueva.
 */

export interface Encabezado {
  nivel: number
  id: string
  texto: string
}

export interface Documento {
  titulo: string
  html: string
  encabezados: Encabezado[]
}

export interface OpcionesConversion {
  /** Prefijo de los ids de los títulos, para que no choquen entre páginas. */
  prefijo: string
  /** Traduce el destino de un enlace del Markdown al de la documentación. */
  enlace: (href: string) => string
  /** URL base del repositorio, para enlazar las referencias a issues (#13). */
  repositorio: string
  /** Devuelve el HTML de una imagen que ocupa su propia línea (por ejemplo, un diagrama SVG). */
  imagen: (href: string, alt: string) => string
}

const LISTA = /^(\s*)([-*]|\d+\.)\s+(.*)$/
const TITULO = /^(#{1,6})\s+(.*)$/
const IMAGEN = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/
const SEPARADOR_TABLA = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/

export function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** "Código y diseño" → "codigo-y-diseno". */
export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function convertir(markdown: string, opciones: OpcionesConversion): Documento {
  const lineas = markdown.replace(/\r\n/g, '\n').split('\n')
  const encabezados: Encabezado[] = []
  const idsUsados = new Set<string>()
  let titulo = ''

  const enLinea = (texto: string) => convertirEnLinea(texto, opciones)

  function bloques(desde: number, hasta: number): string {
    const html: string[] = []
    let i = desde

    while (i < hasta) {
      const linea = lineas[i]

      if (!linea.trim()) {
        i++
        continue
      }

      const cerca = linea.match(/^```(\w*)/)
      if (cerca) {
        const codigo: string[] = []
        i++
        while (i < hasta && !lineas[i].startsWith('```')) codigo.push(lineas[i++])
        i++
        html.push(bloqueCodigo(codigo.join('\n'), cerca[1]))
        continue
      }

      const imagen = linea.match(IMAGEN)
      if (imagen) {
        html.push(opciones.imagen(imagen[2], imagen[1]))
        i++
        continue
      }

      const encabezado = linea.match(TITULO)
      if (encabezado) {
        const nivel = encabezado[1].length
        const contenido = enLinea(encabezado[2])
        if (nivel === 1) {
          titulo ||= textoPlano(contenido)
          html.push(`<h1>${contenido}</h1>`)
        } else {
          const id = idUnico(slug(contenido), idsUsados)
          encabezados.push({ nivel, id, texto: textoPlano(contenido) })
          const ancla = `<a class="ancla" href="#/${opciones.prefijo}/${id}" aria-label="Enlace a esta sección">#</a>`
          html.push(`<h${nivel} id="${opciones.prefijo}--${id}">${contenido}${ancla}</h${nivel}>`)
        }
        i++
        continue
      }

      if (linea.trimStart().startsWith('|') && SEPARADOR_TABLA.test(lineas[i + 1] ?? '')) {
        const filas: string[] = [linea]
        i += 2
        while (i < hasta && lineas[i].trimStart().startsWith('|')) filas.push(lineas[i++])
        html.push(tabla(filas, enLinea))
        continue
      }

      if (linea.startsWith('>')) {
        const inicio = i
        while (i < hasta && lineas[i].startsWith('>')) {
          lineas[i] = lineas[i].replace(/^>\s?/, '')
          i++
        }
        html.push(`<blockquote>${bloques(inicio, i)}</blockquote>`)
        continue
      }

      if (LISTA.test(linea)) {
        const [lista, siguiente] = convertirLista(i, hasta, linea.match(LISTA)![1].length)
        html.push(lista)
        i = siguiente
        continue
      }

      const parrafo: string[] = []
      while (i < hasta && lineas[i].trim() && !iniciaBloque(lineas[i], lineas[i + 1])) parrafo.push(lineas[i++].trim())
      html.push(`<p>${enLinea(parrafo.join(' '))}</p>`)
    }

    return html.join('\n')
  }

  function convertirLista(desde: number, hasta: number, sangria: number): [string, number] {
    const ordenada = /^\s*\d+\./.test(lineas[desde])
    const elementos: string[] = []
    let i = desde

    while (i < hasta) {
      if (!lineas[i].trim()) {
        const siguiente = lineas[i + 1]?.match(LISTA)
        if (siguiente && siguiente[1].length >= sangria) {
          i++
          continue
        }
        break
      }

      const elemento = lineas[i].match(LISTA)
      if (!elemento) break
      const nivel = elemento[1].length
      if (nivel < sangria) break

      if (nivel > sangria && elementos.length) {
        const [sublista, siguiente] = convertirLista(i, hasta, nivel)
        elementos[elementos.length - 1] += sublista
        i = siguiente
        continue
      }
      if (/^\d+\./.test(elemento[2]) !== ordenada) break

      const texto = [elemento[3]]
      i++
      while (i < hasta && lineas[i].trim() && !LISTA.test(lineas[i]) && /^\s+/.test(lineas[i])) texto.push(lineas[i++].trim())
      elementos.push(enLinea(texto.join(' ')))
    }

    const etiqueta = ordenada ? 'ol' : 'ul'
    return [`<${etiqueta}>${elementos.map((e) => `<li>${e}</li>`).join('')}</${etiqueta}>`, i]
  }

  const html = bloques(0, lineas.length)
  return { titulo, html, encabezados }
}

function iniciaBloque(linea: string, siguiente: string | undefined): boolean {
  return (
    linea.startsWith('```') ||
    TITULO.test(linea) ||
    IMAGEN.test(linea) ||
    linea.startsWith('>') ||
    LISTA.test(linea) ||
    (linea.trimStart().startsWith('|') && SEPARADOR_TABLA.test(siguiente ?? ''))
  )
}

function idUnico(base: string, usados: Set<string>): string {
  let id = base || 'seccion'
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`
  usados.add(id)
  return id
}

function textoPlano(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function celdas(fila: string): string[] {
  return fila
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())
}

function tabla(filas: string[], enLinea: (texto: string) => string): string {
  const [cabecera, ...cuerpo] = filas
  const th = celdas(cabecera)
    .map((c) => `<th>${enLinea(c)}</th>`)
    .join('')
  const tr = cuerpo.map((f) => `<tr>${celdas(f).map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`).join('\n')
  return `<div class="tabla"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`
}

function convertirEnLinea(texto: string, opciones: OpcionesConversion): string {
  // El código en línea se aparta primero para que su contenido no se interprete.
  const codigos: string[] = []
  let html = texto.replace(/`([^`]+)`/g, (_, codigo: string) => `\uE000${codigos.push(codigo) - 1}\uE000`)
  html = escapar(html)

  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, etiqueta: string, href: string) => {
    const destino = opciones.enlace(href.replace(/&amp;/g, '&'))
    const externo = /^https?:/.test(destino)
    const atributos = externo ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${escapar(destino)}"${atributos}>${etiqueta}</a>`
  })
  html = html.replace(
    /(^|[\s(–])#(\d+)\b/g,
    (_, antes: string, numero: string) =>
      `${antes}<a class="issue" href="${opciones.repositorio}/issues/${numero}" target="_blank" rel="noopener noreferrer">#${numero}</a>`,
  )
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')

  return html.replace(/\uE000(\d+)\uE000/g, (_, n: string) => `<code>${escapar(codigos[Number(n)])}</code>`)
}

/* ---------- Bloques de código con colores Monokai ---------- */

interface Regla {
  patron: RegExp
  clase: string
}

const COMENTARIO: Regla = { patron: /(?<=^|\s)#(?:\s.*)?$/, clase: 'mk-comentario' }

const REGLAS_BASH: Regla[] = [
  COMENTARIO,
  { patron: /"[^"]*"|'[^']*'/, clase: 'mk-cadena' },
  { patron: /^\s*[\w.-]+/, clase: 'mk-funcion' },
  { patron: /(?<=\s)--?[\w-]+/, clase: 'mk-parametro' },
  { patron: /&&|\|\||[|>]/, clase: 'mk-clave' },
  { patron: /\b\d+\b/, clase: 'mk-numero' },
]

const REGLAS_TEXTO: Regla[] = [
  COMENTARIO,
  { patron: /^(?:feat|fix|docs|style|refactor|perf|test|build|ci|chore)(?=[(:])/, clase: 'mk-clave' },
  { patron: /(?<=^\w+)\([^)]*\)(?=:)/, clase: 'mk-parametro' },
  { patron: /[└├│─┘┐┌▶→]+/, clase: 'mk-clave' },
  { patron: /[\w.-]+\/(?=\s|$)/, clase: 'mk-tipo' },
  { patron: /[\w.-]+\.(?:md|ts|tsx|css|toml|json|mjs|html)\b/, clase: 'mk-funcion' },
  { patron: /#\d+/, clase: 'mk-numero' },
]

const NOMBRES_LENGUAJE: Record<string, string> = { bash: 'Terminal', sh: 'Terminal', sql: 'SQL', ts: 'TypeScript' }

function bloqueCodigo(codigo: string, lenguaje: string): string {
  const reglas = lenguaje === 'bash' || lenguaje === 'sh' ? REGLAS_BASH : REGLAS_TEXTO
  const combinado = new RegExp(reglas.map((r) => `(${r.patron.source})`).join('|'), 'g')
  const resaltado = codigo
    .split('\n')
    .map((linea) => {
      let html = ''
      let ultimo = 0
      for (const m of linea.matchAll(combinado)) {
        if (!m[0]) continue
        const regla = reglas[m.slice(1).findIndex((g) => g !== undefined)]
        html += escapar(linea.slice(ultimo, m.index)) + `<span class="${regla.clase}">${escapar(m[0])}</span>`
        ultimo = m.index + m[0].length
      }
      return html + escapar(linea.slice(ultimo))
    })
    .join('\n')

  const etiqueta = NOMBRES_LENGUAJE[lenguaje] ?? (lenguaje || 'Texto')
  return `<figure class="codigo"><figcaption><span>${escapar(etiqueta)}</span><button type="button" class="copiar">Copiar</button></figcaption><pre><code>${resaltado}</code></pre></figure>`
}
