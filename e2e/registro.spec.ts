import type { Page } from '@playwright/test'
import { CLAVE } from './soporte/supabase-falso'
import { expect, iniciarSesion, test, toast } from './soporte/fixtures'

const usuario = (page: Page) => page.getByLabel('Nombre de usuario')

async function abrirRegistro(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Crear una cuenta' }).click()
  await expect(page).toHaveURL(/\/registro$/)
}

async function llenar(page: Page, datos: { nombre?: string; usuario?: string; password?: string; confirmacion?: string }) {
  if (datos.nombre !== undefined) await page.getByLabel('Nombre', { exact: true }).fill(datos.nombre)
  if (datos.usuario !== undefined) await usuario(page).fill(datos.usuario)
  if (datos.password !== undefined) await page.getByLabel('Contraseña', { exact: true }).fill(datos.password)
  if (datos.confirmacion !== undefined) await page.getByLabel('Repite la contraseña', { exact: true }).fill(datos.confirmacion)
}

test.describe('Registro', () => {
  test.beforeEach(async ({ supabase }) => void supabase)

  test('se llega desde el login y se puede volver', async ({ page }) => {
    await abrirRegistro(page)
    await expect(page.getByText('un admin del equipo debe aprobar tu cuenta')).toBeVisible()
    await page.getByRole('link', { name: 'Ingresar' }).click()
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })

  test('crea la cuenta pendiente con su nombre y explica que falta la aprobación', async ({ page, supabase }) => {
    await abrirRegistro(page)
    await llenar(page, { nombre: 'María López', usuario: 'Maria.Lopez', password: 'una-clave-larga', confirmacion: 'una-clave-larga' })
    await expect(usuario(page)).toHaveValue('maria.lopez')
    await expect(page.getByText('Está disponible.')).toBeVisible()
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    await expect(toast(page, 'Cuenta creada')).toContainText('Un admin debe aprobarla')
    await expect(page.getByRole('heading', { name: 'Tu cuenta está esperando aprobación' })).toBeVisible()
    await expect(page.getByText('María López · maria.lopez')).toBeVisible()
    expect(supabase.cuenta('maria.lopez')).toMatchObject({ nombre: 'María López', estado: 'pendiente', rol: 'miembro' })
    expect(supabase.peticiones).toContain('POST /auth/v1/signup')
  })

  test('valida los campos antes de enviar', async ({ page, supabase }) => {
    await abrirRegistro(page)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Escribe tu nombre.')).toBeVisible()
    await expect(page.getByText('Elige un nombre de usuario.')).toBeVisible()
    await expect(page.getByText('Usa al menos 10 caracteres.')).toBeVisible()
    await expect(page.getByText('Repite la contraseña.')).toBeVisible()

    await llenar(page, { usuario: 'ana gómez' })
    await expect(page.getByText('Usa solo letras sin tildes, números, punto, guion o guion bajo.')).toBeVisible()
    await llenar(page, { usuario: 'ab' })
    await expect(page.getByText('Usa al menos 3 caracteres.')).toBeVisible()

    await llenar(page, { password: 'una-clave-larga', confirmacion: 'otra-clave-larga' })
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
    expect(supabase.peticiones.filter((p) => p.includes('/signup'))).toEqual([])
  })

  test('avisa mientras se escribe si el nombre de usuario ya existe, sin importar mayúsculas', async ({ page }) => {
    await abrirRegistro(page)
    await llenar(page, { usuario: 'ANA' })
    await expect(page.getByText('Ese nombre de usuario ya existe. Elige otro.')).toBeVisible()
    await llenar(page, { usuario: 'ana.maria' })
    await expect(page.getByText('Está disponible.')).toBeVisible()
  })

  test('si otra persona toma el nombre de usuario justo antes, lo explica', async ({ page, supabase }) => {
    await abrirRegistro(page)
    await llenar(page, { nombre: 'Ana María', usuario: 'ana.maria', password: 'una-clave-larga', confirmacion: 'una-clave-larga' })
    await expect(page.getByText('Está disponible.')).toBeVisible()
    supabase.agregarCuenta({ usuario: 'ana.maria' })
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByRole('alert')).toHaveText('Ese nombre de usuario ya existe. Elige otro.')
  })

  test('el formulario cabe en 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await abrirRegistro(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})

test.describe('Ingresar con nombre de usuario', () => {
  test('entra con el nombre de usuario sin importar mayúsculas ni espacios', async ({ page, supabase }) => {
    void supabase
    await page.goto('/')
    await iniciarSesion(page, { usuario: '  Ana ', password: CLAVE })
    await expect(page.locator('.app-header')).toBeVisible()
  })
})
