import type { Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

const presentacion = (page: Page, texto: string | RegExp = /20 oct 2026/) => page.getByRole('dialog', { name: texto })

test.describe('Notas del estudio', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: null, estado: 'activa', geom: { type: 'Point', coordinates: [-75.576, 6.214] } })
    supabase.db.estudios.push({
      id: 'e1',
      ubicacion_id: 'p1',
      fecha: '2026-10-20',
      hora_inicio: '09:00:00',
      hora_fin: '10:00:00',
      archivado_en: null,
      notas: ['El distribuidor pasa los martes.', 'La nevera está llena de la marca X.'],
    })
  })

  async function abrirPresentacion(page: Page) {
    await page.goto('/lugares/p1')
    await page.getByRole('region', { name: /Estudios/ }).getByRole('button', { name: /20 oct 2026/ }).click()
    return presentacion(page)
  }

  test('la presentación las muestra en una sección desplegable, y cada una se puede copiar', async ({ page, entrar, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await entrar()
    const dialogo = await abrirPresentacion(page)
    const notas = dialogo.locator('.estudio-notas')
    await expect(notas.locator('summary')).toContainText('Notas2')
    await expect(notas.getByText('El distribuidor pasa los martes.')).toBeHidden()

    await notas.locator('summary').click()
    await expect(notas.getByText('El distribuidor pasa los martes.')).toBeVisible()
    await expect(notas.getByText('La nevera está llena de la marca X.')).toBeVisible()

    await notas.getByRole('button', { name: 'Copiar nota 2' }).click()
    await expect(toast(page, 'Nota copiada')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('La nevera está llena de la marca X.')
  })

  test('sin notas no aparece la sección', async ({ page, entrar, supabase }) => {
    supabase.db.estudios[0].notas = []
    await entrar()
    const dialogo = await abrirPresentacion(page)
    await expect(dialogo).toContainText('20 oct 2026')
    await expect(dialogo.locator('.estudio-notas')).toHaveCount(0)
  })

  test('en el formulario se agregan, se editan y se borran una por una', async ({ page, entrar, supabase }) => {
    await entrar()
    const dialogo = await abrirPresentacion(page)
    await dialogo.getByRole('button', { name: 'Editar estudio' }).click()
    const formulario = page.getByRole('dialog', { name: 'Editar estudio' })

    await expect(formulario.getByLabel('Nota 1', { exact: true })).toHaveValue('El distribuidor pasa los martes.')
    await formulario.getByRole('button', { name: 'Borrar nota 1' }).click()
    await expect(formulario.getByLabel('Nota 1', { exact: true })).toHaveValue('La nevera está llena de la marca X.')

    await formulario.getByRole('button', { name: 'Agregar nota' }).click()
    await expect(formulario.getByLabel('Nota 2', { exact: true })).toBeFocused()
    await formulario.getByLabel('Nota 2', { exact: true }).fill('  Abre los domingos.  ')
    // Una nota que se deja vacía no se guarda.
    await formulario.getByRole('button', { name: 'Agregar nota' }).click()
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(toast(page, 'Cambios guardados')).toBeVisible()
    expect(supabase.db.estudios[0].notas).toEqual(['La nevera está llena de la marca X.', 'Abre los domingos.'])
  })

  test('un estudio nuevo arranca sin notas y se le pueden agregar', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/lugares/p1')
    await page.getByRole('button', { name: 'Agregar estudio' }).click()
    const formulario = page.getByRole('dialog', { name: 'Nuevo estudio' })
    await expect(formulario.getByText('Agrega todas las que necesites.')).toBeVisible()
    await formulario.getByRole('button', { name: 'Agregar nota' }).click()
    await formulario.getByLabel('Nota 1', { exact: true }).fill('Primera impresión.')
    await formulario.getByRole('button', { name: 'Guardar estudio' }).click()

    await expect(toast(page, 'Estudio guardado')).toBeVisible()
    expect(supabase.db.estudios.find((e) => e.id !== 'e1')?.notas).toEqual(['Primera impresión.'])
    // La página del estudio también las muestra.
    await page.locator('.estudio-notas summary').click()
    await expect(page.locator('.estudio-notas')).toContainText('Primera impresión.')
  })

  test('el formulario con notas cabe en 320 px', async ({ page, entrar }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await entrar()
    const dialogo = await abrirPresentacion(page)
    await dialogo.getByRole('button', { name: 'Editar estudio' }).click()
    const formulario = page.getByRole('dialog', { name: 'Editar estudio' })
    await expect(formulario.getByLabel('Nota 2', { exact: true })).toBeVisible()
    await expect(formulario).toHaveJSProperty('scrollWidth', await formulario.evaluate((elemento) => elemento.clientWidth))
  })
})
