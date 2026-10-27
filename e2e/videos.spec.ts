import type { Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

const ENLACE = 'https://kratos.sharepoint.com/:v:/s/estudio/EaBcD123?e=xyz'

test.describe('Videos de SharePoint', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: null, estado: 'activa', geom: { type: 'Point', coordinates: [-75.576, 6.214] } })
    supabase.db.estudios.push({ id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', archivado_en: null })
  })

  async function abrirVideo(page: Page) {
    await page.goto('/lugares/p1/estudios/e1')
    await page.getByRole('button', { name: 'Agregar evidencia' }).click()
    await page.getByRole('dialog', { name: 'Agregar evidencia' }).getByRole('button', { name: /Video de SharePoint/ }).click()
    return page.getByRole('dialog', { name: 'Video de SharePoint' })
  }

  test('se agrega pegando el enlace, con un título opcional', async ({ page, entrar, supabase }) => {
    await entrar()
    const dialogo = await abrirVideo(page)
    await dialogo.getByLabel('Enlace del video').fill(ENLACE)
    await dialogo.getByLabel(/Título/).fill('Recorrido por la bodega')
    await dialogo.getByRole('button', { name: 'Agregar video' }).click()

    await expect(toast(page, 'Video agregado')).toBeVisible()
    expect(supabase.db.evidencias).toEqual([
      expect.objectContaining({ estudio_id: 'e1', tipo: 'video', titulo: 'Recorrido por la bodega', url_externa: ENLACE, proveedor: 'sharepoint', creado_por: 'u-admin' }),
    ])
    const video = page.getByRole('region', { name: /Evidencias/ }).getByRole('link', { name: /Recorrido por la bodega/ })
    await expect(video).toContainText('Video · SharePoint')
    await expect(video).toHaveAttribute('href', ENLACE)
    await expect(video).toHaveAttribute('target', '_blank')
  })

  test('también sirve el código para insertar: se toma su enlace', async ({ page, entrar, supabase }) => {
    await entrar()
    const dialogo = await abrirVideo(page)
    await dialogo
      .getByLabel('Enlace del video')
      .fill('<iframe src="https://kratos.sharepoint.com/sites/estudio/_layouts/15/embed.aspx?UniqueId=abc&amp;embed=1" width="640" height="360"></iframe>')
    await dialogo.getByRole('button', { name: 'Agregar video' }).click()
    await expect(toast(page, 'Video agregado')).toBeVisible()
    expect(supabase.db.evidencias[0].url_externa).toBe('https://kratos.sharepoint.com/sites/estudio/_layouts/15/embed.aspx?UniqueId=abc&embed=1')
  })

  test('solo acepta enlaces de SharePoint', async ({ page, entrar, supabase }) => {
    await entrar()
    const dialogo = await abrirVideo(page)
    await dialogo.getByRole('button', { name: 'Agregar video' }).click()
    await expect(dialogo.getByText('Pega el enlace del video.')).toBeVisible()

    for (const enlace of ['https://www.youtube.com/watch?v=abc', 'http://kratos.sharepoint.com/video', 'no es un enlace']) {
      await dialogo.getByLabel('Enlace del video').fill(enlace)
      await expect(dialogo.getByText('Por ahora solo se aceptan videos de SharePoint')).toBeVisible()
    }
    expect(supabase.db.evidencias).toHaveLength(0)
  })

  test('en la presentación del estudio se abre en SharePoint', async ({ page, entrar, supabase }) => {
    supabase.db.evidencias.push({ id: 'v1', estudio_id: 'e1', tipo: 'video', titulo: null, url_externa: ENLACE, proveedor: 'sharepoint' })
    await entrar()
    await page.goto('/lugares/p1')
    await page.getByRole('region', { name: /Estudios/ }).getByRole('button', { name: /20 oct 2026/ }).click()
    const presentacion = page.getByRole('dialog', { name: /20 oct 2026/ })
    const enlace = presentacion.getByRole('link', { name: 'Ver en SharePoint' })
    await expect(enlace).toHaveAttribute('href', ENLACE)
    await expect(enlace).toHaveAttribute('target', '_blank')
  })

  test('borrarlo explica que el video sigue en SharePoint', async ({ page, entrar, supabase }) => {
    supabase.db.evidencias.push({ id: 'v1', estudio_id: 'e1', tipo: 'video', titulo: 'Recorrido', url_externa: ENLACE, proveedor: 'sharepoint', creado_por: 'u-admin' })
    await entrar()
    await page.goto('/lugares/p1/estudios/e1')
    await page.getByRole('button', { name: 'Borrar «Recorrido»' }).click()
    const confirmacion = page.getByRole('dialog', { name: '¿Borrar esta evidencia?' })
    await expect(confirmacion).toContainText('El video sigue en SharePoint.')
    await confirmacion.getByRole('button', { name: 'Borrar' }).click()
    await expect(toast(page, 'Evidencia borrada')).toBeVisible()
    expect(supabase.db.evidencias).toHaveLength(0)
  })
})
