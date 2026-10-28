import type { Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

// El mapa arranca encuadrando Manila, así que la mira empieza en el centro del barrio.
const CENTRO_MANILA = [-75.57402095, 6.21293365]
const punto = (lng: number, lat: number) => ({ type: 'Point', coordinates: [lng, lat] })
const PDF = { name: 'informe.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 informe') }

test.describe('Elementos', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.categorias.push(
      { id: 'c-cafe', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' },
      { id: 'c-caneca', nombre: 'Caneca', color: '#16A34A', icono: 'lugar', aplica_a: 'elementos' },
      { id: 'c-poste', nombre: 'Poste', color: '#EA580C', icono: 'lugar', aplica_a: 'elementos' },
      { id: 'c-parqueadero', nombre: 'Parqueadero', color: '#0478FB', icono: 'lugar', aplica_a: 'ambos' },
    )
  })

  /** Abre la mira de "Nuevo lugar → Elemento" y continúa hasta el formulario. */
  async function abrirFormulario(page: Page) {
    await page.getByRole('button', { name: 'Nuevo lugar' }).click()
    await page.getByRole('link', { name: /Elemento/ }).click()
    await expect(page).toHaveURL(/\/elementos\/nuevo$/)
    await expect(page.getByText('Mueve el mapa hasta que la mira quede sobre el elemento.')).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    return page.getByRole('dialog', { name: 'Nuevo elemento' })
  }

  test('se crea con nombre y categoría, se dibuja como una gota y abre su ficha', async ({ page, entrar, supabase }) => {
    await entrar()
    const formulario = await abrirFormulario(page)

    // Solo se ofrecen las categorías de elementos (y las de ambos).
    await expect(formulario.getByRole('button', { name: 'Caneca' })).toBeVisible()
    await expect(formulario.getByRole('button', { name: 'Parqueadero' })).toBeVisible()
    await expect(formulario.getByRole('button', { name: 'Café' })).toHaveCount(0)
    // Un elemento no tiene dirección ni contacto.
    await expect(formulario.getByLabel(/Dirección/)).toHaveCount(0)

    await formulario.getByRole('button', { name: 'Guardar elemento' }).click()
    await expect(formulario.getByText('Escribe el nombre del elemento.')).toBeVisible()

    await formulario.getByLabel('Nombre').fill('  Caneca   de la esquina ')
    await formulario.getByRole('button', { name: 'Caneca' }).click()
    await formulario.getByRole('button', { name: 'Guardar elemento' }).click()

    await expect(toast(page, 'Elemento guardado')).toBeVisible()
    const [elemento] = supabase.db.ubicaciones
    expect(elemento).toEqual(expect.objectContaining({ tipo: 'elemento', nombre: 'Caneca de la esquina', categoria_id: 'c-caneca', descripcion: null }))
    expect(elemento).not.toHaveProperty('direccion')
    const [lng, lat] = (elemento.geom as { coordinates: number[] }).coordinates
    expect(Math.abs(lng - CENTRO_MANILA[0])).toBeLessThan(0.001)
    expect(Math.abs(lat - CENTRO_MANILA[1])).toBeLessThan(0.001)

    // Se abre su ficha, para agregarle las evidencias. No tiene estudios.
    await expect(page).toHaveURL(new RegExp(`/lugares/${elemento.id}$`))
    const ficha = page.getByRole('region', { name: 'Caneca de la esquina' })
    await expect(ficha).toBeVisible()
    await expect(ficha.getByText('Elemento · Caneca')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agregar evidencia' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agregar estudio' })).toHaveCount(0)
    await expect(ficha.getByText('Aún no hay evidencias')).toBeVisible()

    // En el mapa es una gota, distinta del círculo de los locales.
    const marcador = page.getByRole('button', { name: 'Caneca de la esquina (elemento, Caneca)' })
    await expect(marcador).toHaveClass(/marcador-elemento/)
    const forma = await marcador.locator('.icono-categoria').evaluate((icono) => getComputedStyle(icono).borderBottomLeftRadius)
    expect(forma).toBe('0px')
  })

  test('avisa si ya hay uno de la misma categoría a menos de 3 m', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones.push({ id: 'x1', tipo: 'elemento', nombre: 'Caneca vieja', categoria_id: 'c-caneca', estado: 'activa', geom: punto(CENTRO_MANILA[0], CENTRO_MANILA[1]) })
    await entrar()
    const formulario = await abrirFormulario(page)
    await formulario.getByLabel('Nombre').fill('Otra caneca')
    await formulario.getByRole('button', { name: 'Caneca' }).click()
    await formulario.getByRole('button', { name: 'Guardar elemento' }).click()

    const aviso = page.getByRole('dialog', { name: '¿Es alguno de estos elementos?' })
    await expect(aviso.getByRole('link', { name: /Caneca vieja/ })).toBeVisible()
    await aviso.getByRole('button', { name: 'No, es otro' }).click()

    await expect(toast(page, 'Elemento guardado')).toBeVisible()
    expect(supabase.db.ubicaciones.map((u) => u.nombre)).toEqual(['Caneca vieja', 'Otra caneca'])
  })

  test('un poste junto a una caneca no es un duplicado', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones.push({ id: 'x1', tipo: 'elemento', nombre: 'Caneca vieja', categoria_id: 'c-caneca', estado: 'activa', geom: punto(CENTRO_MANILA[0], CENTRO_MANILA[1]) })
    await entrar()
    const formulario = await abrirFormulario(page)
    await formulario.getByLabel('Nombre').fill('Poste de luz')
    await formulario.getByRole('button', { name: 'Poste' }).click()
    await formulario.getByRole('button', { name: 'Guardar elemento' }).click()

    await expect(toast(page, 'Elemento guardado')).toBeVisible()
    await expect(page.getByRole('dialog', { name: '¿Es alguno de estos elementos?' })).toHaveCount(0)
  })

  test.describe('Ficha', () => {
    test.beforeEach(async ({ supabase }) => {
      supabase.db.ubicaciones.push({
        id: 'x1',
        tipo: 'elemento',
        nombre: 'Caneca de la esquina',
        categoria_id: 'c-caneca',
        descripcion: 'La recogen los martes.',
        estado: 'activa',
        geom: punto(-75.574, 6.213),
        creado_por: 'u-admin',
      })
    })

    test('sus evidencias cuelgan del elemento y las fotos se ven en el carrusel', async ({ page, entrar, supabase }) => {
      await entrar()
      await page.getByRole('button', { name: 'Caneca de la esquina (elemento, Caneca)' }).click()
      await expect(page).toHaveURL(/\/lugares\/x1$/)
      await expect(page.getByText('La recogen los martes.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Marcar cerrado' })).toHaveCount(0)

      await page.getByRole('button', { name: 'Agregar evidencia' }).click()
      const dialogo = page.getByRole('dialog', { name: 'Agregar evidencia' })
      await dialogo.locator('input[type="file"][multiple]').setInputFiles([PDF, { name: 'caneca.png', mimeType: 'image/png', buffer: PNG }])

      const lista = page.getByRole('region', { name: /Evidencias/ })
      await expect(lista).toContainText('Evidencias · 2')
      await expect(lista.getByRole('link', { name: /informe\.pdf/ })).toHaveAttribute('href', /\/storage\/v1\/object\/sign\/evidencias\/elementos\/x1\//)
      expect(supabase.db.evidencias).toEqual([
        expect.objectContaining({ ubicacion_id: 'x1', tipo: 'documento' }),
        expect.objectContaining({ ubicacion_id: 'x1', tipo: 'foto' }),
      ])
      expect(supabase.db.evidencias.every((evidencia) => evidencia.estudio_id === undefined)).toBe(true)
      expect(String(supabase.db.evidencias[0].archivo_path)).toMatch(/^elementos\/x1\/[0-9a-f-]{36}-informe\.pdf$/)

      await expect(page.getByLabel('Fotos').locator('img')).toHaveAttribute('alt', 'caneca.png')
    })

    test('se edita y se mueve; con evidencias no se borra, sin ellas sí', async ({ page, entrar, supabase }) => {
      supabase.db.evidencias.push({ id: 'ev1', ubicacion_id: 'x1', tipo: 'documento', archivo_path: 'elementos/x1/a-informe.pdf', archivo_nombre: 'informe.pdf', archivo_mime: 'application/pdf', archivo_bytes: 100, proveedor: 'supabase', creado_por: 'u-admin' })
      supabase.archivos.set('elementos/x1/a-informe.pdf', { tipo: 'application/pdf', bytes: 100, dueno: 'u-admin' })
      await entrar()
      await page.goto('/lugares/x1')

      await page.getByRole('button', { name: 'Editar datos' }).click()
      const editar = page.getByRole('dialog', { name: 'Editar elemento' })
      await editar.getByLabel('Nombre').fill('Caneca grande')
      await editar.getByRole('button', { name: 'Guardar cambios' }).click()
      await expect(toast(page, 'Cambios guardados')).toBeVisible()
      expect(supabase.db.ubicaciones[0]).toEqual(expect.objectContaining({ nombre: 'Caneca grande', descripcion: 'La recogen los martes.' }))

      await expect(page.getByRole('link', { name: 'Mover' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Borrar elemento' })).toHaveCount(0)

      await page.getByRole('button', { name: 'Borrar «informe.pdf»' }).click()
      await page.getByRole('dialog', { name: '¿Borrar esta evidencia?' }).getByRole('button', { name: 'Borrar' }).click()
      await expect(toast(page, 'Evidencia borrada')).toBeVisible()

      await page.getByRole('button', { name: 'Borrar elemento' }).click()
      await page.getByRole('dialog', { name: '¿Borrar «Caneca grande»?' }).getByRole('button', { name: 'Borrar' }).click()
      await expect(toast(page, 'Elemento borrado')).toBeVisible()
      expect(supabase.db.ubicaciones).toEqual([])
    })
  })

  test('los filtros: se pueden ocultar, la categoría los filtra y los filtros de estudios no', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones.push(
      { id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: 'c-cafe', estado: 'activa', geom: punto(-75.576, 6.214) },
      { id: 'x1', tipo: 'elemento', nombre: 'Caneca', categoria_id: 'c-caneca', estado: 'activa', geom: punto(-75.574, 6.213) },
      { id: 'x2', tipo: 'elemento', nombre: 'Poste', categoria_id: 'c-poste', estado: 'activa', geom: punto(-75.573, 6.212) },
    )
    supabase.db.estudios.push({ id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-05', hora_inicio: '08:00:00', hora_fin: '09:00:00', archivado_en: null })
    await entrar()
    const caneca = page.getByRole('button', { name: 'Caneca (elemento, Caneca)' })
    const poste = page.getByRole('button', { name: 'Poste (elemento, Poste)' })
    const cafe = page.getByRole('button', { name: 'Café Central (Café)' })
    await expect(caneca).toBeVisible()

    await page.locator('.boton-filtros').click()
    const panel = page.getByRole('dialog', { name: 'Filtros' })

    // Un filtro de los estudios oculta el café (su estudio no cumple), pero no los elementos.
    await panel.getByLabel('Desde').first().fill('2026-10-10')
    await expect(cafe).toBeHidden()
    await expect(caneca).toBeVisible()
    await expect(poste).toBeVisible()

    // La categoría sí los filtra.
    await panel.getByRole('button', { name: 'Caneca' }).click()
    await expect(poste).toBeHidden()
    await expect(caneca).toBeVisible()

    // Y se pueden ocultar todos.
    await panel.getByRole('button', { name: 'Mostrar elementos' }).click()
    await expect(panel.getByRole('button', { name: 'Mostrar elementos' })).toHaveAttribute('aria-pressed', 'false')
    await expect(caneca).toBeHidden()
  })

  test('una categoría se crea para los elementos', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/categorias')
    await expect(page.getByRole('button', { name: /Caneca.*Elementos/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Café.*Lugares/ })).toBeVisible()

    await page.getByRole('button', { name: 'Nueva categoría' }).click()
    const formulario = page.getByRole('dialog', { name: 'Nueva categoría' })
    await formulario.getByLabel('Nombre').fill('Árbol')
    await expect(formulario.getByRole('button', { name: 'Lugares', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await formulario.getByRole('button', { name: 'Elementos', exact: true }).click()
    await formulario.getByRole('button', { name: 'Crear categoría' }).click()

    await expect(toast(page, 'Categoría creada')).toContainText('ya se puede usar en los elementos')
    expect(supabase.db.categorias.find((c) => c.nombre === 'Árbol')).toEqual(expect.objectContaining({ aplica_a: 'elementos' }))
  })
})

/** Una imagen PNG de 1 × 1 píxel. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
