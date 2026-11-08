import type { Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

const fila = (page: Page, nombre: string) => page.locator('.lista-item', { hasText: nombre })
const pestana = (page: Page, nombre: string) => page.getByRole('tab', { name: new RegExp(`^${nombre}`) })
const ficha = (page: Page, nombre: string) => page.getByRole('dialog', { name: nombre })

test.describe('Usuarios: acceso', () => {
  test('un admin ve "Usuarios" en el menú con las cuentas por aprobar', async ({ page, entrar }) => {
    await entrar('admin')
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    const enlace = page.getByRole('link', { name: /Usuarios/ })
    await expect(enlace.getByLabel('1 por aprobar')).toHaveText('1')
    await enlace.click()
    await expect(page).toHaveURL(/\/usuarios$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible()
    await expect(page.getByText('3 cuentas · 1 pendiente')).toBeVisible()
  })

  test('un miembro no ve "Usuarios" y si entra por la URL vuelve al mapa', async ({ page, entrar }) => {
    await entrar('miembro')
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await expect(page.getByRole('link', { name: 'Categorías' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Usuarios/ })).toHaveCount(0)
    await page.goto('/usuarios')
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('Usuarios: administrar cuentas', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar('admin')
    await page.goto('/usuarios')
  })

  test('empieza en Pendientes y aprobar deja entrar a la persona', async ({ page, supabase }) => {
    await expect(pestana(page, 'Pendientes')).toHaveAttribute('aria-selected', 'true')
    await fila(page, 'Pepe Pérez').click()
    await ficha(page, 'Pepe Pérez').getByRole('button', { name: 'Aprobar' }).click()

    await expect(toast(page, 'Cuenta aprobada')).toContainText('Pepe Pérez ya puede entrar a KIRA.')
    expect(supabase.cuenta('pepe')).toMatchObject({ estado: 'activo', aprobado_por: 'u-admin' })
    await expect(page.getByText('No hay cuentas por aprobar')).toBeVisible()
    await pestana(page, 'Activos').click()
    await expect(fila(page, 'Pepe Pérez')).toBeVisible()
  })

  test('rechazar pide confirmación y la cuenta pasa a Otros, desde donde se puede aprobar', async ({ page, supabase }) => {
    await fila(page, 'Pepe Pérez').click()
    await ficha(page, 'Pepe Pérez').getByRole('button', { name: 'Rechazar' }).click()
    const confirmacion = page.getByRole('dialog', { name: '¿Rechazar la cuenta de Pepe Pérez?' })
    await confirmacion.getByRole('button', { name: 'Cancelar' }).click()
    expect(supabase.cuenta('pepe').estado).toBe('pendiente')

    await fila(page, 'Pepe Pérez').click()
    await ficha(page, 'Pepe Pérez').getByRole('button', { name: 'Rechazar' }).click()
    await confirmacion.getByRole('button', { name: 'Rechazar' }).click()
    await expect(toast(page, 'Cuenta rechazada')).toBeVisible()
    expect(supabase.cuenta('pepe').estado).toBe('rechazado')

    await pestana(page, 'Otros').click()
    await expect(fila(page, 'Pepe Pérez')).toContainText('Rechazada')
    await fila(page, 'Pepe Pérez').click()
    await ficha(page, 'Pepe Pérez').getByRole('button', { name: 'Aprobar' }).click()
    await expect(toast(page, 'Cuenta aprobada')).toBeVisible()
  })

  test('desactivar pide confirmación y reactivar devuelve el acceso', async ({ page, supabase }) => {
    await pestana(page, 'Activos').click()
    await fila(page, 'Ana Gómez').click()
    await ficha(page, 'Ana Gómez').getByRole('button', { name: 'Desactivar cuenta' }).click()
    const confirmacion = page.getByRole('dialog', { name: '¿Desactivar la cuenta de Ana Gómez?' })
    await expect(confirmacion).toContainText('Se cerrará su sesión')
    await confirmacion.getByRole('button', { name: 'Desactivar' }).click()
    await expect(toast(page, 'Cuenta desactivada')).toBeVisible()
    expect(supabase.cuenta('ana').estado).toBe('desactivado')

    await pestana(page, 'Otros').click()
    await fila(page, 'Ana Gómez').click()
    await ficha(page, 'Ana Gómez').getByRole('button', { name: 'Reactivar cuenta' }).click()
    await expect(toast(page, 'Cuenta reactivada')).toBeVisible()
    expect(supabase.cuenta('ana').estado).toBe('activo')
  })

  test('nombrar admin y quitar el rol, con confirmación', async ({ page, supabase }) => {
    await pestana(page, 'Activos').click()
    await fila(page, 'Ana Gómez').click()
    await ficha(page, 'Ana Gómez').getByRole('button', { name: 'Nombrar admin' }).click()
    await expect(toast(page, 'Ahora es admin')).toBeVisible()
    expect(supabase.cuenta('ana').rol).toBe('admin')
    await expect(fila(page, 'Ana Gómez')).toContainText('ana · Admin')

    await fila(page, 'Ana Gómez').click()
    await ficha(page, 'Ana Gómez').getByRole('button', { name: 'Quitar admin' }).click()
    await page.getByRole('dialog', { name: '¿Quitarle el rol de admin a Ana Gómez?' }).getByRole('button', { name: 'Quitar admin' }).click()
    await expect(toast(page, 'Ya no es admin')).toBeVisible()
    expect(supabase.cuenta('ana').rol).toBe('miembro')
  })

  test('en la cuenta propia no hay acciones y se explica por qué', async ({ page }) => {
    await pestana(page, 'Activos').click()
    await fila(page, 'Admin Kratos').click()
    const propia = ficha(page, 'Admin Kratos')
    await expect(propia).toContainText('Nadie puede cambiar su propio rol ni su estado')
    await expect(propia.getByRole('button', { name: 'Desactivar cuenta' })).toHaveCount(0)
    await expect(propia.getByRole('button', { name: 'Quitar admin' })).toHaveCount(0)
  })

  test('si la cuenta cambió en otro dispositivo, se muestra el motivo del servidor', async ({ page, supabase }) => {
    await fila(page, 'Pepe Pérez').click()
    // Otro admin la aprobó mientras tanto.
    supabase.cuenta('pepe').estado = 'activo'
    await ficha(page, 'Pepe Pérez').getByRole('button', { name: 'Aprobar' }).click()
    await expect(toast(page, 'No se pudo cambiar la cuenta')).toContainText('Solo se aprueban cuentas pendientes o rechazadas.')
  })

  test('se busca por nombre o por usuario', async ({ page }) => {
    await pestana(page, 'Activos').click()
    await page.getByPlaceholder('Buscar por nombre o usuario').fill('ana')
    await expect(page.locator('.lista-item')).toHaveCount(1)
    await page.getByPlaceholder('Buscar por nombre o usuario').fill('kratos')
    await expect(fila(page, 'Admin Kratos')).toBeVisible()
  })

  test('cabe en 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await expect(pestana(page, 'Pendientes')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})

test.describe('Usuarios: contraseña temporal', () => {
  test('un admin le pone una contraseña temporal a quien olvidó la suya', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    await page.goto('/usuarios')
    await pestana(page, 'Activos').click()
    await fila(page, 'Ana Gómez').click()
    await ficha(page, 'Ana Gómez').getByRole('button', { name: 'Poner contraseña temporal' }).click()

    const dialogo = page.getByRole('dialog', { name: 'Contraseña temporal para Ana Gómez' })
    await expect(dialogo).toContainText('Se cerrarán sus sesiones abiertas')
    await dialogo.getByLabel('Contraseña temporal', { exact: true }).fill('temporal-123456')
    await dialogo.getByLabel('Repite la contraseña temporal', { exact: true }).fill('temporal-000000')
    await dialogo.getByRole('button', { name: 'Poner contraseña' }).click()
    await expect(dialogo.getByText('Las contraseñas no coinciden.')).toBeVisible()

    await dialogo.getByLabel('Repite la contraseña temporal', { exact: true }).fill('temporal-123456')
    await dialogo.getByRole('button', { name: 'Poner contraseña' }).click()
    await expect(toast(page, 'Contraseña temporal lista')).toContainText('pídele que la cambie en Mi perfil')
    expect(supabase.cuenta('ana').password).toBe('temporal-123456')
    expect(supabase.peticiones).toContain('POST /functions/v1/restablecer-clave')
  })

  test('si el servidor la rechaza, se muestra su motivo', async ({ page, entrar, supabase }) => {
    await entrar('admin')
    await page.goto('/usuarios')
    await pestana(page, 'Activos').click()
    await fila(page, 'Ana Gómez').click()
    await ficha(page, 'Ana Gómez').getByRole('button', { name: 'Poner contraseña temporal' }).click()
    // Mientras tanto, a quien la pone le quitaron el rol de admin.
    supabase.cuenta('admin').rol = 'miembro'
    const dialogo = page.getByRole('dialog', { name: 'Contraseña temporal para Ana Gómez' })
    await dialogo.getByLabel('Contraseña temporal', { exact: true }).fill('temporal-123456')
    await dialogo.getByLabel('Repite la contraseña temporal', { exact: true }).fill('temporal-123456')
    await dialogo.getByRole('button', { name: 'Poner contraseña' }).click()
    await expect(toast(page, 'No se pudo cambiar la contraseña')).toContainText('Solo un admin puede restablecer contraseñas.')
  })

  test('no aparece en la cuenta propia ni en cuentas que no están activas', async ({ page, entrar }) => {
    await entrar('admin')
    await page.goto('/usuarios')
    await fila(page, 'Pepe Pérez').click()
    await expect(ficha(page, 'Pepe Pérez').getByRole('button', { name: 'Poner contraseña temporal' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await pestana(page, 'Activos').click()
    await fila(page, 'Admin Kratos').click()
    await expect(ficha(page, 'Admin Kratos').getByRole('button', { name: 'Poner contraseña temporal' })).toHaveCount(0)
  })
})

test.describe('Usuarios: último ingreso (solo admins)', () => {
  const haceMs = (ms: number) => new Date(Date.now() - ms).toISOString()
  const HORA = 60 * 60 * 1000

  test('la lista dice cuándo ingresó cada cuenta y la ficha, la fecha y la hora', async ({ page, supabase, entrar }) => {
    supabase.cuenta('ana').ultimo_acceso = haceMs(3 * HORA)
    await entrar('admin')
    await page.goto('/usuarios')
    await pestana(page, 'Activos').click()

    // Ana ingresó hace 3 horas; el admin acaba de ingresar; Pepe (pendiente) nunca lo hizo.
    await expect(fila(page, 'Ana Gómez')).toContainText('ingresó hace 3 h')
    await expect(fila(page, 'Admin Kratos')).toContainText('ingresó hace un momento')
    await pestana(page, 'Pendientes').click()
    await expect(fila(page, 'Pepe Pérez')).toContainText('nunca ha ingresado')

    await pestana(page, 'Activos').click()
    await fila(page, 'Ana Gómez').click()
    const datos = ficha(page, 'Ana Gómez')
    await expect(datos.getByText('Último ingreso')).toBeVisible()
    await expect(datos).toContainText(/\d{1,2} [a-z]{3} \d{4} · \d{1,2}:\d{2} [ap]\. m\./)
    await datos.getByRole('button', { name: 'Cerrar', exact: true }).click()

    await pestana(page, 'Pendientes').click()
    await fila(page, 'Pepe Pérez').click()
    await expect(ficha(page, 'Pepe Pérez')).toContainText('Nunca ha ingresado')
  })

  test('pasada una semana muestra la fecha, y entre 1 y 6 días, "hace N días"', async ({ page, supabase, entrar }) => {
    supabase.agregarCuenta({ usuario: 'bruno', nombre: 'Bruno Díaz', ultimo_acceso: haceMs(2 * 24 * HORA) })
    supabase.agregarCuenta({ usuario: 'carla', nombre: 'Carla Ruiz', ultimo_acceso: haceMs(30 * 24 * HORA) })
    await entrar('admin')
    await page.goto('/usuarios')
    await pestana(page, 'Activos').click()
    await expect(fila(page, 'Bruno Díaz')).toContainText('ingresó hace 2 días')
    await expect(fila(page, 'Carla Ruiz')).toContainText(/ingresó \d{1,2} [a-z]{3} \d{4}/)
  })

  test('si no se puede cargar el dato, Usuarios sigue funcionando sin él', async ({ page, supabase, entrar }) => {
    await page.route('**/rest/v1/rpc/ultimos_accesos', (ruta) => ruta.fulfill({ status: 500, json: { message: 'falla' } }))
    await entrar('admin')
    await page.goto('/usuarios')
    await pestana(page, 'Activos').click()
    await expect(fila(page, 'Ana Gómez')).toBeVisible()
    await expect(fila(page, 'Ana Gómez')).not.toContainText('ingres')
    void supabase
  })

  test('un miembro nunca pide ese dato: la base de datos se lo negaría', async ({ page, supabase, entrar }) => {
    await entrar('miembro')
    await page.goto('/usuarios')
    await expect(page).toHaveURL(/\/$/)
    expect(supabase.peticiones.some((p) => p.includes('ultimos_accesos'))).toBe(false)
    // Y si lo pidiera por su cuenta, el simulador (igual que la base de datos) lo rechaza.
    const respuesta = await page.evaluate(async () => {
      const sesion = JSON.parse(localStorage.getItem('krapi-auth') ?? '{}')
      const r = await fetch('https://supabase-falso.e2e.local/rest/v1/rpc/ultimos_accesos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sesion.access_token}`, 'Content-Type': 'application/json' },
        body: '{}',
      })
      return { status: r.status, codigo: (await r.json()).code }
    })
    expect(respuesta).toEqual({ status: 403, codigo: '42501' })
  })

  test('cabe en 320 px', async ({ page, supabase, entrar }) => {
    supabase.cuenta('ana').ultimo_acceso = haceMs(5 * HORA)
    await page.setViewportSize({ width: 320, height: 640 })
    await entrar('admin')
    await page.goto('/usuarios')
    await pestana(page, 'Activos').click()
    await expect(fila(page, 'Ana Gómez')).toContainText('ingresó hace 5 h')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})
