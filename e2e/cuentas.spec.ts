import { expect, test } from './soporte/fixtures'

const punto = (lng: number, lat: number) => ({ type: 'Point', coordinates: [lng, lat] })

test.describe('Permisos según la cuenta', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: null, estado: 'activa', geom: punto(-75.576, 6.214) })
  })

  test('un miembro activo ve los lugares', async ({ page, entrar }) => {
    await entrar('miembro')
    await expect(page.getByRole('button', { name: 'Café Central (Sin categoría)' })).toBeVisible()
  })

  test('una cuenta pendiente no recibe los lugares', async ({ page, entrar }) => {
    const lugares = page.waitForResponse((respuesta) => respuesta.url().includes('/rpc/lugares_mapa'))
    await entrar('pendiente')
    expect(await (await lugares).json()).toEqual([])
    await expect(page.getByRole('button', { name: /Café Central/ })).toHaveCount(0)
  })

  test('lo que crea una cuenta queda a su nombre', async ({ page, entrar, supabase }) => {
    await entrar('miembro')
    await page.goto('/categorias')
    await page.getByRole('button', { name: 'Crear la primera' }).click()
    await page.getByPlaceholder('Ej.: Café, Hotelería, Comercio').fill('Panadería')
    await page.getByRole('button', { name: 'Crear categoría' }).click()
    await expect.poll(() => supabase.db.categorias[0]?.creado_por).toBe(supabase.cuenta('ana').id)
  })
})
