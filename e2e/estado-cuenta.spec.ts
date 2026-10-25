import type { Page } from '@playwright/test'
import { expect, iniciarSesion, test } from './soporte/fixtures'

/** Simula volver a la pestaña: la app revisa de nuevo el estado de la cuenta. */
async function volverALaPestana(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
}

const espera = (page: Page) => page.getByRole('heading', { name: 'Tu cuenta está esperando aprobación' })

test.describe('Estado de la cuenta', () => {
  test('una cuenta pendiente ve que espera aprobación y puede salir', async ({ page, entrar }) => {
    await entrar('pendiente')
    await expect(espera(page)).toBeVisible()
    await expect(page.getByText('Pepe Pérez · pepe')).toBeVisible()
    await page.getByRole('button', { name: 'Salir' }).click()
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })

  test('si un admin la aprueba mientras espera, entra al mapa sin cerrar sesión', async ({ page, entrar, supabase }) => {
    await entrar('pendiente')
    await expect(espera(page)).toBeVisible()

    supabase.cuenta('pepe').estado = 'activo'
    await page.getByRole('button', { name: 'Revisar ahora' }).click()
    await expect(page.locator('.app-header')).toBeVisible()
  })

  test('también entra al volver a la pestaña después de la aprobación', async ({ page, entrar, supabase }) => {
    await entrar('pendiente')
    await expect(espera(page)).toBeVisible()
    supabase.cuenta('pepe').estado = 'activo'
    await volverALaPestana(page)
    await expect(page.locator('.app-header')).toBeVisible()
  })

  test('una cuenta rechazada lo ve explicado y puede salir', async ({ page, supabase }) => {
    supabase.agregarCuenta({ usuario: 'rita', nombre: 'Rita', estado: 'rechazado' })
    await page.goto('/')
    await iniciarSesion(page, { usuario: 'rita' })
    await expect(page.getByRole('heading', { name: 'Tu cuenta no fue aprobada' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Revisar ahora' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible()
  })

  test('una cuenta desactivada que entra lo ve explicado', async ({ page, supabase }) => {
    supabase.agregarCuenta({ usuario: 'dario', nombre: 'Darío', estado: 'desactivado' })
    await page.goto('/')
    await iniciarSesion(page, { usuario: 'dario' })
    await expect(page.getByRole('heading', { name: 'Tu cuenta está desactivada' })).toBeVisible()
  })

  test('si la desactivan con la app abierta, se cierra la sesión y se explica por qué', async ({ page, entrar, supabase }) => {
    await entrar('miembro')
    supabase.cuenta('ana').estado = 'desactivado'
    await volverALaPestana(page)
    await expect(page.getByRole('status')).toHaveText('Un admin desactivó tu cuenta. Si crees que es un error, habla con un admin del equipo.')
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })

  test('el menú de la cuenta muestra el nombre y el usuario', async ({ page, entrar }) => {
    await entrar('admin')
    await page.getByRole('button', { name: 'Cuenta' }).click()
    await expect(page.getByRole('menu')).toContainText('Admin Kratos')
    await expect(page.getByRole('menu')).toContainText('admin · admin')
  })

  test('la pantalla de espera cabe en 320 px', async ({ page, entrar }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await entrar('pendiente')
    await expect(espera(page)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})
