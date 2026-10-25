import { expect, test, toast } from './soporte/fixtures'

test.describe('Mi perfil', () => {
  test('se abre desde el menú de la cuenta y muestra el usuario y el rol', async ({ page, entrar }) => {
    await entrar('admin')
    await page.getByRole('button', { name: 'Cuenta' }).click()
    await page.getByRole('menuitem', { name: 'Mi perfil' }).click()
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Mi perfil' })).toBeVisible()
    await expect(page.getByText('admin · Admin')).toBeVisible()
  })

  test('cambia el nombre y el avatar', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    await page.goto('/perfil')
    const guardar = page.getByRole('button', { name: 'Guardar cambios' })
    await expect(guardar).toBeDisabled()

    await page.getByLabel('Nombre', { exact: true }).fill('Admin del equipo')
    await page.getByRole('button', { name: 'Avatar 3' }).click()
    await expect(page.getByRole('button', { name: 'Avatar 3' })).toHaveAttribute('aria-pressed', 'true')
    await guardar.click()

    await expect(toast(page, 'Perfil actualizado')).toBeVisible()
    expect(supabase.cuenta('admin').nombre).toBe('Admin del equipo')
    expect(supabase.cuenta('admin').avatar_semilla).toEqual(expect.any(String))
    await page.getByRole('button', { name: 'Cuenta', exact: true }).click()
    await expect(page.getByRole('menu')).toContainText('Admin del equipo')
  })

  test('cambia la contraseña pidiéndola dos veces', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    await page.goto('/perfil')
    const cambiar = page.getByRole('button', { name: 'Cambiar contraseña' })
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('nueva-clave-segura')
    await page.getByLabel('Repite la nueva contraseña', { exact: true }).fill('otra-clave-distinta')
    await cambiar.click()
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()

    await page.getByLabel('Repite la nueva contraseña', { exact: true }).fill('nueva-clave-segura')
    await cambiar.click()
    await expect(toast(page, 'Contraseña cambiada')).toBeVisible()
    expect(supabase.cuenta('admin').password).toBe('nueva-clave-segura')
    await expect(page.getByLabel('Nueva contraseña', { exact: true })).toHaveValue('')
  })

  test('no deja poner la misma contraseña', async ({ page, entrar }) => {
    await entrar('admin')
    await page.goto('/perfil')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('clave-correcta-123')
    await page.getByLabel('Repite la nueva contraseña', { exact: true }).fill('clave-correcta-123')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(toast(page, 'No se pudo cambiar la contraseña')).toContainText('debe ser distinta de la actual')
  })

  test('cabe en 320 px', async ({ page, entrar }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await entrar('admin')
    await page.goto('/perfil')
    await expect(page.getByRole('heading', { level: 1, name: 'Mi perfil' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})

test.describe('Cerrar en todos los dispositivos', () => {
  test('explica que afecta solo a la propia cuenta', async ({ page, entrar }) => {
    await entrar('miembro')
    await page.getByRole('button', { name: 'Cuenta' }).click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión en todos los dispositivos' }).click()
    await expect(page.getByRole('dialog')).toContainText('Las cuentas de los demás no cambian.')
  })
})
