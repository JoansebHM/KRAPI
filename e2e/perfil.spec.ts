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

  test('guarda, cambia y quita el correo para avisos', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    await page.goto('/perfil')
    const correo = page.getByLabel('Correo (opcional)')
    const guardar = page.getByRole('button', { name: 'Guardar correo' })
    await expect(correo).toHaveValue('')
    await expect(guardar).toBeDisabled()
    // Un admin ve para qué le sirve.
    await expect(page.getByText('Aquí recibes el aviso cuando alguien se registra y espera aprobación.')).toBeVisible()

    await correo.fill('  Admin@Kratos.CO ')
    await guardar.click()
    await expect(toast(page, 'Correo guardado')).toBeVisible()
    expect(supabase.correo('admin')).toBe('admin@kratos.co')
    await expect(correo).toHaveValue('admin@kratos.co')

    await correo.fill('otro@kratos.co')
    await guardar.click()
    // El aviso anterior tiene el mismo texto, así que se revisa lo guardado.
    await expect.poll(() => supabase.correo('admin')).toBe('otro@kratos.co')

    await correo.fill('')
    await guardar.click()
    await expect(toast(page, 'Correo quitado')).toBeVisible()
    expect(supabase.correo('admin')).toBeUndefined()
  })

  test('muestra el correo que ya estaba guardado y un miembro ve otro texto de ayuda', async ({ page, entrar, supabase }) => {
    supabase.guardarCorreo('ana', 'ana@kratos.co')
    await entrar('miembro')
    await page.goto('/perfil')
    await expect(page.getByLabel('Correo (opcional)')).toHaveValue('ana@kratos.co')
    await expect(page.getByText('Solo para avisos de KIRA. No es para entrar.')).toBeVisible()
  })

  test('no guarda un correo mal escrito', async ({ page, entrar, supabase }) => {
    await entrar('miembro')
    await page.goto('/perfil')
    await page.getByLabel('Correo (opcional)').fill('sin-arroba')
    await page.getByRole('button', { name: 'Guardar correo' }).click()
    await expect(page.getByText('Escribe un correo válido, como nombre@ejemplo.com.')).toBeVisible()
    expect(supabase.correo('ana')).toBeUndefined()
    expect(supabase.peticiones).not.toContain('POST /rest/v1/rpc/guardar_correo')
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
