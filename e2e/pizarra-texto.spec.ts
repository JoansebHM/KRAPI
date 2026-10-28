import type { Locator, Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

interface Feature {
  properties: Record<string, unknown>
  geometry: { type: string; coordinates: number[] | number[][] }
}

const lienzoDelMapa = (page: Page) => page.locator('.maplibregl-canvas')
const texto = (page: Page, contenido: string) => page.getByRole('button', { name: `Texto «${contenido}»` })

/** Abre la pizarra con la herramienta Texto. */
async function abrirConTexto(page: Page) {
  await page.goto('/pizarra')
  await page.getByRole('button', { name: 'Texto', exact: true }).click()
}

/** Toca el mapa en (x, y), medido desde su esquina, escribe el texto y lo agrega. Devuelve el punto tocado en la página. */
async function ponerTexto(page: Page, contenido: string, x = 195, y = 300) {
  const caja = (await lienzoDelMapa(page).boundingBox())!
  await page.mouse.click(caja.x + x, caja.y + y)
  const dialogo = page.getByRole('dialog', { name: 'Nuevo texto' })
  await dialogo.getByLabel('Texto').fill(contenido)
  await dialogo.getByRole('button', { name: 'Agregar texto' }).click()
  await expect(dialogo).toBeHidden()
  return { x: caja.x + x, y: caja.y + y }
}

/** Centro de un elemento en la página (el de un elemento girado es el mismo que sin girar). */
async function centro(elemento: Locator) {
  const caja = (await elemento.boundingBox())!
  return { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 }
}

async function arrastrar(page: Page, desde: { x: number; y: number }, hasta: { x: number; y: number }) {
  await page.mouse.move(desde.x, desde.y)
  await page.mouse.down()
  await page.mouse.move(hasta.x, hasta.y, { steps: 8 })
  await page.mouse.up()
}

/** Dibuja con el lápiz una línea horizontal, a `y` de alto del mapa. */
async function dibujarLinea(page: Page, y: number) {
  const caja = (await lienzoDelMapa(page).boundingBox())!
  await arrastrar(page, { x: caja.x + 60, y: caja.y + y }, { x: caja.x + 330, y: caja.y + y })
}

const giroDe = async (elemento: Locator) => (await elemento.getAttribute('style'))?.match(/rotate\((-?[\d.]+)deg\)/)?.[1]

/** Guarda el boceto con ese título. */
async function guardarComo(page: Page, titulo: string) {
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  const dialogo = page.getByRole('dialog', { name: 'Guardar boceto' })
  await dialogo.getByLabel('Título').fill(titulo)
  await dialogo.getByRole('button', { name: 'Guardar boceto' }).click()
  await expect(toast(page, 'Boceto guardado')).toBeVisible()
}

/** Dónde quedó el color rojo en una imagen PNG: su caja, y cuántos píxeles son. */
async function cajaDelRojo(page: Page, imagenBase64: string) {
  return page.evaluate(async (base64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
    const lienzo = document.createElement('canvas')
    lienzo.width = bitmap.width
    lienzo.height = bitmap.height
    const contexto = lienzo.getContext('2d')!
    contexto.drawImage(bitmap, 0, 0)
    const { data } = contexto.getImageData(0, 0, bitmap.width, bitmap.height)
    let [minX, minY, maxX, maxY, cuenta] = [Infinity, Infinity, -1, -1, 0]
    for (let i = 0; i < data.length; i += 4) {
      if (!(data[i] > 200 && data[i + 1] < 110 && data[i + 2] < 110)) continue
      const x = (i / 4) % bitmap.width
      const y = Math.floor(i / 4 / bitmap.width)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
      cuenta++
    }
    return { ancho: maxX - minX + 1, alto: maxY - minY + 1, centroX: (minX + maxX) / 2, centroY: (minY + maxY) / 2, cuenta, anchoImagen: bitmap.width }
  }, imagenBase64)
}

test.describe('Pizarra: textos', () => {
  test('tocar el mapa abre el cuadro, pone el texto ahí y lo deja elegido', async ({ page, entrar }) => {
    await entrar()
    await abrirConTexto(page)
    await expect(page.getByRole('button', { name: 'Texto', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('pizarra-lienzo')).toHaveCSS('pointer-events', 'none')

    const caja = (await lienzoDelMapa(page).boundingBox())!
    await page.mouse.click(caja.x + 195, caja.y + 300)
    const dialogo = page.getByRole('dialog', { name: 'Nuevo texto' })
    await dialogo.getByRole('button', { name: 'Agregar texto' }).click()
    await expect(dialogo.getByText('Escribe el texto.')).toBeVisible()

    // Cancelar no agrega nada.
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.locator('.pizarra-texto')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled()

    await ponerTexto(page, 'Parada del bus')
    const parada = texto(page, 'Parada del bus')
    await expect(parada).toHaveAttribute('aria-pressed', 'true')
    const { x, y } = await centro(parada)
    expect(Math.abs(x - (caja.x + 195))).toBeLessThan(3)
    expect(Math.abs(y - (caja.y + 300))).toBeLessThan(3)

    // Elegido: muestra su marco, su manija y las acciones del texto.
    await expect(parada.getByTestId('manija-de-giro')).toBeVisible()
    for (const nombre of ['Editar texto', 'Girar a la izquierda', 'Girar a la derecha', 'Borrar texto', 'Listo']) {
      await expect(page.getByRole('button', { name: nombre })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled()

    // "Listo" deja de elegirlo.
    await page.getByRole('button', { name: 'Listo' }).click()
    await expect(parada).toHaveAttribute('aria-pressed', 'false')
    await expect(parada.getByTestId('manija-de-giro')).toHaveCount(0)
  })

  test('se mueve arrastrándolo, y Deshacer lo regresa y después lo quita', async ({ page, entrar }) => {
    await entrar()
    await abrirConTexto(page)
    await ponerTexto(page, 'Aquí se llena el bus')
    const lleno = texto(page, 'Aquí se llena el bus')
    const antes = await centro(lleno)

    await arrastrar(page, antes, { x: antes.x + 70, y: antes.y + 50 })
    const despues = await centro(lleno)
    expect(Math.abs(despues.x - (antes.x + 70))).toBeLessThan(3)
    expect(Math.abs(despues.y - (antes.y + 50))).toBeLessThan(3)

    await page.getByRole('button', { name: 'Deshacer' }).click()
    const regresado = await centro(lleno)
    expect(Math.abs(regresado.x - antes.x)).toBeLessThan(2)
    expect(Math.abs(regresado.y - antes.y)).toBeLessThan(2)

    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.locator('.pizarra-texto')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled()
  })

  test('un toque sin arrastrar solo lo elige, y tocar el mapa vacío pone otro', async ({ page, entrar }) => {
    await entrar()
    await abrirConTexto(page)
    await ponerTexto(page, 'Uno', 120, 200)
    await page.getByRole('button', { name: 'Listo' }).click()
    const uno = texto(page, 'Uno')
    const antes = await centro(uno)

    await page.mouse.click(antes.x, antes.y)
    await expect(uno).toHaveAttribute('aria-pressed', 'true')
    const despues = await centro(uno)
    expect(Math.abs(despues.x - antes.x) + Math.abs(despues.y - antes.y)).toBeLessThan(2)

    await ponerTexto(page, 'Dos', 260, 380)
    await expect(page.locator('.pizarra-texto')).toHaveCount(2)
    await expect(texto(page, 'Dos')).toHaveAttribute('aria-pressed', 'true')
    await expect(uno).toHaveAttribute('aria-pressed', 'false')
  })

  test('se gira con los botones, de a 15°, y con la manija', async ({ page, entrar }) => {
    await entrar()
    await abrirConTexto(page)
    await ponerTexto(page, 'Girar')
    const girar = texto(page, 'Girar')
    expect(await giroDe(girar)).toBe('0')

    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Girar a la derecha' }).click()
    expect(await giroDe(girar)).toBe('90')
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Girar a la izquierda' }).click()
    expect(await giroDe(girar)).toBe('60')

    // Con la manija: arrastrarla a la derecha del texto lo deja a 90°, abajo a 180° y arriba a 0°.
    const centroDelTexto = await centro(girar)
    const manija = girar.getByTestId('manija-de-giro')
    await arrastrar(page, await centro(manija), { x: centroDelTexto.x + 120, y: centroDelTexto.y })
    expect(await giroDe(girar)).toBe('90')
    await arrastrar(page, await centro(manija), { x: centroDelTexto.x, y: centroDelTexto.y + 120 })
    expect(await giroDe(girar)).toBe('180')
    await arrastrar(page, await centro(manija), { x: centroDelTexto.x, y: centroDelTexto.y - 120 })
    expect(await giroDe(girar)).toBe('0')
    // Girarlo no lo movió.
    const despues = await centro(girar)
    expect(Math.abs(despues.x - centroDelTexto.x) + Math.abs(despues.y - centroDelTexto.y)).toBeLessThan(2)
  })

  test('cambia el color, el tamaño y el contenido del texto elegido', async ({ page, entrar }) => {
    await entrar()
    await abrirConTexto(page)
    await ponerTexto(page, 'Cambiar')
    const cambiar = texto(page, 'Cambiar')
    await expect(page.getByRole('button', { name: 'Color rojo' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Texto normal' })).toHaveAttribute('aria-pressed', 'true')
    await expect(cambiar).toHaveCSS('font-size', '20px')

    await page.getByRole('button', { name: 'Color azul' }).click()
    await expect(cambiar).toHaveCSS('color', 'rgb(4, 120, 251)')
    await page.getByRole('button', { name: 'Texto grande' }).click()
    await expect(cambiar).toHaveCSS('font-size', '32px')

    await page.getByRole('button', { name: 'Editar texto' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Editar texto' })
    await expect(dialogo.getByLabel('Texto')).toHaveValue('Cambiar')
    await dialogo.getByLabel('Texto').fill('Línea uno\nLínea dos')
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(texto(page, 'Línea uno Línea dos')).toBeVisible()
    await expect(texto(page, 'Línea uno Línea dos').locator('.pizarra-texto-contenido')).toHaveText('Línea uno\nLínea dos')

    // Lo que se cambió también se deshace, de a una acción.
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(texto(page, 'Cambiar')).toBeVisible()
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(texto(page, 'Cambiar')).toHaveCSS('font-size', '20px')
  })

  test('borrar un texto, o todo, se puede deshacer', async ({ page, entrar }) => {
    await entrar()
    await abrirConTexto(page)
    await ponerTexto(page, 'Uno', 120, 200)
    await ponerTexto(page, 'Dos', 260, 380)

    await page.getByRole('button', { name: 'Borrar texto' }).click()
    await expect(page.locator('.pizarra-texto')).toHaveCount(1)
    await expect(texto(page, 'Uno')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Borrar texto' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.locator('.pizarra-texto')).toHaveCount(2)

    await page.getByRole('button', { name: 'Borrar todo' }).click()
    await page.getByRole('dialog', { name: '¿Borrar todo el dibujo?' }).getByRole('button', { name: 'Borrar todo' }).click()
    await expect(page.locator('.pizarra-texto')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.locator('.pizarra-texto')).toHaveCount(2)
  })

  test('con la mano y con el lápiz los textos no estorban', async ({ page, entrar }) => {
    await entrar()
    await abrirConTexto(page)
    await ponerTexto(page, 'No estorbo')
    const estorbo = texto(page, 'No estorbo')
    await expect(estorbo).toHaveCSS('pointer-events', 'auto')

    await page.getByRole('button', { name: 'Mano' }).click()
    await expect(estorbo).toHaveCSS('pointer-events', 'none')
    await expect(estorbo).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Borrar texto' })).toHaveCount(0)

    // Con el lápiz se dibuja encima del texto.
    await page.getByRole('button', { name: 'Lápiz' }).click()
    await expect(estorbo).toHaveCSS('pointer-events', 'none')
    await dibujarLinea(page, 300)
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(estorbo).toBeVisible()
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.locator('.pizarra-texto')).toHaveCount(0)
  })

  test('con el teclado: Enter lo elige, las flechas lo mueven', async ({ page, entrar }) => {
    await entrar()
    await abrirConTexto(page)
    await ponerTexto(page, 'Teclado')
    await page.getByRole('button', { name: 'Listo' }).click()
    const teclado = texto(page, 'Teclado')
    const antes = await centro(teclado)

    await teclado.focus()
    await page.keyboard.press('ArrowRight')
    // Sin elegirlo, las flechas no hacen nada.
    expect(Math.abs((await centro(teclado)).x - antes.x)).toBeLessThan(1)

    await page.keyboard.press('Enter')
    await expect(teclado).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Shift+ArrowDown')
    const despues = await centro(teclado)
    expect(Math.abs(despues.x - (antes.x + 4))).toBeLessThan(1.5)
    expect(Math.abs(despues.y - (antes.y + 16))).toBeLessThan(1.5)
  })

  test('el texto sigue a su sitio del mapa cuando se mueve el mapa', async ({ page, entrar }) => {
    await entrar()
    await abrirConTexto(page)
    await ponerTexto(page, 'Pegado', 195, 400)
    const pegado = texto(page, 'Pegado')
    const antes = await centro(pegado)

    await page.getByRole('button', { name: 'Mano' }).click()
    const caja = (await lienzoDelMapa(page).boundingBox())!
    // Se suelta el mapa quieto: si no, sigue deslizándose por inercia y el desplazamiento no es exacto.
    await page.mouse.move(caja.x + 60, caja.y + 150)
    await page.mouse.down()
    await page.mouse.move(caja.x + 160, caja.y + 110, { steps: 8 })
    await page.waitForTimeout(300)
    await page.mouse.up()
    await expect.poll(async () => Math.round((await centro(pegado)).x - antes.x)).toBeGreaterThan(90)
    const despues = await centro(pegado)
    expect(Math.abs(despues.x - (antes.x + 100))).toBeLessThan(4)
    expect(Math.abs(despues.y - (antes.y - 40))).toBeLessThan(4)
  })

  test('se guarda junto a los trazos y sale en el pantallazo, en su sitio y horizontal', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/pizarra')
    // Un trazo azul primero, para que el único rojo de la imagen sea el texto.
    await page.getByRole('button', { name: 'Lápiz' }).click()
    await page.getByRole('button', { name: 'Color azul' }).click()
    await dibujarLinea(page, 150)
    await page.getByRole('button', { name: 'Texto', exact: true }).click()
    await page.getByRole('button', { name: 'Color rojo' }).click()
    await page.getByRole('button', { name: 'Texto grande' }).click()
    await ponerTexto(page, 'ABCDEFGHIJ', 195, 300)
    await guardarComo(page, 'Con texto')

    const [boceto] = supabase.db.bocetos
    const { features } = boceto.trazos as { features: Feature[] }
    expect(features.map((f) => f.geometry.type)).toEqual(['LineString', 'Point'])
    expect(features[1].properties).toEqual({ texto: 'ABCDEFGHIJ', color: '#E5484D', tamano: 32, giro: 0 })
    const [lng, lat] = features[1].geometry.coordinates as number[]
    expect(Math.abs(lng - -75.574)).toBeLessThan(0.01)
    expect(Math.abs(lat - 6.213)).toBeLessThan(0.01)

    const imagen = supabase.archivos.get(String(boceto.imagen_path))!.contenido!.toString('base64')
    const rojo = await cajaDelRojo(page, imagen)
    const escala = rojo.anchoImagen / ((await lienzoDelMapa(page).boundingBox())?.width ?? rojo.anchoImagen)
    // En su sitio (donde se tocó el mapa), horizontal y con tamaño de texto grande.
    expect(rojo.cuenta).toBeGreaterThan(300)
    expect(rojo.ancho).toBeGreaterThan(rojo.alto * 3)
    expect(rojo.alto).toBeGreaterThan(15 * escala)
    expect(rojo.alto).toBeLessThan(45 * escala)
    expect(Math.abs(rojo.centroX / escala - 195)).toBeLessThan(12)
    expect(Math.abs(rojo.centroY / escala - 300)).toBeLessThan(12)
  })

  test('girado 90°, el texto sale vertical en el pantallazo', async ({ page, entrar, supabase }) => {
    await entrar()
    await abrirConTexto(page)
    await page.getByRole('button', { name: 'Texto grande' }).click()
    await ponerTexto(page, 'ABCDEFGHIJ', 195, 300)
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Girar a la derecha' }).click()
    await guardarComo(page, 'Vertical')

    const [boceto] = supabase.db.bocetos
    const { features } = boceto.trazos as { features: Feature[] }
    expect(features).toHaveLength(1)
    expect(features[0].properties).toEqual({ texto: 'ABCDEFGHIJ', color: '#E5484D', tamano: 32, giro: 90 })

    const imagen = supabase.archivos.get(String(boceto.imagen_path))!.contenido!.toString('base64')
    const rojo = await cajaDelRojo(page, imagen)
    const escala = rojo.anchoImagen / ((await lienzoDelMapa(page).boundingBox())?.width ?? rojo.anchoImagen)
    expect(rojo.cuenta).toBeGreaterThan(300)
    expect(rojo.alto).toBeGreaterThan(rojo.ancho * 3)
    expect(Math.abs(rojo.centroX / escala - 195)).toBeLessThan(12)
    expect(Math.abs(rojo.centroY / escala - 300)).toBeLessThan(12)
  })
})
