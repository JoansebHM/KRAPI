import { expect, test, toast } from './soporte/fixtures'

test.describe('Mi perfil', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.responsables.push({ id: 'r1', nombre: 'Admin', avatar_semilla: 'admin' }, { id: 'r2', nombre: 'Ana', avatar_semilla: 'ana' })
    supabase.cuenta('ana').responsable_id = 'r2'
  })

  test('se abre desde el menú de la cuenta y muestra el usuario y el rol', async ({ page, entrar }) => {
    await entrar('admin')
    await page.getByRole('button', { name: 'Cuenta' }).click()
    await page.getByRole('menuitem', { name: 'Mi perfil' }).click()
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Mi perfil' })).toBeVisible()
    await expect(page.getByText('admin · Admin')).toBeVisible()
  })

  test('cambia el nombre y elige "Este soy yo" sin poder tomar el de otra cuenta', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    await page.goto('/perfil')
    const guardar = page.getByRole('button', { name: 'Guardar cambios' })
    await expect(guardar).toBeDisabled()

    await page.getByLabel('Nombre', { exact: true }).fill('Admin del equipo')
    const ana = page.getByRole('button', { name: /Ana · cuenta de ana/ })
    await expect(ana).toHaveAttribute('aria-disabled', 'true')
    await page.getByRole('button', { name: 'Admin', exact: true }).click()
    await guardar.click()

    await expect(toast(page, 'Perfil actualizado')).toBeVisible()
    expect(supabase.cuenta('admin')).toMatchObject({ nombre: 'Admin del equipo', responsable_id: 'r1' })
    await page.getByRole('button', { name: 'Cuenta', exact: true }).click()
    await expect(page.getByRole('menu')).toContainText('Admin del equipo')
  })

  test('si otra cuenta tomó el responsable justo antes, lo explica', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Admin', exact: true }).click()
    supabase.cuenta('pepe').responsable_id = 'r1'
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'No se pudo guardar')).toContainText('Ese responsable ya está vinculado a otra cuenta.')
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

test.describe('Responsable vinculado en los estudios', () => {
  test('al crear un estudio viene marcado, además de los del último estudio del celular', async ({ page, entrar, supabase }) => {
    supabase.db.responsables.push({ id: 'r1', nombre: 'Ana', avatar_semilla: 'ana' }, { id: 'r2', nombre: 'Beto', avatar_semilla: 'beto' }, { id: 'r3', nombre: 'Caro', avatar_semilla: 'caro' })
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: null, estado: 'activa', geom: { type: 'Point', coordinates: [-75.576, 6.214] } })
    supabase.cuenta('ana').responsable_id = 'r1'
    await page.addInitScript(() => localStorage.setItem('krapi-ultimos-responsables', JSON.stringify(['r2'])))
    await entrar('miembro')
    await page.goto('/lugares/p1')
    await page.getByRole('button', { name: 'Agregar estudio' }).click()

    const formulario = page.getByRole('dialog', { name: 'Nuevo estudio' })
    await expect(formulario.getByRole('button', { name: 'Ana' })).toHaveAttribute('aria-pressed', 'true')
    await expect(formulario.getByRole('button', { name: 'Beto' })).toHaveAttribute('aria-pressed', 'true')
    await expect(formulario.getByRole('button', { name: 'Caro' })).toHaveAttribute('aria-pressed', 'false')
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
