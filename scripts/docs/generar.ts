/*
 * Genera la documentación navegable de KIRA (/docs) a partir de los .md del repositorio.
 * El resultado es un solo HTML sin dependencias externas, que funciona sin internet.
 *
 *   npm run docs     escribe dist/docs/index.html
 *
 * En desarrollo, el plugin de vite.config.ts la sirve en /docs y la regenera en cada visita;
 * al compilar se incluye en dist/docs/index.html. Los .md siguen siendo la fuente de verdad.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertir, escapar, type Encabezado } from './markdown.ts'

const REPOSITORIO = 'https://github.com/JoansebHM/KRAPI'

interface Seccion {
  archivo: string
  id: string
  titulo: string
  grupo: string
  /** Texto de la tarjeta en la página de inicio. */
  resumen?: string
}

interface Pagina extends Seccion {
  html: string
  encabezados: Encabezado[]
}

const SECCIONES: Seccion[] = [
  { archivo: 'docs/README.md', id: 'inicio', titulo: 'Inicio', grupo: 'Empezar' },
  {
    archivo: 'README.md',
    id: 'puesta-en-marcha',
    titulo: 'Puesta en marcha',
    grupo: 'Empezar',
    resumen: 'Cómo correr la app, la base de datos, la sesión y los comandos.',
  },
  {
    archivo: 'docs/producto.md',
    id: 'producto',
    titulo: 'Producto',
    grupo: 'El proyecto',
    resumen: 'Para qué existe KIRA, quién la usa, conceptos y cómo se usa en campo.',
  },
  {
    archivo: 'docs/modelo-de-datos.md',
    id: 'modelo-de-datos',
    titulo: 'Modelo de datos',
    grupo: 'El proyecto',
    resumen: 'Tablas, reglas, funciones, archivos y seguridad en Supabase.',
  },
  {
    archivo: 'docs/arquitectura.md',
    id: 'arquitectura',
    titulo: 'Arquitectura',
    grupo: 'El proyecto',
    resumen: 'Stack, carpetas y patrones de código para reutilizar.',
  },
  {
    archivo: 'docs/diseno.md',
    id: 'diseno',
    titulo: 'Diseño',
    grupo: 'El proyecto',
    resumen: 'Colores, tipografía, modo oscuro y reglas para celular.',
  },
  {
    archivo: 'CONTRIBUTING.md',
    id: 'contribuir',
    titulo: 'Cómo contribuir',
    grupo: 'Equipo',
    resumen: 'Issues, ramas, commits y pull requests.',
  },
  {
    archivo: 'CLAUDE.md',
    id: 'asistentes',
    titulo: 'Guía para asistentes',
    grupo: 'Equipo',
    resumen: 'Resumen para asistentes de código: reglas y trampas conocidas.',
  },
  {
    archivo: 'docs/decisiones/README.md',
    id: 'decisiones',
    titulo: 'Todas las decisiones',
    grupo: 'Decisiones',
    resumen: 'Por qué se decidió cada cosa y qué se descartó.',
  },
]

const ICONOS: Record<string, string> = {
  Empezar: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  'El proyecto': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  Equipo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  Decisiones: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
}

function icono(grupo: string): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS[grupo] ?? ''}</svg>`
}

function seccionesDecisiones(raiz: string): Seccion[] {
  return readdirSync(path.join(raiz, 'docs/decisiones'))
    .filter((nombre) => /^\d{4}-.*\.md$/.test(nombre))
    .sort()
    .map((nombre) => ({
      archivo: `docs/decisiones/${nombre}`,
      id: `decision-${nombre.slice(0, 4)}`,
      titulo: '',
      grupo: 'Decisiones',
    }))
}

/** Traduce un enlace relativo entre .md a la página de la documentación, o a GitHub si no es una página. */
function resolverEnlace(href: string, origen: Seccion, porArchivo: Map<string, Seccion>): string {
  if (/^[a-z]+:/i.test(href)) return href
  if (href.startsWith('#')) return `#/${origen.id}/${href.slice(1)}`

  const [ruta, ancla] = href.split('#')
  const destino = path.posix.normalize(path.posix.join(path.posix.dirname(origen.archivo), ruta))
  const pagina = porArchivo.get(destino.endsWith('/') ? `${destino}README.md` : destino)
  if (pagina) return `#/${pagina.id}${ancla ? `/${ancla}` : ''}`
  return `${REPOSITORIO}/${destino.endsWith('/') ? 'tree' : 'blob'}/main/${destino}`
}

/**
 * Incrusta un diagrama SVG del repositorio (docs/diagramas) para que funcione sin internet y siga el tema.
 * El SVG conserva su ancho mínimo y, si no cabe, se desplaza dentro de su propio contenedor.
 */
