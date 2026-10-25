import type { Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

const ficha = (page: Page, nombre = 'Café Central') => page.getByRole('region', { name: nombre })
const POSICION = [-75.57402, 6.21293]

test.describe('Ficha del lugar', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })
    supabase.db.ubicaciones.push({
      id: 'p1',
      tipo: 'punto',
      nombre: 'Café Central',
      categoria_id: 'c1',
      estado: 'activa',
      archivada_en: null,
      direccion: 'Calle 10 # 43E-20',
      complemento: 'Local 102',
      contacto_nombre: 'Administradora',
      contacto_telefono: '300 123 4567',
      descripcion: 'Abre de lunes a sábado.\nVende al por mayor.',
      creado_por: 'u-ana',
      geom: { type: 'Point', coordinates: POSICION },
    })
  })

  test('muestra todos los datos y el teléfono se puede llamar o escribir por WhatsApp', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/lugares/p1')
    const datos = ficha(page)
    await expect(datos).toContainText('Calle 10 # 43E-20')
    await expect(datos).toContainText('Local 102')
    await expect(datos).toContainText('Administradora')
    await expect(datos.locator('.ficha-descripcion')).toHaveText('Abre de lunes a sábado.\nVende al por mayor.')
    await expect(datos.getByRole('link', { name: 'Llamar al 300 123 4567' })).toHaveAttribute('href', 'tel:3001234567')
    await expect(datos.getByRole('link', { name: 'Escribir por WhatsApp al 300 123 4567' })).toHaveAttribute('href', 'https://wa.me/573001234567')
  })

  test('un teléfono fijo se puede llamar pero no tiene WhatsApp', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones[0].contacto_telefono = '(604) 444 5555'
    await entrar()
    await page.goto('/lugares/p1')
    await expect(ficha(page).getByRole('link', { name: /Llamar al/ })).toHaveAttribute('href', 'tel:6044445555')
    await expect(ficha(page).getByRole('link', { name: /WhatsApp/ })).toHaveCount(0)
  })

  test('el histórico dice cuántas evidencias tiene cada estudio', async ({ page, entrar, supabase }) => {
    supabase.db.estudios.push(
      { id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', titulo: 'Primera visita', archivado_en: null },
      { id: 'e2', ubicacion_id: 'p1', fecha: '2026-10-22', hora_inicio: '09:00:00', hora_fin: '10:00:00', titulo: 'Segunda visita', archivado_en: null },
    )
    supabase.db.evidencias.push({ id: 'v1', estudio_id: 'e1', tipo: 'texto', texto: 'a' }, { id: 'v2', estudio_id: 'e1', tipo: 'texto', texto: 'b' })
    await entrar()
    await page.goto('/lugares/p1')
    const historico = page.getByRole('region', { name: /Estudios/ })
    await expect(historico.getByRole('button', { name: /Primera visita/ })).toContainText('2 evidencias')
    await expect(historico.getByRole('button', { name: /Segunda visita/ })).toContainText('Sin evidencias')
  })

  test('editar los datos, incluida la descripción', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/lugares/p1')
    await ficha(page).getByRole('button', { name: 'Editar datos' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Editar lugar' })
    const nombre = dialogo.getByPlaceholder('Ej.: Tienda Don Pepe')
    await expect(nombre).toHaveValue('Café Central')

    await nombre.fill('')
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(dialogo.getByText('Escribe el nombre del lugar.')).toBeVisible()

    await nombre.fill('Café Central 2')
    await dialogo.getByLabel(/Descripción/).fill('Cierra los domingos.')
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Cambios guardados')).toBeVisible()
    expect(supabase.db.ubicaciones[0]).toMatchObject({ nombre: 'Café Central 2', descripcion: 'Cierra los domingos.', actualizado_por: 'u-admin' })
    await expect(ficha(page, 'Café Central 2').locator('.ficha-descripcion')).toHaveText('Cierra los domingos.')
  })

  test('mover el punto con la mira y guardarlo en la nueva posición', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/lugares/p1')
    await ficha(page).getByRole('link', { name: 'Mover' }).click()
    await expect(page).toHaveURL(/\/lugares\/p1\/mover$/)
    await expect(page.getByRole('status')).toHaveText('Mueve el mapa hasta la nueva posición de «Café Central».')

    const caja = (await page.locator('.maplibregl-canvas').boundingBox())!
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2)
    await page.mouse.down()
    await page.mouse.move(caja.x + caja.width / 2 + 40, caja.y + caja.height / 2 + 30, { steps: 6 })
    await page.mouse.up()
    await page.getByRole('button', { name: 'Guardar aquí' }).click()

    await expect(toast(page, 'Punto movido')).toBeVisible()
    await expect(page).toHaveURL(/\/lugares\/p1$/)
    const [lng, lat] = (supabase.db.ubicaciones[0].geom as { coordinates: number[] }).coordinates
    expect(lng).not.toBeCloseTo(POSICION[0], 6)
    expect(lat).not.toBeCloseTo(POSICION[1], 6)
  })

  test('marcar como cerrado y volver a activo', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/lugares/p1')
    await ficha(page).getByRole('button', { name: 'Marcar cerrado' }).click()
    await expect(toast(page, 'Marcado como cerrado')).toBeVisible()
    await expect(ficha(page).locator('.ficha-estado')).toHaveText('Cerrado')
    expect(supabase.db.ubicaciones[0].estado).toBe('cerrada')

    await ficha(page).getByRole('button', { name: 'Marcar activo' }).click()
    await expect(ficha(page).locator('.ficha-estado')).toHaveText('Activo')
    expect(supabase.db.ubicaciones[0].estado).toBe('activa')
  })

  test('archivar lo saca del mapa y "Deshacer" lo devuelve', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/lugares/p1')
    await ficha(page).getByRole('button', { name: 'Archivar' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('button', { name: /Café Central/ })).toHaveCount(0)
    expect(supabase.db.ubicaciones[0].archivada_en).not.toBeNull()

    await toast(page, 'Lugar archivado').getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.getByRole('button', { name: 'Café Central (Café)' })).toBeVisible()
    expect(supabase.db.ubicaciones[0].archivada_en).toBeNull()
  })

  test('un lugar archivado se recupera desde su ficha', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones[0].archivada_en = '2026-10-20T00:00:00Z'
    await entrar()
    await page.goto('/lugares/p1')
    await ficha(page).getByRole('button', { name: 'Recuperar lugar' }).click()
    await expect(toast(page, 'Lugar recuperado')).toBeVisible()
    await expect(ficha(page).getByRole('button', { name: 'Archivar' })).toBeVisible()
    expect(supabase.db.ubicaciones[0].archivada_en).toBeNull()
  })

  test('quien lo creó puede borrar un lugar sin estudios, con confirmación', async ({ page, entrar, supabase }) => {
    await entrar('miembro')
    await page.goto('/lugares/p1')
    await ficha(page).getByRole('button', { name: 'Borrar lugar' }).click()
    const confirmacion = page.getByRole('dialog', { name: '¿Borrar «Café Central»?' })
    await expect(confirmacion).toContainText('No se puede deshacer.')
    await confirmacion.getByRole('button', { name: 'Borrar' }).click()
    await expect(toast(page, 'Lugar borrado')).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    expect(supabase.db.ubicaciones).toHaveLength(0)
  })

  test('no se puede borrar un lugar con estudios ni uno que creó otra persona', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones[0].creado_por = 'u-admin'
    await entrar('miembro')
    await page.goto('/lugares/p1')
    await expect(ficha(page).getByRole('button', { name: 'Archivar' })).toBeVisible()
    await expect(ficha(page).getByRole('button', { name: 'Borrar lugar' })).toHaveCount(0)

    supabase.db.ubicaciones[0].creado_por = 'u-ana'
    supabase.db.estudios.push({ id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', titulo: 'Visita', archivado_en: null })
    await page.reload()
    await expect(ficha(page).getByRole('button', { name: 'Archivar' })).toBeVisible()
    await expect(ficha(page).getByRole('button', { name: 'Borrar lugar' })).toHaveCount(0)
  })

  test('cabe en 320 px', async ({ page, entrar }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await entrar()
    await page.goto('/lugares/p1')
    await expect(ficha(page).getByRole('button', { name: 'Marcar cerrado' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})
