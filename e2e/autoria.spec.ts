import type { Page } from '@playwright/test'
import { expect, test } from './soporte/fixtures'

/** Un estudio ya no tiene título: se identifica por su fecha, como se ve en la lista y en el diálogo. */
async function abrirPresentacion(page: Page, fecha: string) {
  await page.goto('/lugares/p1')
  await page.getByRole('region', { name: /Estudios/ }).getByRole('button', { name: new RegExp(fecha) }).click()
  return page.getByRole('dialog', { name: new RegExp(fecha) })
}

test.describe('Quién registró cada cosa', () => {
  test.beforeEach(async ({ page, supabase }) => {
    // "Hoy" es el 31 de octubre, distinto a las fechas de los estudios ya guardados.
    await page.clock.setFixedTime(new Date('2026-10-31T10:00:00-05:00'))
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: null, estado: 'activa', geom: { type: 'Point', coordinates: [-75.576, 6.214] } })
    supabase.db.estudios.push(
      {
        id: 'e1',
        ubicacion_id: 'p1',
        fecha: '2026-10-30',
        hora_inicio: '09:00:00',
        hora_fin: '10:00:00',
        archivado_en: null,
        creado_por: 'u-ana',
        actualizado_por: 'u-admin',
        created_at: '2026-10-30T15:00:00Z',
        updated_at: '2026-10-31T16:00:00Z',
      },
      {
        id: 'e2',
        ubicacion_id: 'p1',
        fecha: '2026-10-20',
        hora_inicio: '09:00:00',
        hora_fin: '10:00:00',
        archivado_en: null,
        creado_por: null,
        actualizado_por: null,
        created_at: '2026-10-20T15:00:00Z',
        updated_at: '2026-10-20T15:00:10Z',
      },
    )
  })

  test('la presentación del estudio dice quién lo registró y quién lo editó', async ({ page, entrar }) => {
    await entrar('miembro')
    const presentacion = await abrirPresentacion(page, '30 oct 2026')
    const autoria = presentacion.locator('.estudio-presentacion-autoria')
    await expect(autoria).toContainText('Registrado por Ana Gómez · 30 oct 2026')
    await expect(autoria).toContainText('Editado por Admin Kratos · 31 oct 2026')
  })

  test('la línea de quién lo registró no queda pegada a los participantes', async ({ page, entrar }) => {
    await entrar('miembro')
    const presentacion = await abrirPresentacion(page, '30 oct 2026')
    const datos = (await presentacion.locator('.estudio-presentacion-datos').boundingBox())!
    const autoria = (await presentacion.locator('.estudio-presentacion-autoria').boundingBox())!
    // Al menos 16 px (--space-4) entre el último dato y la línea.
    expect(autoria.y - (datos.y + datos.height)).toBeGreaterThanOrEqual(15.5)
  })

  test('los registros de antes de las cuentas individuales dicen "Cuenta compartida"', async ({ page, entrar }) => {
    await entrar('miembro')
    const presentacion = await abrirPresentacion(page, '20 oct 2026')
    const autoria = presentacion.locator('.estudio-presentacion-autoria')
    await expect(autoria).toHaveText('Registrado por Cuenta compartida · 20 oct 2026')
  })

  test('cada evidencia dice quién la subió', async ({ page, entrar, supabase }) => {
    supabase.db.evidencias.push(
      { id: 'v1', estudio_id: 'e1', tipo: 'documento', titulo: null, archivo_path: 'e1/a-informe.pdf', archivo_nombre: 'informe.pdf', archivo_mime: 'application/pdf', archivo_bytes: 1000, proveedor: 'supabase', creado_por: 'u-ana', created_at: '2026-10-30T15:10:00Z' },
      { id: 'v2', estudio_id: 'e1', tipo: 'documento', titulo: null, archivo_path: 'e1/b-acta.pdf', archivo_nombre: 'acta.pdf', archivo_mime: 'application/pdf', archivo_bytes: 1000, proveedor: 'supabase', creado_por: null, created_at: '2026-10-30T15:00:00Z' },
    )
    supabase.archivos.set('e1/a-informe.pdf', { tipo: 'application/pdf', bytes: 1000 })
    supabase.archivos.set('e1/b-acta.pdf', { tipo: 'application/pdf', bytes: 1000 })
    await entrar('miembro')

    const presentacion = await abrirPresentacion(page, '30 oct 2026')
    await expect(presentacion.locator('li', { hasText: 'informe.pdf' })).toContainText('subida por Ana Gómez')
    await expect(presentacion.locator('li', { hasText: 'acta.pdf' })).toContainText('subida por Cuenta compartida')

    await page.goto('/lugares/p1/estudios/e1')
    const evidencias = page.getByRole('region', { name: /Evidencias/ })
    await expect(evidencias.getByRole('link', { name: /informe\.pdf/ })).toContainText('Ana Gómez')
  })

  test('un estudio nuevo queda a nombre de quien lo registra', async ({ page, entrar }) => {
    await entrar('miembro')
    await page.goto('/lugares/p1')
    await page.getByRole('button', { name: 'Agregar estudio' }).click()
    const formulario = page.getByRole('dialog', { name: 'Nuevo estudio' })
    await formulario.getByRole('button', { name: 'Guardar estudio' }).click()
    await expect(page).toHaveURL(/\/estudios\//)

    const presentacion = await abrirPresentacion(page, '31 oct 2026')
    await expect(presentacion.locator('.estudio-presentacion-autoria')).toContainText('Registrado por Ana Gómez')
    await expect(presentacion.locator('.estudio-presentacion-autoria')).not.toContainText('Editado por')
  })
})
