import { expect, test } from './soporte/fixtures'

test('la barra muestra la firma "powered by KIT"', async ({ page, entrar }) => {
  await entrar()
  const firma = page.locator('.app-header .powered')
  await expect(firma).toHaveText(/powered by\s*KIT/)
  await expect(firma).toHaveAttribute('aria-label', 'powered by Kratos Innovation Team')
})

test('la sección de responsables ya no existe: lleva al mapa', async ({ page, entrar }) => {
  await entrar()
  await page.goto('/responsables')
  await expect(page).toHaveURL(/\/$/)
})

test('el menú lleva a cada sección y "atrás" vuelve al mapa', async ({ page, entrar }) => {
  // Un miembro ve las secciones de todos; "Usuarios" solo lo ven los admins (ver usuarios.spec.ts).
  await entrar('miembro')
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  const menu = page.getByRole('navigation', { name: 'Secciones' })
  await expect(menu.getByRole('link')).toHaveText(['Mapa', 'Categorías', 'Tipos de zona', 'Salidas', 'Mis asignaciones', 'Documentación'])

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
  await page.goto('/categorias')
  await page.getByRole('button', { name: 'Crear la primera' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nueva categoría' })
  await expect(dialogo).toBeVisible()
  // El diálogo se dibuja en <body>, no dentro del panel, y nada lo tapa.
  expect(await page.evaluate(() => document.querySelector('.dialog-backdrop')?.parentElement === document.body)).toBe(true)
  const titulo = dialogo.getByRole('heading')
  const caja = await titulo.boundingBox()
  const encima = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.dialog') !== null, [caja!.x + 5, caja!.y + caja!.height / 2])
  expect(encima).toBe(true)
})
