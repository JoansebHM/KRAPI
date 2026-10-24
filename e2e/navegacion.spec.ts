import { expect, test } from './soporte/fixtures'

test('la barra muestra la firma "powered by KIT"', async ({ page, entrar }) => {
  await entrar()
  const firma = page.locator('.app-header .powered')
  await expect(firma).toHaveText(/powered by\s*KIT/)
  await expect(firma).toHaveAttribute('aria-label', 'powered by Kratos Innovation Team')
})

test('el menú lleva a cada sección y "atrás" vuelve al mapa', async ({ page, entrar }) => {
  await entrar()
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  const menu = page.getByRole('navigation', { name: 'Secciones' })
  await expect(menu.getByRole('link')).toHaveText(['Mapa', 'Categorías', 'Responsables', 'Documentación'])

  await menu.getByRole('link', { name: 'Categorías' }).click()
  await expect(page).toHaveURL(/\/categorias$/)
  await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Categorías' })).toHaveCount(0)
})

test('el menú abre la documentación de KIRA', async ({ page, entrar }) => {
  await entrar()
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  const menu = page.getByRole('navigation', { name: 'Secciones' })
  await menu.getByRole('link', { name: 'Documentación' }).click()

  await expect(page).toHaveURL(/\/docs$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Documentación de KIRA' })).toBeVisible()
})

test('los formularios se abren por encima de la barra superior', async ({ page, entrar }) => {
  await entrar()
  await page.goto('/responsables')
  await page.getByRole('button', { name: 'Agregar el primero' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo responsable' })
  await expect(dialogo).toBeVisible()
  // El diálogo se dibuja en <body>, no dentro del panel, y nada lo tapa.
  expect(await page.evaluate(() => document.querySelector('.dialog-backdrop')?.parentElement === document.body)).toBe(true)
  const titulo = dialogo.getByRole('heading')
  const caja = await titulo.boundingBox()
  const encima = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.dialog') !== null, [caja!.x + 5, caja!.y + caja!.height / 2])
  expect(encima).toBe(true)
})
