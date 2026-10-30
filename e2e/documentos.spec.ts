import { readFileSync } from 'node:fs'
import { expect, test } from './soporte/fixtures'

const PDF = readFileSync(new URL('./soporte/archivos/informe.pdf', import.meta.url))
const DOCX = readFileSync(new URL('./soporte/archivos/informe.docx', import.meta.url))
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

test.describe('Previsualizar documentos', () => {
  test.beforeEach(async ({ page, supabase }) => {
    await page.clock.setFixedTime(new Date('2026-10-30T14:05:00-05:00'))
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: 'c1', estado: 'activa', geom: { type: 'Point', coordinates: [-75.576, 6.214] } })
    supabase.db.estudios.push({ id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', entrevistado: null, archivado_en: null })
    const documento = (id: string, nombre: string, mime: string, bytes: number) => ({
      id,
      estudio_id: 'e1',
      tipo: 'documento',
      titulo: null,
      archivo_path: `e1/${nombre}`,
      archivo_nombre: nombre,
      archivo_mime: mime,
      archivo_bytes: bytes,
      proveedor: 'supabase',
      created_at: '2026-10-20T10:00:00Z',
    })
    supabase.db.evidencias.push(
      documento('d1', 'informe.pdf', 'application/pdf', PDF.length),
      documento('d2', 'acta.docx', MIME_DOCX, DOCX.length),
      documento('d3', 'datos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 10),
    )
    supabase.archivos.set('e1/informe.pdf', { tipo: 'application/pdf', bytes: PDF.length, contenido: PDF })
    supabase.archivos.set('e1/acta.docx', { tipo: MIME_DOCX, bytes: DOCX.length, contenido: DOCX })
    supabase.archivos.set('e1/datos.xlsx', { tipo: 'application/octet-stream', bytes: 10 })
  })

  async function abrirEstudio(page: import('@playwright/test').Page) {
    await page.goto('/lugares/p1')
    await page.getByRole('region', { name: /Estudios/ }).getByRole('button', { name: /20 oct 2026/ }).click()
    return page.getByRole('dialog', { name: /20 oct 2026/ })
  }

  test('un PDF se dibuja dentro de la app, se puede acercar y se cierra con Escape', async ({ page, entrar }) => {
    await entrar()
    const presentacion = await abrirEstudio(page)
    await presentacion.getByRole('button', { name: 'Ver documento' }).first().click()

    const visor = page.locator('.pantalla-completa')
    await expect(visor).toBeVisible()
    const pagina = visor.getByRole('img', { name: 'Página 1 de 1' })
    await expect(pagina).toBeVisible()
    // El canvas se dibujó: tiene tamaño y no es todo blanco.
    await expect
      .poll(() =>
        pagina.evaluate((lienzo: HTMLCanvasElement) => {
          const datos = lienzo.getContext('2d')!.getImageData(0, 0, lienzo.width, lienzo.height).data
          return datos.some((valor, i) => i % 4 !== 3 && valor < 200)
        }),
      )
      .toBe(true)

    const ancho = (await visor.locator('.visor-pdf-paginas').boundingBox())!.width
    await visor.getByRole('button', { name: 'Acercar' }).click()
    await expect.poll(async () => (await visor.locator('.visor-pdf-paginas').boundingBox())!.width).toBeGreaterThan(ancho)
    await expect(visor.getByRole('link', { name: 'Descargar documento' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(visor).toBeHidden()
    await expect(presentacion).toBeVisible()
  })

  test('un Word (.docx) se muestra como texto, con aviso de vista aproximada', async ({ page, entrar }) => {
    await entrar()
    const presentacion = await abrirEstudio(page)
    await presentacion.getByRole('button', { name: 'Ver documento' }).nth(1).click()

    const visor = page.locator('.pantalla-completa')
    await expect(visor.getByRole('heading', { name: 'Acta de la visita' })).toBeVisible()
    await expect(visor).toContainText('El local abre a las seis de la mañana.')
    await expect(visor).toContainText('Vista aproximada')
  })

  test('solo se ofrece "Ver" para PDF y .docx; los demás documentos se descargan', async ({ page, entrar }) => {
    await entrar()
    const presentacion = await abrirEstudio(page)
    await expect(presentacion.getByRole('button', { name: 'Ver documento' })).toHaveCount(2)
    await expect(presentacion.getByRole('button', { name: 'Acciones de «datos.xlsx»' })).toBeVisible()
  })

  test('si el archivo no se puede abrir, avisa y deja descargar', async ({ page, entrar }) => {
    await page.route('**/object/sign/evidencias/e1/informe.pdf*', (ruta) => ruta.fulfill({ status: 500, body: '' }))
    await entrar()
    const presentacion = await abrirEstudio(page)
    await presentacion.getByRole('button', { name: 'Ver documento' }).first().click()
    await expect(page.locator('.pantalla-completa').getByRole('alert')).toContainText('No se pudo abrir este documento')
  })

  test('la página del estudio ofrece "Ver" con el ícono junto a Borrar', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/lugares/p1/estudios/e1')
    await page.getByRole('button', { name: 'Ver «informe.pdf»' }).click()
    await expect(page.locator('.pantalla-completa').getByRole('img', { name: 'Página 1 de 1' })).toBeVisible()
  })
})
