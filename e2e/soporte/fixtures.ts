import { test as base, expect, type Page } from '@playwright/test'
import { SupabaseFalso, USUARIO } from './supabase-falso'

interface Fixtures {
  /** Supabase simulado de esta prueba, para preparar datos y revisar qué se guardó. */
  supabase: SupabaseFalso
  /** Inicia sesión con el usuario compartido y deja la app en el mapa. */
  entrar: () => Promise<void>
}

export const test = base.extend<Fixtures>({
  supabase: async ({ context }, usar) => {
    const supabase = new SupabaseFalso()
    await supabase.instalar(context)
    await usar(supabase)
  },
  entrar: async ({ page, supabase }, usar) => {
    void supabase // asegura que el Supabase simulado esté instalado antes de abrir la app
    await usar(async () => {
      await page.goto('/')
      await iniciarSesion(page)
      await expect(page.locator('.app-header')).toBeVisible()
    })
  },
})

export async function iniciarSesion(page: Page, password = USUARIO.password) {
  await page.getByLabel('Correo').fill(USUARIO.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

/** Notificación (toast) con el texto indicado. */
export const toast = (page: Page, texto: string) => page.locator('[data-sonner-toast]', { hasText: texto })

export { expect }
