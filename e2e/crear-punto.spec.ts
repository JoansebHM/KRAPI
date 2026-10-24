import { expect, test, toast } from './soporte/fixtures'

// El mapa arranca encuadrando Manila, así que la mira empieza en el centro del barrio.
const CENTRO_MANILA = [-75.57402095, 6.21293365]

test.describe('Crear un punto', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })
  })

  test('el botón "Nuevo lugar" abre la mira y "Cancelar" vuelve al mapa', async ({ page, entrar }) => {
    await entrar()
    await page.getByRole('link', { name: 'Nuevo lugar' }).click()

    await expect(page).toHaveURL(/\/lugares\/nuevo$/)
    await expect(page.getByText('Mueve el mapa hasta que la mira quede sobre el local.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled()

    await page.getByRole('link', { name: 'Cancelar' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Nuevo lugar' })).toBeVisible()
  })

  test('guarda el lugar con sus datos, valida los campos y lo muestra en el mapa', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.getByRole('link', { name: 'Nuevo lugar' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    const formulario = page.getByRole('dialog', { name: 'Nuevo lugar' })
    await formulario.getByRole('button', { name: 'Guardar lugar' }).click()
    await expect(formulario.getByText('Escribe el nombre del lugar.')).toBeVisible()

    await formulario.getByPlaceholder('Ej.: Tienda Don Pepe').fill('  Tienda   Don Pepe ')
    await formulario.getByRole('button', { name: 'Café' }).click()
    await formulario.getByLabel(/^Dirección/).fill('Calle 10 # 43E-20')
    await formulario.getByPlaceholder('Ej.: 300 123 4567').fill('llámame')
    await formulario.getByRole('button', { name: 'Guardar lugar' }).click()
    await expect(formulario.getByText(/Escribe solo números/)).toBeVisible()

    await formulario.getByPlaceholder('Ej.: 300 123 4567').fill('300 123 4567')
    await formulario.getByRole('button', { name: 'Guardar lugar' }).click()

    await expect(toast(page, 'Lugar guardado')).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    expect(supabase.db.ubicaciones).toEqual([
      expect.objectContaining({
        tipo: 'punto',
        nombre: 'Tienda Don Pepe',
        categoria_id: 'c1',
        direccion: 'Calle 10 # 43E-20',
        complemento: null,
        contacto_telefono: '300 123 4567',
      }),
    ])
    const [lng, lat] = (supabase.db.ubicaciones[0].geom as { coordinates: number[] }).coordinates
    expect(Math.abs(lng - CENTRO_MANILA[0])).toBeLessThan(0.001)
    expect(Math.abs(lat - CENTRO_MANILA[1])).toBeLessThan(0.001)

    await expect(page.getByRole('button', { name: 'Tienda Don Pepe (Café)' })).toBeVisible()
    await toast(page, 'Lugar guardado').getByRole('button', { name: 'Ver ficha' }).click()
    await expect(page.getByRole('region', { name: 'Tienda Don Pepe' })).toBeVisible()
  })

  test('fuera de Manila la mira se pone roja y no deja continuar', async ({ page, entrar }) => {
    await entrar()
    await page.getByRole('link', { name: 'Nuevo lugar' }).click()

    // Arrastra el mapa para que la mira quede al sur del barrio.
    const mapa = (await page.locator('.map-view').boundingBox())!
    const x = mapa.x + mapa.width / 2
    const y = mapa.y + mapa.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y - 300, { steps: 10 })
    await page.mouse.up()

    await expect(page.getByText('No se puede registrar fuera de Manila.')).toBeVisible()
    await expect(page.locator('.crear-mira')).toHaveClass(/crear-mira-fuera/)
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  test.describe('con "Mi ubicación" fuera del barrio', () => {
    test.use({ geolocation: { longitude: -75.574, latitude: 6.2195 }, permissions: ['geolocation'] })

    test('avisa y lleva la mira a donde se está', async ({ page, entrar }) => {
      await entrar()
      await page.getByRole('link', { name: 'Nuevo lugar' }).click()
      await page.getByRole('button', { name: 'Mi ubicación' }).click()

      await expect(toast(page, 'Estás fuera de Manila')).toBeVisible()
      await expect(page.getByText('No se puede registrar fuera de Manila.')).toBeVisible()
    })
  })

  test('si hay otro lugar a menos de 15 m pregunta si es el mismo', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones.push({
      id: 'p1',
      tipo: 'punto',
      nombre: 'Tienda vieja',
      categoria_id: 'c1',
      estado: 'cerrada',
      geom: { type: 'Point', coordinates: CENTRO_MANILA },
    })
    await entrar()
    await page.getByRole('link', { name: 'Nuevo lugar' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    const aviso = page.getByRole('dialog', { name: '¿Es alguno de estos lugares?' })
    await expect(aviso.getByRole('link', { name: /Tienda vieja.*cerrado/ })).toBeVisible()

    // "No, es un lugar nuevo" sigue con el formulario.
    await aviso.getByRole('button', { name: 'No, es un lugar nuevo' }).click()
    await expect(page.getByRole('dialog', { name: 'Nuevo lugar' })).toBeVisible()

    // Desde el formulario se puede volver a ubicar y elegir el lugar existente.
    await page.getByRole('button', { name: 'Volver a ubicar' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('link', { name: /Tienda vieja/ }).click()
    await expect(page).toHaveURL(/\/lugares\/p1$/)
    expect(supabase.db.ubicaciones).toHaveLength(1)
  })
})
