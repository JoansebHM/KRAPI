import { expect, test } from './soporte/fixtures'

const boton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /en línea\. Ver quiénes son/ })

/** Simula que la pestaña se oculta o vuelve a verse. */
const poner = (page: import('@playwright/test').Page, visibilidad: 'hidden' | 'visible') =>
  page.evaluate((estado) => {
    Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, visibilidad)

test.describe('Usuarios en línea', () => {
  test('se anuncia al abrir la app y, si está sola, no muestra nada en la barra', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    await expect.poll(() => supabase.enLinea()).toEqual(['admin'])
    await expect(boton(page)).toBeHidden()
  })

  test('muestra el avatar de otra persona en línea y al tocarlo dice quiénes son', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    supabase.entraEnLinea('ana')

    await expect(boton(page)).toHaveAccessibleName('1 persona más en línea. Ver quiénes son')
    await expect(page.locator('.app-header .en-linea-avatar')).toHaveCount(1)
    await boton(page).click()

    const modal = page.getByRole('dialog', { name: 'En línea ahora' })
    await expect(modal).toContainText('2 personas tienen KIRA abierta ahora.')
    // Yo primero, con "Tú"; luego los demás, con su usuario y su rol.
    const filas = modal.getByRole('listitem')
    await expect(filas).toHaveCount(2)
    await expect(filas.nth(0)).toContainText('Admin Kratos')
    await expect(filas.nth(0)).toContainText('admin - admin')
    await expect(filas.nth(0)).toContainText('Tú')
    await expect(filas.nth(1)).toContainText('Ana Gómez')
    await expect(filas.nth(1)).toContainText('ana')
    await expect(filas.nth(1)).not.toContainText('Tú')

    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await expect(modal).toBeHidden()
  })

  test('cuando alguien abre o cierra la app, la barra se actualiza sola', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    supabase.entraEnLinea('ana')
    await expect(boton(page)).toBeVisible()
    supabase.saleDeLinea('ana')
    await expect(boton(page)).toBeHidden()
  })

  test('varias pestañas de la misma cuenta cuentan como una sola persona', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    supabase.entraEnLinea('ana')
    supabase.entraEnLinea('ana')
    await expect(boton(page)).toHaveAccessibleName('1 persona más en línea. Ver quiénes son')
  })

  test('en celular caben 2 avatares y el resto va en "+N"', async ({ page, supabase, entrar }) => {
    for (const nombre of ['bruno', 'carla', 'diego']) supabase.agregarCuenta({ usuario: nombre, nombre: nombre.toUpperCase() })
    await entrar('admin')
    for (const usuario of ['ana', 'bruno', 'carla', 'diego']) supabase.entraEnLinea(usuario)

    await expect(boton(page)).toHaveAccessibleName('4 personas más en línea. Ver quiénes son')
    await expect(page.locator('.app-header .en-linea-avatar')).toHaveCount(2)
    await expect(page.locator('.app-header .en-linea-mas')).toHaveText('+2')
    await boton(page).click()
    await expect(page.getByRole('dialog', { name: 'En línea ahora' }).getByRole('listitem')).toHaveCount(5)
  })

  test('en computador caben 4 avatares', async ({ page, supabase, entrar }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const nombre of ['bruno', 'carla', 'diego', 'elena']) supabase.agregarCuenta({ usuario: nombre, nombre: nombre.toUpperCase() })
    await entrar('admin')
    for (const usuario of ['ana', 'bruno', 'carla', 'diego', 'elena']) supabase.entraEnLinea(usuario)

    await expect(page.locator('.app-header .en-linea-avatar')).toHaveCount(4)
    await expect(page.locator('.app-header .en-linea-mas')).toHaveText('+1')
  })

  test('en 320 px cabe un avatar y la barra no se desborda', async ({ page, supabase, entrar }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    supabase.agregarCuenta({ usuario: 'bruno', nombre: 'Bruno' })
    await entrar('admin')
    supabase.entraEnLinea('ana')
    supabase.entraEnLinea('bruno')

    await expect(page.locator('.app-header .en-linea-avatar')).toHaveCount(1)
    await expect(page.locator('.app-header .en-linea-mas')).toHaveText('+1')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // Área de toque de 44 px o más.
    const caja = await boton(page).boundingBox()
    expect(caja?.height).toBeGreaterThanOrEqual(44)
    expect(caja?.width).toBeGreaterThanOrEqual(44)
  })

  test('con la app oculta más de un minuto deja de figurar en línea, y al volver reaparece', async ({ page, entrar, supabase }) => {
    await page.clock.install()
    await entrar('admin')
    await expect.poll(() => supabase.enLinea()).toEqual(['admin'])

    await poner(page, 'hidden')
    // Antes de un minuto sigue en línea (un cambio rápido de app no lo saca).
    await page.clock.fastForward(30_000)
    expect(supabase.enLinea()).toEqual(['admin'])
    await page.clock.fastForward(31_000)
    await expect.poll(() => supabase.enLinea()).toEqual([])

    await poner(page, 'visible')
    await expect.poll(() => supabase.enLinea()).toEqual(['admin'])
  })

  test('volver a la app antes del minuto cancela la salida', async ({ page, entrar, supabase }) => {
    await page.clock.install()
    await entrar('admin')
    await expect.poll(() => supabase.enLinea()).toEqual(['admin'])

    await poner(page, 'hidden')
    await page.clock.fastForward(40_000)
    await poner(page, 'visible')
    await page.clock.fastForward(60_000)
    expect(supabase.enLinea()).toEqual(['admin'])
  })

  test('una cuenta pendiente no entra al canal ni ve a nadie', async ({ page, entrar, supabase }) => {
    supabase.entraEnLinea('ana')
    await entrar('pendiente')
    await expect(page.getByRole('heading', { name: 'Tu cuenta está esperando aprobación' })).toBeVisible()
    await expect(boton(page)).toBeHidden()
    expect(supabase.enLinea()).toEqual(['ana'])
  })
})
