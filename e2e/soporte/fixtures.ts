import { test as base, expect, type Page } from '@playwright/test'
import { CLAVE, CUENTAS, SupabaseFalso, type ComoQuien } from './supabase-falso'

interface Fixtures {
  /** Supabase simulado de esta prueba, para preparar datos y revisar qué se guardó. */
  supabase: SupabaseFalso
  /**
   * Inicia sesión con una de las cuentas de prueba (por defecto, el admin) y espera a que la
   * app deje el login.
   */
  entrar: (como?: ComoQuien) => Promise<void>
}

export const test = base.extend<Fixtures>({
  supabase: async ({ context }, usar) => {
    const supabase = new SupabaseFalso()
    await supabase.instalar(context)
    await usar(supabase)
  },
  entrar: async ({ page, supabase }, usar) => {
    void supabase // asegura que el Supabase simulado esté instalado antes de abrir la app
    await usar(async (como = 'admin') => {
      await page.goto('/')
      await iniciarSesion(page, { usuario: CUENTAS[como].usuario })
      await expect(page.getByRole('button', { name: 'Ingresar' })).toBeHidden()
      if (CUENTAS[como].estado === 'activo') await expect(page.locator('.app-header')).toBeVisible()
    })
  },
})

export async function iniciarSesion(page: Page, { usuario = CUENTAS.admin.usuario as string, password = CLAVE } = {}) {
  await page.getByLabel('Usuario').fill(usuario)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

/** Notificación (toast) con el texto indicado. */
export const toast = (page: Page, texto: string) => page.locator('[data-sonner-toast]', { hasText: texto })

export { expect }
