import type { Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

const CENTRO = [-75.57402, 6.21293]
// Una manzana de unos 60 × 60 m alrededor del centro de Manila.
const MANZANA = [
  [CENTRO[0] - 0.0003, CENTRO[1] - 0.0003],
  [CENTRO[0] + 0.0003, CENTRO[1] - 0.0003],
  [CENTRO[0] + 0.0003, CENTRO[1] + 0.0003],
  [CENTRO[0] - 0.0003, CENTRO[1] + 0.0003],
  [CENTRO[0] - 0.0003, CENTRO[1] - 0.0003],
]

/** Arrastra el mapa: la mira queda sobre otro punto. */
async function moverMapa(page: Page, dx: number, dy: number) {
  const caja = (await page.locator('.maplibregl-canvas').boundingBox())!
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 3]
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 6 })
  await page.mouse.up()
}

async function dibujarTriangulo(page: Page) {
  const agregar = page.getByRole('button', { name: 'Agregar esquina' })
  await agregar.click()
  await moverMapa(page, -80, 0)
  await agregar.click()
  await moverMapa(page, 0, -80)
  await agregar.click()
  await expect(page.getByRole('status')).toContainText('3 esquinas ·')
}

test.describe('Zonas', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.tipos_zona.push({ id: 't1', nombre: 'Comercial', color: '#0478FB' }, { id: 't2', nombre: 'Residencial', color: '#16A34A' })
  })

  test('"+ Nuevo lugar" pregunta si es un punto o una zona', async ({ page, entrar }) => {
    await entrar()
    await page.getByRole('button', { name: 'Nuevo lugar' }).click()
    const eleccion = page.getByRole('dialog', { name: '¿Qué vas a registrar?' })
    await expect(eleccion.getByRole('link', { name: /Punto/ })).toHaveAttribute('href', '/lugares/nuevo')
    await eleccion.getByRole('link', { name: /Zona/ }).click()
    await expect(page).toHaveURL(/\/zonas\/nueva$/)
    await expect(page.getByRole('status')).toHaveText('Mueve el mapa y agrega la primera esquina.')
  })

  test('se dibuja con la mira, se llenan sus datos y queda con su tipo', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/zonas/nueva')
    const terminar = page.getByRole('button', { name: 'Terminar' })
    await expect(terminar).toBeDisabled()
    await dibujarTriangulo(page)

    // "Deshacer" quita la última esquina.
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.getByRole('status')).toHaveText('2 esquinas')
    await expect(terminar).toBeDisabled()
    await page.getByRole('button', { name: 'Agregar esquina' }).click()
    await terminar.click()

    const formulario = page.getByRole('dialog', { name: 'Nueva zona' })
    await formulario.getByPlaceholder('Ej.: Manzana del parque').fill('Cuadra de los cafés')
    await formulario.getByRole('button', { name: 'Comercial' }).click()
    await formulario.getByLabel(/Descripción/).fill('Locales a ambos lados.')
    await formulario.getByRole('button', { name: 'Guardar zona' }).click()

    await expect(toast(page, 'Zona guardada')).toBeVisible()
    const zona = supabase.db.ubicaciones.find((u) => u.nombre === 'Cuadra de los cafés')!
    expect(zona).toMatchObject({ tipo: 'zona', tipo_zona_id: 't1', descripcion: 'Locales a ambos lados.' })
    expect((zona.geom as { type: string; coordinates: number[][][] }).coordinates[0]).toHaveLength(4)
    await expect(page).toHaveURL(new RegExp(`/lugares/${zona.id}$`))
    const ficha = page.getByRole('region', { name: 'Cuadra de los cafés' })
    await expect(ficha.getByText('Zona · Comercial')).toBeVisible()
    await expect(ficha.locator('.ficha-datos')).toContainText(/Área\s*[\d.,]+ (m²|ha)/)
  })

  test.describe('con una zona registrada', () => {
    test.beforeEach(async ({ supabase }) => {
      supabase.db.ubicaciones.push(
        { id: 'z1', tipo: 'zona', nombre: 'Manzana del parque', tipo_zona_id: 't2', estado: 'activa', archivada_en: null, creado_por: 'u-admin', geom: { type: 'Polygon', coordinates: [MANZANA] } },
        { id: 'p1', tipo: 'punto', nombre: 'Tienda adentro', categoria_id: null, estado: 'activa', archivada_en: null, geom: { type: 'Point', coordinates: CENTRO } },
        { id: 'p2', tipo: 'punto', nombre: 'Tienda afuera', categoria_id: null, estado: 'activa', archivada_en: null, geom: { type: 'Point', coordinates: [CENTRO[0] + 0.002, CENTRO[1]] } },
      )
      supabase.db.estudios.push({ id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-28', hora_inicio: '09:00:00', hora_fin: '10:00:00', archivado_en: null })
    })

    test('la ficha muestra los locales de adentro y lleva a la ficha de cada uno', async ({ page, entrar }) => {
      await entrar()
      await page.goto('/lugares/z1')
      const locales = page.getByRole('region', { name: /Locales en la zona/ })
      await expect(locales.getByRole('listitem')).toHaveCount(1)
      await expect(locales).toContainText('Tienda adentro')
      await expect(locales).toContainText('Último estudio: 28 oct 2026')
      await locales.getByRole('link', { name: 'Ver la ficha de Tienda adentro' }).click()
      await expect(page).toHaveURL(/\/lugares\/p1$/)
    })

    test('se comenta, y solo quien escribió el comentario (o un admin) lo borra', async ({ page, entrar, supabase }) => {
      supabase.db.comentarios_zona.push({ id: 'c1', ubicacion_id: 'z1', texto: 'Comentario del admin.', creado_por: 'u-admin', created_at: '2026-10-20T15:00:00Z' })
      await entrar('miembro')
      await page.goto('/lugares/z1')
      const comentarios = page.getByRole('region', { name: /Comentarios/ })
      await comentarios.getByLabel('Nuevo comentario').fill('Hay mucho comercio informal en las tardes.')
      await comentarios.getByRole('button', { name: 'Comentar' }).click()

      const mio = comentarios.getByRole('listitem').filter({ hasText: 'comercio informal' })
      await expect(mio).toContainText('Ana Gómez')
      await expect(comentarios.getByRole('listitem').filter({ hasText: 'Comentario del admin.' }).getByRole('button', { name: 'Borrar comentario' })).toHaveCount(0)

      await mio.getByRole('button', { name: 'Borrar comentario' }).click()
      await page.getByRole('dialog', { name: '¿Borrar este comentario?' }).getByRole('button', { name: 'Borrar' }).click()
      await expect(toast(page, 'Comentario borrado')).toBeVisible()
      expect(supabase.db.comentarios_zona.map((c) => c.id)).toEqual(['c1'])
    })

    test('el estudio de una zona no pregunta a quién se entrevistó', async ({ page, entrar }) => {
      await entrar()
      await page.goto('/lugares/z1')
      await page.getByRole('button', { name: 'Agregar estudio' }).click()
      const formulario = page.getByRole('dialog', { name: 'Nuevo estudio' })
      await expect(formulario.getByText('Participantes')).toBeVisible()
      await expect(formulario.getByText('A quién se entrevistó')).toHaveCount(0)
    })

    test('se editan sus datos y se redibuja su forma', async ({ page, entrar, supabase }) => {
      await entrar()
      await page.goto('/lugares/z1')
      const ficha = page.getByRole('region', { name: 'Manzana del parque' })
      await expect(ficha.getByRole('button', { name: /Marcar/ })).toHaveCount(0)
      await ficha.getByRole('button', { name: 'Editar datos' }).click()
      const formulario = page.getByRole('dialog', { name: 'Editar zona' })
      await formulario.getByRole('button', { name: 'Sin tipo' }).click()
      await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
      await expect(toast(page, 'Cambios guardados')).toBeVisible()
      expect(supabase.db.ubicaciones[0].tipo_zona_id).toBeNull()

      await page.getByRole('region', { name: 'Manzana del parque' }).getByRole('link', { name: 'Redibujar' }).click()
      await expect(page).toHaveURL(/\/lugares\/z1\/redibujar$/)
      await dibujarTriangulo(page)
      await page.getByRole('button', { name: 'Guardar forma' }).click()
      await expect(toast(page, 'Forma guardada')).toBeVisible()
      expect((supabase.db.ubicaciones[0].geom as { coordinates: number[][][] }).coordinates[0]).toHaveLength(4)
    })
  })

  test('los tipos de zona se administran desde el menú', async ({ page, entrar, supabase }) => {
    await entrar('miembro')
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: 'Tipos de zona' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Tipos de zona' })).toBeVisible()
    await page.getByRole('button', { name: 'Nuevo tipo' }).click()
    const formulario = page.getByRole('dialog', { name: 'Nuevo tipo de zona' })
    await formulario.getByPlaceholder('Ej.: Comercial, Residencial').fill('Bodegas')
    await formulario.getByRole('button', { name: 'Crear tipo' }).click()
    await expect(toast(page, 'Tipo de zona creado')).toBeVisible()
    expect(supabase.db.tipos_zona.map((t) => t.nombre)).toContain('Bodegas')

    // Un miembro no ve "Eliminar tipo".
    await page.locator('.lista-item', { hasText: 'Bodegas' }).click()
    await expect(page.getByRole('dialog', { name: 'Editar tipo de zona' }).getByRole('button', { name: 'Eliminar tipo' })).toHaveCount(0)
  })
})
