import { expect, iniciarSesion, test, toast } from './soporte/fixtures'

const HORA = 60 * 60 * 1000
const DIA = 24 * HORA

test.describe('Inicio de sesión', () => {
  test('sin sesión solo se ve el login', async ({ page, supabase }) => {
    void supabase
    await page.goto('/categorias')
    await expect(page.getByRole('heading', { level: 1, name: 'KIRA' })).toBeVisible()
    await expect(page).toHaveTitle('KIRA · Geovisor Kratos')
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    await expect(page.locator('.app-header')).toHaveCount(0)
  })

  test('una contraseña incorrecta muestra un mensaje claro', async ({ page, supabase }) => {
    void supabase
    await page.goto('/')
    await iniciarSesion(page, { password: 'clave-equivocada' })
    await expect(page.getByRole('alert')).toHaveText('El correo o la contraseña no son correctos.')
  })

  test('con la contraseña correcta entra y la sesión se mantiene al recargar', async ({ page, entrar }) => {
    await entrar()
    await expect(toast(page, 'Sesión iniciada')).toBeVisible()
    await expect(page.locator('.app-brand')).toHaveText('KIRA')
    await page.reload()
    await expect(page.locator('.app-header')).toBeVisible()
  })
})

test.describe('Límites de la sesión', () => {
  test('avisa antes de cerrar por inactividad y "Seguir conectado" la mantiene', async ({ page, entrar }) => {
    await entrar()
    await page.evaluate((ms) => localStorage.setItem('krapi-sesion-actividad', String(Date.now() - ms)), 2 * HORA - 30_000)
    const aviso = page.getByRole('dialog', { name: '¿Sigues ahí?' })
    await expect(aviso).toContainText('porque se detectó inactividad')
    await aviso.getByRole('button', { name: 'Seguir conectado' }).click()
    await expect(aviso).toHaveCount(0)
    await expect(page.locator('.app-header')).toBeVisible()
  })

  test('al volver después de 3 horas sin uso, cierra la sesión y explica por qué', async ({ page, entrar }) => {
    await entrar()
    await page.evaluate((ms) => localStorage.setItem('krapi-sesion-actividad', String(Date.now() - ms)), 3 * HORA)
    await page.reload()
    await expect(page.getByRole('status')).toHaveText('Se cerró la sesión porque se detectó inactividad.')
  })

  test('pasados 7 días pide la contraseña de nuevo', async ({ page, entrar }) => {
    await entrar()
    await page.evaluate((ms) => localStorage.setItem('krapi-sesion-inicio', String(Date.now() - ms)), 8 * DIA)
    await page.reload()
    await expect(page.getByRole('status')).toContainText('cada 7 días')
  })
})

test.describe('Cerrar sesión', () => {
  test('en todos los dispositivos revoca todas las sesiones', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.getByRole('button', { name: 'Cuenta' }).click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión en todos los dispositivos' }).click()
    await page.getByRole('button', { name: 'Sí, cerrar en todos' }).click()
    await expect(page.getByRole('status')).toHaveText('Se cerró la sesión en todos los dispositivos.')
    expect(supabase.peticiones).toContain('POST /auth/v1/logout?scope=global')
  })

  test('normal: solo en este dispositivo y sin dejar datos de sesión', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.getByRole('button', { name: 'Cuenta' }).click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
    expect(supabase.peticiones).toContain('POST /auth/v1/logout?scope=local')
    const restos = await page.evaluate(() => Object.keys(localStorage).filter((clave) => clave.startsWith('krapi-sesion') || clave === 'krapi-auth'))
    expect(restos).toEqual([])
  })
})
