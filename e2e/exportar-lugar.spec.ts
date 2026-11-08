import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { unzipSync } from 'fflate'
import { expect, test, toast } from './soporte/fixtures'

const exportar = (page: Page) => page.getByRole('button', { name: /^(Exportar lugar|Buscando|Armando)/ })

/** Descarga el ZIP del lugar y devuelve sus archivos y el nombre con que se guardó. */
async function descargar(page: Page) {
  const bajada = page.waitForEvent('download')
  await exportar(page).click()
  const descarga = await bajada
  const entradas = unzipSync(new Uint8Array(await readFile((await descarga.path())!)))
  return { entradas, nombre: descarga.suggestedFilename() }
}

const texto = (entradas: Record<string, Uint8Array>, ruta: string) => new TextDecoder().decode(entradas[ruta])

const evidencia = (id: string, estudio: string, tipo: string, nombre: string, extra: Record<string, unknown> = {}) => ({
  id,
  estudio_id: estudio,
  tipo,
  titulo: null,
  archivo_path: `${estudio}/${id}-${nombre}`,
  archivo_nombre: nombre,
  archivo_mime: 'application/octet-stream',
  archivo_bytes: 1500,
  proveedor: 'supabase',
  created_at: '2026-10-20T10:00:00Z',
  ...extra,
})