function diagrama(raiz: string, href: string, alt: string, origen: Seccion): string {
  const ruta = path.posix.normalize(path.posix.join(path.posix.dirname(origen.archivo), href))
  if (!ruta.endsWith('.svg')) return `<p><img src="${escapar(href)}" alt="${escapar(alt)}" /></p>`

  const svg = readFileSync(path.join(raiz, ruta), 'utf8').replace(/<\?xml[^>]*>\s*/, '').trim()
  const ancho = svg.match(/viewBox="0 0 (\d+)/)?.[1]
  const conAncho = ancho ? svg.replace('<svg ', `<svg style="min-width: ${ancho}px" `) : svg
  return `<figure class="diagrama"><div class="diagrama-scroll">${conAncho}</div></figure>`
}

function navegacion(paginas: Pagina[]): string {
  const grupos = new Map<string, Pagina[]>()
  for (const p of paginas) grupos.set(p.grupo, [...(grupos.get(p.grupo) ?? []), p])

  return [...grupos]
    .map(([grupo, lista]) => {
      const enlaces = lista
        .map((p) => {
          const numero = p.id.startsWith('decision-') ? `<span class="nav-numero">${p.id.slice(-4)}</span>` : ''
          return `<li><a href="#/${p.id}" data-pagina="${p.id}">${numero}<span>${escapar(p.titulo)}</span></a></li>`
        })
        .join('')
      return `<details class="nav-grupo" open><summary>${icono(grupo)}<span>${grupo}</span></summary><ul>${enlaces}</ul></details>`
    })
    .join('\n')
}

function tarjetasInicio(paginas: Pagina[]): string {
  const tarjetas = paginas
    .filter((p) => p.resumen)
    .map(
      (p) =>
        `<a class="tarjeta" href="#/${p.id}">${icono(p.grupo)}<strong>${escapar(p.titulo)}</strong><span>${escapar(p.resumen!)}</span></a>`,
    )
    .join('')
  return `<div class="tarjetas">${tarjetas}</div>`
}

function articulo(pagina: Pagina, paginas: Pagina[], indice: number): string {
  let cuerpo = pagina.html

  if (pagina.id === 'inicio') {
    // El inicio se presenta con una portada y tarjetas en lugar del título del .md.
    cuerpo = cuerpo.replace(/<h1>.*?<\/h1>/, '')
    cuerpo = `<header class="portada"><p class="antetitulo">Kratos Innovation Lab · EAFIT</p><h1>Documentación de KIRA</h1><p>Geovisor del barrio Manila (El Poblado, Medellín) para registrar los lugares visitados en el estudio de proximidad y el histórico de visitas de cada uno.</p></header>${tarjetasInicio(paginas)}${cuerpo}`
  } else {
    cuerpo = cuerpo.replace(/<h1>/, `<p class="antetitulo">${escapar(pagina.grupo)}</p><h1>`)
  }
  // En las decisiones, la línea "Estado: aceptada · fecha" se muestra como etiqueta.
  cuerpo = cuerpo.replace(/<p><strong>Estado:<\/strong>/, '<p class="estado"><strong>Estado:</strong>')
  // En pantallas angostas, el índice de la página va justo debajo del título.
  cuerpo = cuerpo.replace('</h1>', '</h1>\n<details class="toc-movil"><summary>En esta página</summary><nav></nav></details>')

  const anterior = paginas[indice - 1]
  const siguiente = paginas[indice + 1]
  const paso = (p: Pagina | undefined, clase: string, etiqueta: string) =>
    p ? `<a class="paso ${clase}" href="#/${p.id}"><span>${etiqueta}</span><strong>${escapar(p.titulo)}</strong></a>` : '<span></span>'

  return `<article id="pagina-${pagina.id}" data-titulo="${escapar(pagina.titulo)}" hidden>
${cuerpo}
<footer class="pie-pagina">
  <p>Fuente: <code>${pagina.archivo}</code> · <a href="${REPOSITORIO}/blob/main/${pagina.archivo}" target="_blank" rel="noopener noreferrer">Ver en GitHub</a></p>
  <nav class="pasos" aria-label="Páginas vecinas">${paso(anterior, 'anterior', 'Anterior')}${paso(siguiente, 'siguiente', 'Siguiente')}</nav>
</footer>
</article>`
}

export function generarDocs(raiz: string): string {
  const secciones = [...SECCIONES, ...seccionesDecisiones(raiz)]
  const porArchivo = new Map(secciones.map((s) => [s.archivo, s]))

  const paginas: Pagina[] = secciones.map((seccion) => {
    const markdown = readFileSync(path.join(raiz, seccion.archivo), 'utf8')
    const documento = convertir(markdown, {
      prefijo: seccion.id,
      repositorio: REPOSITORIO,
      enlace: (href) => resolverEnlace(href, seccion, porArchivo),
      imagen: (href, alt) => diagrama(raiz, href, alt, seccion),
    })
    const titulo = seccion.titulo || documento.titulo.replace(/^\d{4}\s*·\s*/, '')
    return { ...seccion, titulo, html: documento.html, encabezados: documento.encabezados }
  })

  const plantilla = readFileSync(path.join(raiz, 'scripts/docs/plantilla.html'), 'utf8')
  return plantilla
    .replace('{{navegacion}}', () => navegacion(paginas))
    .replace('{{paginas}}', () => paginas.map((p, i) => articulo(p, paginas, i)).join('\n'))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raiz = fileURLToPath(new URL('../..', import.meta.url))
  const destino = path.join(raiz, 'dist/docs/index.html')
  mkdirSync(path.dirname(destino), { recursive: true })
  writeFileSync(destino, generarDocs(raiz))
  console.log(`Documentación generada en ${path.relative(raiz, destino)}`)
}
