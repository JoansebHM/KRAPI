import { expect, test, toast } from './soporte/fixtures'

test.describe('Responsables', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/responsables')
  })

  test('sin responsables explica para qué sirven', async ({ page }) => {
    await expect(page.getByText('Aún no hay responsables')).toBeVisible()
  })

  test('agregar: elige un avatar, limpia espacios y la lista muestra el mismo dibujo', async ({ page, supabase }) => {
    await page.getByRole('button', { name: 'Agregar el primero' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nuevo responsable' })
    const opciones = dialogo.locator('.selector-avatar-opcion')
    await expect(opciones).toHaveCount(8)

    const antes = await opciones.locator('img').evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).src))
    await dialogo.getByRole('button', { name: 'Ver otros' }).click()
    const despues = await opciones.locator('img').evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).src))
    expect(despues[0]).toBe(antes[0]) // el primero (el actual) se conserva
    expect(despues.slice(1)).not.toEqual(antes.slice(1))

    await opciones.nth(3).click()
    const elegido = await opciones.nth(3).locator('img').getAttribute('src')
    await expect(dialogo.locator('.selector-avatar-actual img')).toHaveAttribute('src', elegido!)

    await dialogo.getByPlaceholder('Ej.: María Gómez').fill('  laura   vélez ')
    await dialogo.getByRole('button', { name: 'Agregar responsable' }).click()
    await expect(toast(page, 'Responsable agregado')).toBeVisible()

    expect(supabase.db.responsables).toEqual([expect.objectContaining({ nombre: 'laura vélez', avatar_semilla: expect.any(String) })])
    await expect(page.locator('.lista-item', { hasText: 'laura vélez' }).locator('.avatar img')).toHaveAttribute('src', elegido!)
  })

  test('avisa de nombres repetidos sin importar tildes ni mayúsculas', async ({ page, supabase }) => {
    supabase.db.responsables.push({ id: 'r1', nombre: 'María Gómez', avatar_semilla: 'abc' })
    await page.reload()
    await page.getByRole('button', { name: 'Nuevo responsable' }).click()
    await page.getByPlaceholder('Ej.: María Gómez').fill('maria gomez')
    await expect(page.getByText('Ya hay un responsable con ese nombre.')).toBeVisible()
  })

  test('quien no eligió avatar tiene uno, y al editar es la primera opción', async ({ page, supabase }) => {
    supabase.db.responsables.push({ id: 'r-antiguo', nombre: 'Persona Antigua', avatar_semilla: null })
    await page.reload()
    const enLista = await page.locator('.lista-item .avatar img').getAttribute('src')
    expect(enLista).toMatch(/^data:image\/svg\+xml/)
    await page.locator('.lista-item').click()
    const dialogo = page.getByRole('dialog', { name: 'Editar responsable' })
    await expect(dialogo.locator('.selector-avatar-opcion').first()).toHaveAttribute('aria-pressed', 'true')
    await expect(dialogo.locator('.selector-avatar-opcion img').first()).toHaveAttribute('src', enLista!)
  })

  test('muestra en cuántos estudios aparece; eliminar lo quita y "Deshacer" lo restaura con su avatar', async ({ page, supabase }) => {
    supabase.db.responsables.push({ id: 'r1', nombre: 'Ana', avatar_semilla: 'semilla-ana' })
    supabase.db.estudio_responsables.push(
      { estudio_id: 'e1', responsable_id: 'r1' },
      { estudio_id: 'e2', responsable_id: 'r1' },
      { estudio_id: 'e3', responsable_id: 'r1' },
    )
    await page.reload()
    await expect(page.locator('.lista-item')).toContainText('En 3 estudios')

    await page.locator('.lista-item').click()
    await page.getByRole('button', { name: 'Eliminar responsable' }).click()
    const confirmar = page.getByRole('dialog', { name: '¿Eliminar a Ana?' })
    await expect(confirmar).toContainText('Aparece en 3 estudios')
    await expect(confirmar).toContainText('Los estudios no se borran')
    await confirmar.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await expect(toast(page, 'Responsable eliminado')).toBeVisible()
    expect(supabase.db.estudio_responsables).toEqual([])

    await toast(page, 'Responsable eliminado').getByRole('button', { name: 'Deshacer' }).click()
    await expect(toast(page, 'Responsable restaurado')).toBeVisible()
    expect(supabase.db.responsables).toEqual([expect.objectContaining({ id: 'r1', avatar_semilla: 'semilla-ana' })])
    expect(supabase.db.estudio_responsables.map((r) => r.estudio_id).sort()).toEqual(['e1', 'e2', 'e3'])
  })
})
