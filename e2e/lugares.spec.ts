import { expect, test } from './soporte/fixtures'

// Centro aproximado de Manila: el mapa arranca encuadrando el barrio, así que queda en el centro de la pantalla.
const CENTRO = [-75.57402, 6.21293] as const
const punto = (lng: number, lat: number) => ({ type: 'Point', coordinates: [lng, lat] })

test.describe('Lugares en el mapa', () => {
  test.beforeEach(async ({ supabase, entrar }) => {
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })
    supabase.db.ubicaciones.push(
      { id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: 'c1', estado: 'activa', geom: punto(-75.576, 6.214) },
      { id: 'p2', tipo: 'punto', nombre: 'Lote de la esquina', categoria_id: null, estado: 'activa', geom: punto(-75.572, 6.212) },
      { id: 'p3', tipo: 'punto', nombre: 'Tienda vieja', categoria_id: 'c1', estado: 'cerrada', geom: punto(-75.575, 6.2115) },
      { id: 'p4', tipo: 'punto', nombre: 'Creado por error', categoria_id: null, estado: 'activa', archivada_en: '2026-10-20T00:00:00Z', geom: punto(-75.573, 6.213) },
      {
        id: 'z1',
        tipo: 'zona',
        nombre: 'Manzana del parque',
        estado: 'activa',
        geom: {
          type: 'Polygon',
          coordinates: [
            [
              [CENTRO[0] - 0.0006, CENTRO[1] - 0.0006],
              [CENTRO[0] + 0.0006, CENTRO[1] - 0.0006],
              [CENTRO[0] + 0.0006, CENTRO[1] + 0.0006],
              [CENTRO[0] - 0.0006, CENTRO[1] + 0.0006],
              [CENTRO[0] - 0.0006, CENTRO[1] - 0.0006],
            ],
          ],
        },
      },
    )
    await entrar()
  })

  test('los puntos se ven con su categoría, los cerrados atenuados y los archivados no aparecen', async ({ page }) => {
    const cafe = page.getByRole('button', { name: 'Café Central (Café)' })
    await expect(cafe).toBeVisible()
    await expect(cafe.locator('.icono-categoria')).toHaveCSS('background-color', 'rgb(158, 122, 225)')

    await expect(page.getByRole('button', { name: 'Lote de la esquina (Sin categoría)' })).toHaveClass(/marcador-sin-categoria/)
    await expect(page.getByRole('button', { name: 'Tienda vieja (Café, cerrado)' })).toHaveClass(/marcador-cerrado/)
    await expect(page.getByRole('button', { name: /Creado por error/ })).toHaveCount(0)
  })

  test('los marcadores tienen un área de toque de al menos 44 px', async ({ page }) => {
    const caja = await page.getByRole('button', { name: 'Café Central (Café)' }).boundingBox()
    expect(caja?.width).toBeGreaterThanOrEqual(44)
    expect(caja?.height).toBeGreaterThanOrEqual(44)
  })

  test('al tocar un punto se abre su ficha y "volver" regresa al mapa', async ({ page }) => {
    const cafe = page.getByRole('button', { name: 'Café Central (Café)' })
    await cafe.click()

    await expect(page).toHaveURL(/\/lugares\/p1$/)
    const ficha = page.getByRole('region', { name: 'Café Central' })
    await expect(ficha.locator('.ficha-categoria')).toHaveText('Café')
    await expect(ficha.getByText('Activo')).toBeVisible()
    await expect(cafe).toHaveAttribute('aria-pressed', 'true')

    await ficha.getByRole('link', { name: 'Volver al mapa' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(cafe).toHaveAttribute('aria-pressed', 'false')
  })

  test('al tocar una zona se abre su ficha, también después de cambiar de tema', async ({ page }) => {
    // Cambiar de tema recarga el mapa base: las zonas deben volver a dibujarse.
    await expect(page.getByRole('button', { name: 'Café Central (Café)' })).toBeVisible()
    await page.locator('.theme-toggle').click()

    // La zona está en el centro de la pantalla. Se reintenta hasta que el mapa termine de dibujarla.
    const mapa = await page.locator('.map-view').boundingBox()
    await expect(async () => {
      await page.mouse.click(mapa!.x + mapa!.width / 2, mapa!.y + mapa!.height / 2)
      await expect(page).toHaveURL(/\/lugares\/z1$/, { timeout: 500 })
    }).toPass()
    const ficha = page.getByRole('region', { name: 'Manzana del parque' })
    await expect(ficha.getByText('Zona', { exact: true }).first()).toBeVisible()
  })

  test('un enlace a un lugar archivado muestra su ficha y que no está en el mapa', async ({ page }) => {
    await page.goto('/lugares/p4')
    await expect(page.getByText('Este lugar está archivado: no aparece en el mapa.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Recuperar lugar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agregar estudio' })).toHaveCount(0)
  })

  test('un enlace a un lugar que no existe lo explica', async ({ page }) => {
    await page.goto('/lugares/no-existe')
    await expect(page.getByText('Este lugar no existe')).toBeVisible()
    await page.getByRole('link', { name: 'Volver al mapa' }).last().click()
    await expect(page).toHaveURL(/\/$/)
  })
})
