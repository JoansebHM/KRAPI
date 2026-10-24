import { expect, test, toast } from './soporte/fixtures'

test.describe('Categorías', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/categorias')
  })

  test('sin categorías explica qué son y deja crear la primera', async ({ page }) => {
    await expect(page.getByText('Aún no hay categorías')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crear la primera' })).toBeVisible()
  })

  test('crear: valida el nombre y guarda el color y el ícono elegidos', async ({ page, supabase }) => {
    await page.getByRole('button', { name: 'Crear la primera' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nueva categoría' })
    await dialogo.getByRole('button', { name: 'Crear categoría' }).click()
    await expect(dialogo.getByText('Escribe un nombre.')).toBeVisible()

    await dialogo.getByPlaceholder('Ej.: Café, Hotelería, Comercio').fill('Café')
    await dialogo.getByRole('button', { name: 'Lila' }).click()
    await dialogo.getByRole('button', { name: 'Crear categoría' }).click()

    await expect(toast(page, 'Categoría creada')).toBeVisible()
    expect(supabase.db.categorias).toEqual([expect.objectContaining({ nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })])
  })

  test('avisa de nombres repetidos mientras se escribe, sin importar mayúsculas ni espacios', async ({ page, supabase }) => {
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#0478FB', icono: 'cafe' })
    await page.reload()
    await page.getByRole('button', { name: 'Nueva categoría' }).click()
    await page.getByPlaceholder('Ej.: Café, Hotelería, Comercio').fill('  café ')
    await expect(page.getByText('Ya existe una categoría con ese nombre.')).toBeVisible()
  })

  test('si el servidor rechaza un nombre repetido, lo explica y deja corregir', async ({ page, supabase }) => {
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#0478FB', icono: null })
    await page.reload()
    // Otro dispositivo crea "Hotel" después de que esta pantalla cargó la lista.
    supabase.db.categorias.push({ id: 'c2', nombre: 'Hotel', color: '#0478FB', icono: null })
    await page.getByRole('button', { name: 'Nueva categoría' }).click()
    await page.getByPlaceholder('Ej.: Café, Hotelería, Comercio').fill('Hotel')
    await page.getByRole('button', { name: 'Crear categoría' }).click()
    await expect(toast(page, 'No se pudo guardar')).toContainText('Ya existe una categoría con ese nombre')
    await expect(page.getByRole('dialog', { name: 'Nueva categoría' })).toBeVisible()
  })

  test('la lista va en orden alfabético, con cuántas ubicaciones usa cada una, y se puede buscar sin tildes', async ({ page, supabase }) => {
    supabase.db.categorias.push(
      { id: 'c1', nombre: 'Comercio', color: '#0478FB', icono: 'tienda' },
      { id: 'c2', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' },
    )
    supabase.db.ubicaciones.push({ id: 'u1', categoria_id: 'c1' }, { id: 'u2', categoria_id: 'c1' })
    await page.reload()
    const filas = page.locator('.lista-item')
    await expect(filas).toHaveCount(2)
    await expect(filas.nth(0)).toContainText('Café')
    await expect(filas.nth(0)).toContainText('Sin ubicaciones')
    await expect(filas.nth(1)).toContainText('2 ubicaciones')

    await page.getByPlaceholder('Buscar categoría').fill('cafe')
    await expect(filas).toHaveCount(1)
    await page.getByPlaceholder('Buscar categoría').fill('xyz')
    await expect(page.getByText('Ninguna categoría coincide')).toBeVisible()
  })

  test('editar no abre el teclado y guarda los cambios', async ({ page, supabase }) => {
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#0478FB', icono: 'cafe' })
    await page.reload()
    await page.locator('.lista-item', { hasText: 'Café' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Editar categoría' })
    await expect(dialogo.getByRole('button', { name: 'Guardar cambios' })).toBeFocused()
    await dialogo.getByRole('textbox', { name: 'Nombre' }).fill('Cafetería')
    await dialogo.getByRole('button', { name: 'Naranja' }).click()
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Cambios guardados')).toBeVisible()
    expect(supabase.db.categorias[0]).toMatchObject({ nombre: 'Cafetería', color: '#F79009' })
  })

  test('eliminar avisa cuántas ubicaciones quedan sin categoría, y "Deshacer" la restaura con sus ubicaciones', async ({ page, supabase }) => {
    supabase.db.categorias.push({ id: 'c1', nombre: 'Comercio', color: '#0478FB', icono: 'tienda' })
    supabase.db.ubicaciones.push({ id: 'u1', categoria_id: 'c1' }, { id: 'u2', categoria_id: 'c1' })
    await page.reload()
    await page.locator('.lista-item', { hasText: 'Comercio' }).click()
    await page.getByRole('button', { name: 'Eliminar categoría' }).click()
    const confirmar = page.getByRole('dialog', { name: '¿Eliminar «Comercio»?' })
    await expect(confirmar).toContainText('2 ubicaciones usan esta categoría')
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await confirmar.getByRole('button', { name: 'Eliminar', exact: true }).click()

    await expect(toast(page, 'Categoría eliminada')).toBeVisible()
    expect(supabase.db.ubicaciones.every((u) => u.categoria_id === null)).toBe(true)

    await toast(page, 'Categoría eliminada').getByRole('button', { name: 'Deshacer' }).click()
    await expect(toast(page, 'Categoría restaurada')).toBeVisible()
    expect(supabase.db.categorias).toEqual([expect.objectContaining({ id: 'c1', icono: 'tienda' })])
    expect(supabase.db.ubicaciones.every((u) => u.categoria_id === 'c1')).toBe(true)
  })
})

test.describe('Íconos de categorías', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/categorias')
    await page.getByRole('button', { name: 'Crear la primera' }).click()
  })

  const marcado = (page: import('@playwright/test').Page) => page.locator('.selector-icono-opcion[aria-pressed="true"]')

  test('se sugiere a partir del nombre, también en plural', async ({ page }) => {
    await page.getByPlaceholder('Ej.: Café, Hotelería, Comercio').fill('Panaderías')
    await expect(marcado(page)).toHaveAttribute('aria-label', 'Panadería')
    await page.getByPlaceholder('Ej.: Café, Hotelería, Comercio').fill('Restaurantes')
    await expect(marcado(page)).toHaveAttribute('aria-label', 'Restaurante')
  })

  test('el buscador encuentra por palabras clave y Enter no envía el formulario', async ({ page }) => {
    const buscar = page.getByPlaceholder('Buscar ícono: pan, bar, médico…')
    await buscar.fill('tinto')
    await expect(page.locator('.selector-icono-opcion')).toHaveCount(1)
    await expect(page.locator('.selector-icono-opcion')).toHaveAttribute('aria-label', 'Café')
    await buscar.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Nueva categoría' })).toBeVisible()
  })

  test('un ícono elegido a mano no cambia al seguir escribiendo el nombre', async ({ page, supabase }) => {
    await page.getByPlaceholder('Buscar ícono: pan, bar, médico…').fill('tinto')
    await page.locator('.selector-icono-opcion').first().click()
    await page.getByPlaceholder('Ej.: Café, Hotelería, Comercio').fill('Panadería del barrio')
    await expect(marcado(page)).toHaveAttribute('aria-label', 'Café')
    await page.getByRole('button', { name: 'Crear categoría' }).click()
    await expect(toast(page, 'Categoría creada')).toBeVisible()
    expect(supabase.db.categorias[0]).toMatchObject({ nombre: 'Panadería del barrio', icono: 'cafe' })
  })
})