test.describe('Exportar un lugar', () => {
  test.beforeEach(async ({ page, supabase }) => {
    // 30 de octubre de 2026, 2:05 p. m. en Medellín.
    await page.clock.setFixedTime(new Date('2026-10-30T14:05:00-05:00'))
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })
    supabase.db.ubicaciones.push({
      id: 'p1',
      tipo: 'punto',
      nombre: 'Café Central',
      categoria_id: 'c1',
      direccion: 'Calle 10 # 43',
      contacto_nombre: 'Doña Rosa',
      contacto_telefono: '3001234567',
      estado: 'activa',
      geom: { type: 'Point', coordinates: [-75.576, 6.214] },
    })
  })

  /** Dos estudios con evidencias de todos los tipos, y uno archivado que no debe salir. */
  function sembrar(supabase: Parameters<Parameters<typeof test>[2]>[0]['supabase']) {
    supabase.db.estudios.push(
      { id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', entrevistado: 'Tendero', notas: ['Abre a las 7.', 'Vende café y pan.'], archivado_en: null, creado_por: 'u-ana', created_at: '2026-10-20T15:00:00Z' },
      { id: 'e2', ubicacion_id: 'p1', fecha: '2026-10-22', hora_inicio: '15:00:00', hora_fin: '16:30:00', entrevistado: null, archivado_en: null },
      { id: 'e3', ubicacion_id: 'p1', fecha: '2026-10-21', hora_inicio: '08:00:00', hora_fin: '09:00:00', entrevistado: 'Archivado', archivado_en: '2026-10-21T20:00:00Z' },
    )
    supabase.db.estudio_participantes.push({ estudio_id: 'e1', usuario_id: 'u-ana' })
    supabase.db.evidencias.push(
      evidencia('f1', 'e1', 'foto', 'fachada.jpg'),
      evidencia('a1', 'e1', 'audio', 'entrevista.webm'),
      evidencia('d1', 'e1', 'documento', 'informe.pdf'),
      { id: 't1', estudio_id: 'e1', tipo: 'texto', titulo: 'Observación', texto: 'Entrada lateral.', url_externa: null, archivo_path: null, archivo_nombre: null, archivo_mime: null, archivo_bytes: null, proveedor: null, created_at: '2026-10-20T08:00:00Z' },
      { id: 'v1', estudio_id: 'e1', tipo: 'video', titulo: 'Recorrido', texto: null, url_externa: 'https://sharepoint.test/recorrido', archivo_path: null, archivo_nombre: null, archivo_mime: null, archivo_bytes: null, proveedor: 'sharepoint', created_at: '2026-10-20T07:00:00Z' },
      evidencia('f2', 'e2', 'foto', 'otra.jpg'),
      evidencia('f3', 'e3', 'foto', 'archivado.jpg'),
    )
    for (const ruta of ['e1/f1-fachada.jpg', 'e1/a1-entrevista.webm', 'e1/d1-informe.pdf', 'e2/f2-otra.jpg', 'e3/f3-archivado.jpg']) {
      supabase.archivos.set(ruta, { tipo: 'application/octet-stream', bytes: 1500 })
    }
  }

  test('baja un ZIP con una carpeta por estudio y, dentro, una por tipo', async ({ page, entrar, supabase }) => {
    sembrar(supabase)
    await entrar()
    await page.goto('/lugares/p1')
    await expect(page.getByText('2 estudios, en carpetas por estudio y tipo')).toBeVisible()

    const { entradas, nombre } = await descargar(page)
    expect(nombre).toBe('Café Central - exportación 2026-10-30.zip')
    // Las carpetas van en orden de fecha; la del estudio archivado no está; las vacías no se crean.
    expect(Object.keys(entradas).sort()).toEqual([
      'Café Central/2026-10-20 09.00 - Tendero/Audios/entrevista.webm',
      'Café Central/2026-10-20 09.00 - Tendero/Documentos/informe.pdf',
      'Café Central/2026-10-20 09.00 - Tendero/Fotos/fachada.jpg',
      'Café Central/2026-10-20 09.00 - Tendero/Resumen.txt',
      'Café Central/2026-10-20 09.00 - Tendero/Textos y enlaces.txt',
      'Café Central/2026-10-22 15.00/Fotos/otra.jpg',
      'Café Central/2026-10-22 15.00/Resumen.txt',
      'Café Central/Lugar.txt',
    ])
    await expect(toast(page, 'Lugar exportado')).toContainText('sube la carpeta a SharePoint')
  })

  test('Lugar.txt y Resumen.txt dicen qué es cada cosa', async ({ page, entrar, supabase }) => {
    sembrar(supabase)
    await entrar()
    await page.goto('/lugares/p1')
    const { entradas } = await descargar(page)

    const lugar = texto(entradas, 'Café Central/Lugar.txt')
    expect(lugar).toContain('CAFÉ CENTRAL')
    expect(lugar).toContain('Tipo: Punto')
    expect(lugar).toContain('Categoría: Café')
    expect(lugar).toContain('Estado: Activo')
    expect(lugar).toContain('Dirección: Calle 10 # 43')
    expect(lugar).toContain('Contacto: Doña Rosa')
    expect(lugar).toContain('Teléfono: 3001234567')
    expect(lugar).toContain('Estudios exportados: 2')
    expect(lugar).toContain('Exportado el 30 oct 2026 por Admin Kratos')

    const resumen = texto(entradas, 'Café Central/2026-10-20 09.00 - Tendero/Resumen.txt')
    expect(resumen).toContain('ESTUDIO DEL 20 OCT 2026')
    expect(resumen).toContain('Entrevistado: Tendero')
    expect(resumen).toContain('Participantes: Ana Gómez')
    expect(resumen).toMatch(/Hora: 9:00 a\. m\. – 10:00 a\. m\./)
    expect(resumen).toContain('Registrado por: Ana Gómez, el 20 oct 2026')
    expect(resumen).toContain('1. Abre a las 7.')
    expect(resumen).toContain('2. Vende café y pan.')
    expect(resumen).toContain('Evidencias: 1 foto, 1 audio, 1 documento, 1 texto, 1 video')
    const sinEntrevistado = texto(entradas, 'Café Central/2026-10-22 15.00/Resumen.txt')
    expect(sinEntrevistado).not.toContain('Entrevistado')
    expect(sinEntrevistado).toContain('Evidencias: 1 foto')

    const enlaces = texto(entradas, 'Café Central/2026-10-20 09.00 - Tendero/Textos y enlaces.txt')
    expect(enlaces).toContain('Entrada lateral.')
    expect(enlaces).toContain('https://sharepoint.test/recorrido')
  })

  test('limpia los nombres y numera los repetidos', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones[0].nombre = 'Café "El Sol": bar/2.'
    supabase.db.estudios.push(
      { id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', entrevistado: 'Ana/Luis: "dueños"', archivado_en: null },
      { id: 'e2', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', entrevistado: 'Ana/Luis: "dueños"', archivado_en: null },
    )
    supabase.db.evidencias.push(
      // La ruta en Storage siempre está saneada; el nombre original del archivo es el que puede traer caracteres raros.
      evidencia('f1', 'e1', 'foto', 'foto?.jpg', { archivo_path: 'e1/f1.jpg', created_at: '2026-10-20T10:00:00Z' }),
      evidencia('f2', 'e1', 'foto', 'foto?.jpg', { archivo_path: 'e1/f2.jpg', created_at: '2026-10-20T11:00:00Z' }),
      evidencia('f3', 'e1', 'foto', `${'larguísimo '.repeat(20)}.jpg`, { archivo_path: 'e1/f3.jpg' }),
    )
    for (const ruta of ['e1/f1.jpg', 'e1/f2.jpg', 'e1/f3.jpg']) supabase.archivos.set(ruta, { tipo: 'image/jpeg', bytes: 1500 })

    await entrar()
    await page.goto('/lugares/p1')
    const { entradas } = await descargar(page)
    const rutas = Object.keys(entradas).sort()

    // Sin caracteres prohibidos ni punto al final, con una sola carpeta raíz.
    const raiz = 'Café -El Sol-- bar-2'
    expect(rutas.every((ruta) => ruta.startsWith(`${raiz}/`))).toBe(true)
    expect(rutas.flatMap((ruta) => ruta.split('/')).every((parte) => !/[\\:*?"<>|]/.test(parte) && !/[. ]$/.test(parte))).toBe(true)
    // Dos estudios con el mismo nombre de carpeta: el segundo lleva "(2)".
    const carpetas = [...new Set(rutas.map((ruta) => ruta.split('/')[1]).filter((parte) => parte !== 'Lugar.txt'))]
    expect(carpetas.sort()).toEqual(['2026-10-20 09.00 - Ana-Luis- -dueños-', '2026-10-20 09.00 - Ana-Luis- -dueños- (2)'].sort())
    // Dos fotos con el mismo nombre en un estudio: la segunda lleva "(2)".
    const fotos = rutas.filter((ruta) => ruta.includes('/Fotos/')).map((ruta) => ruta.split('/').pop())
    expect(fotos).toContain('foto-.jpg')
    expect(fotos).toContain('foto- (2).jpg')
    // Un nombre larguísimo se recorta (sin perder la extensión) para no pasarse del largo de ruta de SharePoint.
    const largo = fotos.find((nombre) => nombre!.startsWith('larguísimo'))!
    expect(largo.length).toBeLessThanOrEqual(80)
    expect(largo.endsWith('.jpg')).toBe(true)
    expect(Math.max(...rutas.map((ruta) => ruta.length))).toBeLessThan(220)
  })

  test('si un archivo no se puede bajar, exporta el resto y dice cuál faltó', async ({ page, entrar, supabase }) => {
    sembrar(supabase)
    supabase.archivos.delete('e1/f1-fachada.jpg')
    await entrar()
    await page.goto('/lugares/p1')
    const { entradas } = await descargar(page)

    expect(Object.keys(entradas)).not.toContain('Café Central/2026-10-20 09.00 - Tendero/Fotos/fachada.jpg')
    expect(Object.keys(entradas)).toContain('Café Central/2026-10-20 09.00 - Tendero/Audios/entrevista.webm')
    await expect(toast(page, 'Exportado, pero faltan archivos')).toContainText('fachada.jpg')
  })

  test('muestra el avance mientras arma el ZIP y deja el botón deshabilitado', async ({ page, entrar, supabase }) => {
    sembrar(supabase)
    // Los archivos tardan en llegar: se alcanza a ver el avance.
    await page.route('**/storage/v1/object/sign/**', async (ruta) => {
      await new Promise((resolver) => setTimeout(resolver, 600))
      await ruta.fallback()
    })
    await entrar()
    await page.goto('/lugares/p1')
    const bajada = page.waitForEvent('download')
    await exportar(page).click()
    await expect(page.getByRole('button', { name: /^Armando el ZIP… \d+ de 4$/ })).toBeDisabled()
    await bajada
    await expect(page.getByRole('button', { name: 'Exportar lugar (.zip)' })).toBeEnabled()
  })

  test('si pesa mucho pide confirmar, y si pesa demasiado no lo intenta', async ({ page, entrar, supabase }) => {
    sembrar(supabase)
    const MB = 1024 * 1024
    // Los archivos reales son pequeños; lo que cuenta para el aviso es el peso que dice la base de datos.
    const fotos = supabase.db.evidencias.filter((fila) => fila.tipo === 'foto')
    fotos.forEach((fila) => (fila.archivo_bytes = 120 * MB))
    await entrar()
    await page.goto('/lugares/p1')

    // Las 2 fotos de los estudios visibles (la del archivado no cuenta) pesan 240 MB: pide confirmar. Cancelar no baja nada.
    await exportar(page).click()
    const aviso = page.getByRole('dialog', { name: /^Pesa unos 240/ })
    await expect(aviso).toBeVisible()
    await aviso.getByRole('button', { name: 'Cancelar' }).click()
    await expect(aviso).toBeHidden()
    await expect(exportar(page)).toBeEnabled()

    const bajada = page.waitForEvent('download')
    await exportar(page).click()
    await page.getByRole('dialog', { name: /^Pesa unos 240/ }).getByRole('button', { name: 'Exportar de todos modos' }).click()
    await bajada
    await expect(toast(page, 'Lugar exportado')).toBeVisible()

    // Más de 800 MB: no se intenta, y explica qué hacer.
    fotos.forEach((fila) => (fila.archivo_bytes = 450 * MB))
    await exportar(page).click()
    await expect(toast(page, 'Pesa demasiado para exportarlo de una vez')).toContainText('Descarga cada estudio por separado')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('una zona exporta sus recorridos, sin "Entrevistado"', async ({ page, entrar, supabase }) => {
    supabase.db.tipos_zona.push({ id: 'tz1', nombre: 'Comercial', color: '#0478fb' })
    supabase.db.ubicaciones.push({
      id: 'z1',
      tipo: 'zona',
      nombre: 'Manzana 4',
      tipo_zona_id: 'tz1',
      estado: 'activa',
      geom: { type: 'Polygon', coordinates: [[[-75.576, 6.214], [-75.575, 6.214], [-75.575, 6.215], [-75.576, 6.214]]] },
    })
    supabase.db.estudios.push({ id: 'ez', ubicacion_id: 'z1', fecha: '2026-10-25', hora_inicio: '10:00:00', hora_fin: '11:00:00', entrevistado: 'No debería salir', archivado_en: null })
    await entrar()
    await page.goto('/lugares/z1')
    const { entradas } = await descargar(page)

    expect(Object.keys(entradas).sort()).toEqual(['Manzana 4/2026-10-25 10.00/Resumen.txt', 'Manzana 4/Lugar.txt'])
    expect(texto(entradas, 'Manzana 4/Lugar.txt')).toContain('Tipo de zona: Comercial')
    expect(texto(entradas, 'Manzana 4/2026-10-25 10.00/Resumen.txt')).not.toContain('Entrevistado')
  })

  test('un lugar sin estudios no muestra el botón', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/lugares/p1')
    await expect(page.getByRole('region', { name: /Estudios/ })).toBeVisible()
    await expect(exportar(page)).toHaveCount(0)
  })

  test('cabe en 320 px', async ({ page, entrar, supabase }) => {
    sembrar(supabase)
    await page.setViewportSize({ width: 320, height: 640 })
    await entrar()
    await page.goto('/lugares/p1')
    await expect(exportar(page)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})
