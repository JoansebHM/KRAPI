import type { Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

/** Una imagen PNG de 1 × 1 píxel, para los bocetos que prepara cada prueba. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

/** Abre la pizarra y activa el lápiz. */
async function abrirConLapiz(page: Page) {
  await page.goto('/pizarra')
  await page.getByRole('button', { name: 'Lápiz' }).click()
}

/** Dibuja con el lápiz una línea de izquierda a derecha en la mitad del mapa. */
async function dibujarLinea(page: Page, { desdeX = 60, hastaX = 300, y = 0.4 } = {}) {
  const caja = (await page.getByTestId('pizarra-lienzo').boundingBox())!
  const alto = caja.y + caja.height * y
  await page.mouse.move(caja.x + desdeX, alto)
  await page.mouse.down()
  await page.mouse.move(caja.x + (desdeX + hastaX) / 2, alto + 30, { steps: 8 })
  await page.mouse.move(caja.x + hastaX, alto, { steps: 8 })
  await page.mouse.up()
}

test.describe('Pizarra', () => {
  test('está en el menú, junto a Bocetos', async ({ page, entrar }) => {
    await entrar()
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    const menu = page.getByRole('navigation', { name: 'Secciones' })
    await expect(menu.getByRole('link', { name: 'Pizarra' })).toBeVisible()
    await menu.getByRole('link', { name: 'Bocetos' }).click()
    await expect(page).toHaveURL(/\/bocetos$/)
  })

  test('empieza con la mano: no dibuja hasta activar el lápiz, y Guardar espera un trazo', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/pizarra')
    await expect(page.getByRole('button', { name: 'Mano' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Lápiz' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('pizarra-lienzo')).toHaveCSS('pointer-events', 'none')
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled()

    // Con la mano, arrastrar mueve el mapa y no deja trazos.
    const caja = (await page.locator('.maplibregl-canvas').boundingBox())!
    await page.mouse.move(caja.x + 100, caja.y + 200)
    await page.mouse.down()
    await page.mouse.move(caja.x + 200, caja.y + 250, { steps: 5 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled()

    await page.getByRole('button', { name: 'Lápiz' }).click()
    await expect(page.getByTestId('pizarra-lienzo')).toHaveCSS('pointer-events', 'auto')
    await expect(page.getByTestId('pizarra-lienzo')).toHaveCSS('touch-action', 'none')
    await dibujarLinea(page)
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled()
  })

  test('dibuja, guarda el pantallazo con los trazos y lo deja en el registro', async ({ page, entrar, supabase }) => {
    await entrar()
    await abrirConLapiz(page)
    await page.getByRole('button', { name: 'Color rojo' }).click()
    await page.getByRole('button', { name: 'Trazo grueso' }).click()
    await dibujarLinea(page)
    await page.getByRole('button', { name: 'Color azul' }).click()
    await page.getByRole('button', { name: 'Trazo fino' }).click()
    await dibujarLinea(page, { y: 0.6 })

    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    const dialogo = page.getByRole('dialog', { name: 'Guardar boceto' })
    await dialogo.getByRole('button', { name: 'Guardar boceto' }).click()
    await expect(dialogo.getByText('Escribe un título.')).toBeVisible()
    await dialogo.getByLabel('Título').fill('  Ruta del   bus 133 ')
    await dialogo.getByLabel(/Descripción/).fill('Pasa por la 10.')
    await dialogo.getByRole('button', { name: 'Guardar boceto' }).click()

    await expect(toast(page, 'Boceto guardado')).toBeVisible()
    await expect(page).toHaveURL(/\/bocetos$/)
    await expect(page.getByRole('button', { name: /Ruta del bus 133/ })).toContainText('Admin Kratos')

    // La fila guarda los trazos con sus coordenadas reales y sus colores.
    const [boceto] = supabase.db.bocetos
    expect(boceto).toEqual(
      expect.objectContaining({ titulo: 'Ruta del bus 133', descripcion: 'Pasa por la 10.', creado_por: 'u-admin' }),
    )
    const trazos = boceto.trazos as { type: string; features: { properties: { color: string; grosor: number }; geometry: { type: string; coordinates: number[][] } }[] }
    expect(trazos.type).toBe('FeatureCollection')
    expect(trazos.features.map((f) => f.properties)).toEqual([
      { color: '#E5484D', grosor: 8 },
      { color: '#0478FB', grosor: 4 },
    ])
    for (const { geometry } of trazos.features) {
      expect(geometry.type).toBe('LineString')
      // Coordenadas reales (lng, lat) de Manila, simplificadas: pocos puntos y no cientos.
      expect(geometry.coordinates.length).toBeGreaterThanOrEqual(2)
      expect(geometry.coordinates.length).toBeLessThan(30)
      const [lng, lat] = geometry.coordinates[0]
      expect(Math.abs(lng - -75.574)).toBeLessThan(0.01)
      expect(Math.abs(lat - 6.213)).toBeLessThan(0.01)
    }

    // La imagen y la miniatura van al bucket, en bocetos/<id>/.
    expect(boceto.imagen_path).toBe(`bocetos/${boceto.id}/imagen.png`)
    expect(boceto.miniatura_path).toBe(`bocetos/${boceto.id}/miniatura.jpg`)
    expect(supabase.archivos.get(String(boceto.imagen_path))).toEqual(expect.objectContaining({ tipo: 'image/png', dueno: 'u-admin' }))
    expect(supabase.archivos.get(String(boceto.miniatura_path))).toEqual(expect.objectContaining({ tipo: 'image/jpeg' }))
    expect(Number(boceto.ancho)).toBeGreaterThan(0)
    expect(Number(boceto.alto)).toBeGreaterThan(0)

    // El pantallazo tiene los trazos dibujados: se buscan píxeles rojos y azules en la imagen.
    const imagen = supabase.archivos.get(String(boceto.imagen_path))!.contenido!.toString('base64')
    const colores = await page.evaluate(async (base64) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
      const lienzo = document.createElement('canvas')
      lienzo.width = bitmap.width
      lienzo.height = bitmap.height
      const contexto = lienzo.getContext('2d')!
      contexto.drawImage(bitmap, 0, 0)
      const { data } = contexto.getImageData(0, 0, bitmap.width, bitmap.height)
      let rojos = 0
      let azules = 0
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
        if (r > 200 && g < 110 && b < 110) rojos++
        if (b > 220 && r < 40 && g > 90 && g < 150) azules++
      }
      return { rojos, azules }
    }, imagen)
    expect(colores.rojos).toBeGreaterThan(200)
    expect(colores.azules).toBeGreaterThan(100)
  })

  test('deshacer quita el último trazo y borrar todo pide confirmación', async ({ page, entrar }) => {
    await entrar()
    await abrirConLapiz(page)
    await dibujarLinea(page)
    await dibujarLinea(page, { y: 0.6 })

    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.getByRole('button', { name: 'Deshacer' })).toBeEnabled()
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled()

    await dibujarLinea(page)
    await page.getByRole('button', { name: 'Borrar todo' }).click()
    const confirmar = page.getByRole('dialog', { name: '¿Borrar todo el dibujo?' })
    await confirmar.getByRole('button', { name: 'Seguir dibujando' }).click()
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Borrar todo' }).click()
    await confirmar.getByRole('button', { name: 'Borrar todo' }).click()
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled()
  })

  test('cancelar sin dibujar vuelve al mapa y con trazos pide confirmación', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/pizarra')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page).toHaveURL(/\/$/)

    await abrirConLapiz(page)
    await dibujarLinea(page)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    const confirmar = page.getByRole('dialog', { name: '¿Descartar el dibujo?' })
    await confirmar.getByRole('button', { name: 'Seguir dibujando' }).click()
    await expect(page).toHaveURL(/\/pizarra$/)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await confirmar.getByRole('button', { name: 'Descartar' }).click()
    await expect(page).toHaveURL(/\/$/)
    expect(supabase.db.bocetos).toEqual([])
  })

  test('si falla la subida no se guarda nada y se puede reintentar', async ({ page, entrar, supabase }) => {
    await entrar()
    await abrirConLapiz(page)
    await dibujarLinea(page)
    supabase.fallarSubidas = true
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    const dialogo = page.getByRole('dialog', { name: 'Guardar boceto' })
    await dialogo.getByLabel('Título').fill('Con error')
    await dialogo.getByRole('button', { name: 'Guardar boceto' }).click()

    await expect(toast(page, 'No se pudo guardar el boceto')).toBeVisible()
    await expect(page).toHaveURL(/\/pizarra$/)
    expect(supabase.db.bocetos).toEqual([])
    expect(supabase.archivos.size).toBe(0)

    supabase.fallarSubidas = false
    await dialogo.getByRole('button', { name: 'Guardar boceto' }).click()
    await expect(toast(page, 'Boceto guardado')).toBeVisible()
    expect(supabase.db.bocetos).toHaveLength(1)
  })

  test('los marcadores de los lugares no estorban en la pizarra', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: null, estado: 'activa', geom: { type: 'Point', coordinates: [-75.574, 6.2129] } })
    await entrar()
    await expect(page.getByRole('button', { name: /Café Central/ })).toBeVisible()
    await page.goto('/pizarra')
    // Son HTML y no saldrían en la captura del mapa: se ocultan, para que lo que se ve sea lo que se guarda.
    await expect(page.getByRole('button', { name: /Café Central/ })).toBeHidden()
  })
})

