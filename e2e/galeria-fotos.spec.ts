import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/fixtures'

// PNG de 1 × 1 px: el navegador lo carga de verdad, así que el loader se apaga.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64')

/** Desliza con el dedo (o el ratón) de un punto del elemento a otro, en horizontal. */
async function deslizar(page: Page, elemento: Locator, desdeX: number, haciaX: number) {
  const caja = (await elemento.boundingBox())!
  const y = caja.y + caja.height / 2
  await page.mouse.move(caja.x + desdeX * caja.width, y)
  await page.mouse.down()
  await page.mouse.move(caja.x + haciaX * caja.width, y + 4, { steps: 8 })
  await page.mouse.up()
}

test.describe('Galería de fotos', () => {
  test.beforeEach(async ({ page, supabase }) => {
    await page.clock.setFixedTime(new Date('2026-10-30T14:05:00-05:00'))
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })
    supabase.db.ubicaciones.push({
      id: 'p1',
      tipo: 'punto',
      nombre: 'Café Central',
      categoria_id: 'c1',
      estado: 'activa',
      geom: { type: 'Point', coordinates: [-75.576, 6.214] },
    })
    supabase.db.estudios.push({ id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', entrevistado: null, archivado_en: null })
    for (const [n, titulo] of [['1', 'Fachada'], ['2', 'Interior'], ['3', 'Barra']]) {
      supabase.db.evidencias.push({
        id: `foto${n}`,
        estudio_id: 'e1',
        tipo: 'foto',
        titulo,
        archivo_path: `e1/foto${n}.png`,
        archivo_nombre: `foto${n}.png`,
        archivo_mime: 'image/png',
        archivo_bytes: PNG.length,
        proveedor: 'supabase',
        // La más reciente va primero en el carrusel.
        created_at: `2026-10-20T10:0${n}:00Z`,
      })
      supabase.archivos.set(`e1/foto${n}.png`, { tipo: 'image/png', bytes: PNG.length, contenido: PNG })
    }
  })

  /** Abre el modal del estudio, que trae el carrusel de fotos. */
  async function abrirCarrusel(page: Page) {
    await page.goto('/lugares/p1')
    await page.getByRole('region', { name: /Estudios/ }).getByRole('button', { name: /20 oct 2026/ }).click()
    const presentacion = page.getByRole('dialog', { name: /20 oct 2026/ })
    await expect(presentacion.locator('.estudio-carrusel')).toBeVisible()
    return presentacion
  }

  test('se pasa de foto deslizando, en los dos sentidos y dando la vuelta', async ({ page, entrar }) => {
    await entrar()
    const contenedor = await abrirCarrusel(page)
    const carrusel = contenedor.locator('.estudio-carrusel')
    const imagen = carrusel.locator('.estudio-carrusel-imagen')
    const contador = carrusel.locator('.estudio-carrusel-controles span')

    await expect(contador).toContainText('1 de 3')
    await expect(imagen).toHaveCSS('touch-action', 'pan-y')

    await deslizar(page, imagen, 0.8, 0.2) // a la izquierda: siguiente
    await expect(contador).toContainText('2 de 3')
    await deslizar(page, imagen, 0.2, 0.8) // a la derecha: anterior
    await expect(contador).toContainText('1 de 3')
    await deslizar(page, imagen, 0.2, 0.8) // anterior desde la primera: da la vuelta
    await expect(contador).toContainText('3 de 3')
  })

  test('la foto nueva entra animada desde el lado hacia el que se pasó', async ({ page, entrar }) => {
    await entrar()
    const contenedor = await abrirCarrusel(page)
    const carrusel = contenedor.locator('.estudio-carrusel')
    const diapositiva = carrusel.locator('.estudio-diapositiva')

    await expect(diapositiva).not.toHaveClass(/estudio-diapositiva-(siguiente|anterior)/)
    await carrusel.getByRole('button', { name: 'Foto siguiente' }).click()
    await expect(diapositiva).toHaveClass(/estudio-diapositiva-siguiente/)
    await expect(diapositiva).toHaveCSS('animation-name', 'estudio-entra-siguiente')
    await carrusel.getByRole('button', { name: 'Foto anterior' }).click()
    await expect(diapositiva).toHaveClass(/estudio-diapositiva-anterior/)

    // Al ampliar, la foto aparece sin animación.
    await contenedor.getByRole('button', { name: 'Ampliar foto' }).click()
    await expect(page.locator('.pantalla-completa .estudio-diapositiva')).not.toHaveClass(/estudio-diapositiva-(siguiente|anterior)/)
  })

  test('un movimiento corto o vertical no cambia de foto', async ({ page, entrar }) => {
    await entrar()
    const contenedor = await abrirCarrusel(page)
    const carrusel = contenedor.locator('.estudio-carrusel')
    const imagen = carrusel.locator('.estudio-carrusel-imagen')
    const contador = carrusel.locator('.estudio-carrusel-controles span')

    await deslizar(page, imagen, 0.5, 0.45)
    const caja = (await imagen.boundingBox())!
    await page.mouse.move(caja.x + caja.width / 2, caja.y + 10)
    await page.mouse.down()
    await page.mouse.move(caja.x + caja.width / 2 - 50, caja.y + caja.height - 5, { steps: 8 })
    await page.mouse.up()
    await expect(contador).toContainText('1 de 3')
  })

  test('muestra un loader mientras la imagen carga y lo quita al terminar', async ({ page, entrar }) => {
    let soltar: () => void = () => {}
    const retenida = new Promise<void>((resolver) => (soltar = resolver))
    await page.route('**/object/sign/evidencias/e1/foto1.png*', async (ruta) => {
      await retenida
      await ruta.fulfill({ status: 200, contentType: 'image/png', body: PNG })
    })
    await entrar()
    const contenedor = await abrirCarrusel(page)
    const carrusel = contenedor.locator('.estudio-carrusel')

    await expect(carrusel.getByRole('status', { name: 'Cargando foto' })).toHaveCount(0)
    await carrusel.getByRole('button', { name: 'Foto anterior' }).click() // da la vuelta hasta la última (foto1), retenida
    await expect(carrusel.getByRole('status', { name: 'Cargando foto' })).toBeVisible()
    soltar()
    await expect(carrusel.getByRole('status', { name: 'Cargando foto' })).toHaveCount(0)
  })

  test('a pantalla completa se pasa con los botones, deslizando y con las flechas', async ({ page, entrar }) => {
    await entrar()
    const contenedor = await abrirCarrusel(page)
    await contenedor.getByRole('button', { name: 'Ampliar foto' }).click()

    const visor = page.locator('.pantalla-completa')
    await expect(visor).toBeVisible()
    const detalle = visor.locator('.pantalla-completa-detalle')
    await expect(detalle).toHaveText('1 de 3')

    await visor.getByRole('button', { name: 'Foto siguiente' }).click()
    await expect(detalle).toHaveText('2 de 3')
    await visor.getByRole('button', { name: 'Foto anterior' }).click()
    await expect(detalle).toHaveText('1 de 3')

    const area = visor.locator('.estudio-foto-visor')
    await deslizar(page, area, 0.8, 0.2)
    await expect(detalle).toHaveText('2 de 3')
    await deslizar(page, area, 0.2, 0.8)
    await expect(detalle).toHaveText('1 de 3')

    await page.keyboard.press('ArrowRight')
    await expect(detalle).toHaveText('2 de 3')
    await page.keyboard.press('ArrowLeft')
    await expect(detalle).toHaveText('1 de 3')

    // La foto de la que se sale del visor es la que quedó en el carrusel.
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Escape')
    await expect(visor).toBeHidden()
    await expect(contenedor.locator('.estudio-carrusel-controles span')).toContainText('2 de 3')
  })

  test('con una sola foto no hay botones de pasar en pantalla completa', async ({ page, entrar, supabase }) => {
    supabase.db.evidencias.splice(1)
    await entrar()
    const contenedor = await abrirCarrusel(page)
    await contenedor.getByRole('button', { name: 'Ampliar foto' }).click()
    const visor = page.locator('.pantalla-completa')
    await expect(visor).toBeVisible()
    await expect(visor.getByRole('button', { name: 'Foto siguiente' })).toHaveCount(0)
    await expect(visor.getByRole('button', { name: 'Foto anterior' })).toHaveCount(0)
  })
})
