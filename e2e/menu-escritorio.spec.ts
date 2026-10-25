import type { Page } from '@playwright/test'
import { expect, test } from './soporte/fixtures'

const menu = (page: Page) => page.getByRole('navigation', { name: 'Secciones' })
const panel = (page: Page, titulo: string) => page.getByRole('heading', { level: 1, name: titulo })

/** Un punto del mapa que queda a la izquierda del panel y lejos de los lugares. */
async function tocarMapa(page: Page) {
  await page.locator('.maplibregl-canvas').click({ position: { x: 120, y: 500 } })
}

test.describe('Menú lateral en computador', () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false })

  test.beforeEach(async ({ supabase, entrar }) => {
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: null, estado: 'activa', geom: { type: 'Point', coordinates: [-75.57402, 6.21293] } })
    await entrar('admin')
  })

  test('está siempre visible y una sección se abre a la derecha sin cerrarlo', async ({ page }) => {
    await expect(menu(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ocultar menú' })).toHaveAttribute('aria-expanded', 'true')

    await menu(page).getByRole('link', { name: 'Categorías' }).click()
    await expect(panel(page, 'Categorías')).toBeVisible()
    await expect(menu(page)).toBeVisible()

    // Elegir otra sección cambia el panel; el menú sigue ahí.
    await menu(page).getByRole('link', { name: 'Responsables' }).click()
    await expect(panel(page, 'Responsables')).toBeVisible()
    await expect(menu(page)).toBeVisible()

    // Tocar el panel no cierra nada.
    await panel(page, 'Responsables').click()
    await expect(menu(page)).toBeVisible()
    await expect(page).toHaveURL(/\/responsables$/)

    // El panel queda a la derecha del menú.
    const cajaMenu = await menu(page).boundingBox()
    const cajaPanel = await page.locator('.panel').boundingBox()
    expect(cajaPanel!.x).toBeGreaterThan(cajaMenu!.x + cajaMenu!.width)
  })

  test('tocar el mapa cierra el panel, pero arrastrarlo no', async ({ page }) => {
    await page.goto('/categorias')
    await expect(panel(page, 'Categorías')).toBeVisible()

    const canvas = page.locator('.maplibregl-canvas')
    const caja = (await canvas.boundingBox())!
    await page.mouse.move(caja.x + 150, caja.y + 450)
    await page.mouse.down()
    await page.mouse.move(caja.x + 300, caja.y + 350, { steps: 8 })
    await page.mouse.up()
    await expect(panel(page, 'Categorías')).toBeVisible()

    await tocarMapa(page)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('.panel')).toHaveCount(0)
    await expect(menu(page)).toBeVisible()
  })

  test('tocar un lugar con un panel abierto abre su ficha', async ({ page }) => {
    await page.goto('/categorias')
    await page.getByRole('button', { name: 'Café Central (Sin categoría)' }).click()
    await expect(page).toHaveURL(/\/lugares\/p1$/)
    await expect(page.getByRole('region', { name: 'Café Central' })).toBeVisible()
  })

  test('se puede ocultar y la preferencia se recuerda', async ({ page }) => {
    await page.getByRole('button', { name: 'Ocultar menú' }).click()
    await expect(menu(page)).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.app-header')).toBeVisible()
    await expect(menu(page)).toHaveCount(0)

    await page.getByRole('button', { name: 'Mostrar menú' }).click()
    await expect(menu(page)).toBeVisible()
  })
})

test.describe('Menú lateral en celular', () => {
  test('sigue abriéndose encima con ☰ y se cierra al elegir una sección', async ({ page, entrar }) => {
    await entrar('admin')
    await expect(menu(page)).toBeHidden()
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await expect(menu(page)).toBeVisible()
    await menu(page).getByRole('link', { name: 'Categorías' }).click()
    await expect(panel(page, 'Categorías')).toBeVisible()
    await expect(menu(page)).toBeHidden()
  })
})