test.describe('Bocetos', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.bocetos.push(
      {
        id: 'b1', titulo: 'Ruta del bus 133', descripcion: 'Pasa cada 15 minutos.', trazos: { type: 'FeatureCollection', features: [] },
        imagen_path: 'bocetos/b1/imagen.png', miniatura_path: 'bocetos/b1/miniatura.jpg', ancho: 780, alto: 1200,
        created_at: '2026-10-28T15:00:00Z', creado_por: 'u-ana',
      },
      {
        id: 'b2', titulo: 'Flujo de personas', descripcion: null, trazos: { type: 'FeatureCollection', features: [] },
        imagen_path: 'bocetos/b2/imagen.png', miniatura_path: 'bocetos/b2/miniatura.jpg', ancho: 780, alto: 1200,
        created_at: '2026-10-27T15:00:00Z', creado_por: 'u-admin',
      },
    )
    for (const ruta of ['bocetos/b1/imagen.png', 'bocetos/b2/imagen.png']) supabase.archivos.set(ruta, { tipo: 'image/png', bytes: PNG.length, contenido: PNG, dueno: ruta.includes('b1') ? 'u-ana' : 'u-admin' })
    for (const ruta of ['bocetos/b1/miniatura.jpg', 'bocetos/b2/miniatura.jpg']) supabase.archivos.set(ruta, { tipo: 'image/jpeg', bytes: PNG.length, contenido: PNG })
  })

  test('la lista va del más reciente al más antiguo, con miniatura, autor y fecha', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/bocetos')
    const filas = page.locator('.boceto-item')
    await expect(filas).toHaveCount(2)
    await expect(filas.nth(0)).toContainText('Ruta del bus 133')
    await expect(filas.nth(0)).toContainText('Ana Gómez · 28 oct 2026')
    await expect(filas.nth(0).locator('img')).toHaveAttribute('src', /\/storage\/v1\/object\/sign\/evidencias\/bocetos\/b1\/miniatura\.jpg/)
    await expect(filas.nth(1)).toContainText('Flujo de personas')
    await expect(page.getByText('2 bocetos')).toBeVisible()
  })

  test('al tocar uno se ve en grande, con su descripción y para descargarlo', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/bocetos')
    await page.getByRole('button', { name: /Ruta del bus 133/ }).click()
    const visor = page.getByRole('dialog', { name: 'Ruta del bus 133' })
    await expect(visor.getByRole('img', { name: 'Boceto «Ruta del bus 133»' })).toHaveAttribute('src', /bocetos\/b1\/imagen\.png/)
    await expect(visor).toContainText('Pasa cada 15 minutos.')
    await expect(visor).toContainText('Ana Gómez · 28 oct 2026')
    await expect(visor.getByRole('link', { name: 'Descargar boceto' })).toHaveAttribute('href', /download=Ruta%20del%20bus%20133\.png/)
    await page.keyboard.press('Escape')
    await expect(visor).toBeHidden()
  })

  test('un admin borra cualquier boceto y se borran también sus imágenes', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/bocetos')
    await page.getByRole('button', { name: /Ruta del bus 133/ }).click()
    await page.getByRole('button', { name: 'Borrar boceto' }).click()
    const confirmar = page.getByRole('dialog', { name: '¿Borrar «Ruta del bus 133»?' })
    await confirmar.getByRole('button', { name: 'Borrar', exact: true }).click()

    await expect(toast(page, 'Boceto borrado')).toBeVisible()
    expect(supabase.db.bocetos.map((b) => b.id)).toEqual(['b2'])
    expect(supabase.archivos.has('bocetos/b1/imagen.png')).toBe(false)
    expect(supabase.archivos.has('bocetos/b1/miniatura.jpg')).toBe(false)
    expect(supabase.archivos.has('bocetos/b2/imagen.png')).toBe(true)
  })

  test('un miembro solo borra los suyos', async ({ page, entrar }) => {
    await entrar('miembro')
    await page.goto('/bocetos')
    await page.getByRole('button', { name: /Flujo de personas/ }).click()
    await expect(page.getByRole('dialog', { name: 'Flujo de personas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Borrar boceto' })).toHaveCount(0)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /Ruta del bus 133/ }).click()
    await expect(page.getByRole('button', { name: 'Borrar boceto' })).toBeVisible()
  })

  test('sin bocetos invita a dibujar el primero', async ({ page, entrar, supabase }) => {
    supabase.db.bocetos.length = 0
    await entrar()
    await page.goto('/bocetos')
    await expect(page.getByText('Aún no hay bocetos')).toBeVisible()
    await page.getByRole('link', { name: 'Dibujar el primero' }).click()
    await expect(page).toHaveURL(/\/pizarra$/)
  })
})
