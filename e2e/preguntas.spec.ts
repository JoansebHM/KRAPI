import { GUIAS } from '../src/features/preguntas/guias'
import { ordenarPreguntas } from '../src/features/preguntas/ordenar'
import { CUENTAS } from './soporte/supabase-falso'
import { expect, test } from './soporte/fixtures'

const dialogo = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Preguntas de entrevista' })
const pregunta = (page: import('@playwright/test').Page, codigo: string) =>
  dialogo(page).getByRole('button', { name: new RegExp(`^(Imprescindible\\s*)?${codigo.replace('.', '\\.')}\\b`) })

test.describe('Guías de preguntas', () => {
  test('los conteos de las guías coinciden con los de los documentos originales', () => {
    const conteo = (id: string, moduloId?: string) => {
      const guia = GUIAS.find((g) => g.id === id)!
      const { imprescindibles, complementarias } = ordenarPreguntas(guia, moduloId)
      return [imprescindibles.length + complementarias.length, imprescindibles.length]
    }
    expect(conteo('centro-distribucion')).toEqual([23, 14])
    expect(conteo('jac')).toEqual([21, 13])
    expect(conteo('tenderos')).toEqual([19, 12])
    expect(conteo('residentes')).toEqual([19, 12])
    // Tronco + un módulo: Instituciones 11 (7★) + 5 (3★); Visitantes 12 (8★) + 3 (2★).
    for (const modulo of ['policia', 'hospital', 'centro-comercial']) expect(conteo('instituciones', modulo)).toEqual([16, 10])
    for (const modulo of ['turistas', 'flotante', 'consumidores']) expect(conteo('visitantes', modulo)).toEqual([15, 10])

    const total = (guia: (typeof GUIAS)[number]) => {
      const preguntas = [...guia.bloques, ...(guia.modulos?.opciones.map((o) => o.bloque) ?? [])].flatMap((b) => b.preguntas)
      return [preguntas.length, preguntas.filter((p) => p.imprescindible).length]
    }
    expect(GUIAS.map(total).reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0])).toEqual([129, 81])
  })

  test('el menú abre el diálogo con 6 pestañas y Centro de distribución seleccionada', async ({ page, entrar }) => {
    await entrar()
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: 'Preguntas' }).click()
    await expect(page).toHaveURL(/\/preguntas$/)
    await expect(dialogo(page)).toBeVisible()
    await expect(dialogo(page).getByRole('tab')).toHaveCount(6)
    await expect(dialogo(page).getByRole('tab', { name: 'Centro de distribución' })).toHaveAttribute('aria-selected', 'true')
  })

  test('las imprescindibles van primero y cada pregunta se expande y se cierra', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/preguntas')
    const d = dialogo(page)
    await expect(d.getByRole('heading', { name: 'Imprescindibles · 14' })).toBeVisible()
    await expect(d.getByRole('heading', { name: 'Complementarias · 9' })).toBeVisible()
    const botones = d.locator('.pregunta-boton')
    await expect(botones.first()).toContainText('BU1.1')
    await expect(botones.first().getByRole('img', { name: 'Imprescindible' })).toBeVisible()
    await expect(botones.nth(14)).toContainText('BU1.2')
    await expect(botones.nth(14).getByRole('img', { name: 'Imprescindible' })).toHaveCount(0)

    const bu32 = pregunta(page, 'BU3.2')
    await expect(bu32).toHaveAttribute('aria-expanded', 'false')
    await bu32.click()
    await expect(bu32).toHaveAttribute('aria-expanded', 'true')
    const panel = d.locator('.pregunta', { has: page.locator('.pregunta-boton', { hasText: 'BU3.2' }) })
    await expect(panel.getByText('Por qué se pregunta')).toBeVisible()
    await expect(panel).toContainText('BU3 · Operación de la ruta y última milla')
    await expect(panel).toContainText('Reconstruir, parada por parada')
    await expect(panel).toContainText('Secuencia de maniobras y tiempos estimados')
    await expect(panel.getByText('Repreguntas')).toBeVisible()
    await expect(panel.getByText('Registro técnico')).toBeVisible()
    await expect(panel).toContainText('Fotografiar el vehículo tipo')
    await bu32.click()
    await expect(bu32).toHaveAttribute('aria-expanded', 'false')

    // La nota del bloque se ve en cada pregunta del bloque.
    await pregunta(page, 'BU7.3').click()
    await expect(d).toContainText('BU7.3 es la pregunta más valiosa de la guía')
  })

  test('Instituciones: el módulo se elige y cambia las preguntas, el tronco se queda', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/preguntas')
    const d = dialogo(page)
    await d.getByRole('tab', { name: 'Instituciones' }).click()
    await expect(page).toHaveURL(/guia=instituciones/)
    await expect(d.getByRole('button', { name: 'Policía', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(d.getByText('Se aplica un solo módulo por entrevista')).toBeVisible()
    await expect(pregunta(page, 'PO1')).toBeVisible()
    await expect(pregunta(page, 'IN1.1')).toBeVisible()
    await d.getByRole('button', { name: 'Hospital o clínica', exact: true }).click()
    await expect(pregunta(page, 'HO1')).toBeVisible()
    await expect(pregunta(page, 'PO1')).toHaveCount(0)
    await expect(pregunta(page, 'IN1.1')).toBeVisible()
    // Las preguntas de módulo muestran a quién va dirigido.
    await pregunta(page, 'HO1').click()
    await expect(d).toContainText('Coordinación de gestión ambiental')
    await expect(d.getByRole('heading', { name: 'Imprescindibles · 10' })).toBeVisible()
  })

  test('Tenderos: el ejercicio muestra sus tarjetas y el juego de alojamientos', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/preguntas?guia=tenderos')
    const d = dialogo(page)
    await expect(d.getByText('Si no hay tiempo, divídela en dos sesiones')).toBeVisible()
    await pregunta(page, 'TR8.1').click()
    await expect(d.locator('.tarjeta')).toHaveCount(4)
    await expect(d.locator('.tarjeta').first()).toContainText('Beneficio comercial')
    await d.getByRole('button', { name: 'Hostales y alojamientos' }).click()
    await expect(d.locator('.tarjeta')).toHaveCount(4)
    await expect(d.locator('.tarjeta').first()).toContainText('Beneficio para el huésped')
  })

  test('la autorización pone el nombre de la cuenta y se vuelve con atrás o con el botón', async ({ page, entrar }) => {
    await entrar('miembro')
    await page.goto('/preguntas?guia=jac')
    const d = dialogo(page)
    await d.getByRole('button', { name: 'Autorización para grabar' }).click()
    await expect(page).toHaveURL(/vista=autorizacion/)
    await expect(d.getByRole('heading', { name: 'Presentación y autorización · JAC' })).toBeVisible()
    await expect(d.locator('mark')).toHaveText(CUENTAS.miembro.nombre)
    await expect(d.locator('.autorizacion-guion')).not.toContainText('______')
    await expect(d.locator('.autorizacion-permiso')).toContainText('¿Nos autoriza a grabar?')
    await expect(d.locator('.autorizacion-checks li')).toHaveCount(7)
    await expect(d.getByText('Para este actor')).toBeVisible()
    // Las pestañas siguen a la vista: cambiar de guía cambia el guion.
    await d.getByRole('tab', { name: 'Residentes' }).click()
    await expect(d.getByRole('heading', { name: 'Presentación y autorización · Residentes' })).toBeVisible()
    await d.getByRole('button', { name: 'Volver a las preguntas' }).click()
    await expect(d.getByRole('heading', { name: /Imprescindibles/ })).toBeVisible()

    await d.getByRole('button', { name: 'Autorización para grabar' }).click()
    await page.goBack()
    await expect(d.getByRole('heading', { name: /Imprescindibles/ })).toBeVisible()
  })

  test('cierra al mapa y recuerda la última pestaña', async ({ page, entrar }) => {
    await entrar()
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: 'Preguntas' }).click()
    await dialogo(page).getByRole('tab', { name: 'Visitantes' }).click()
    await dialogo(page).getByRole('button', { name: 'Cerrar diálogo' }).click()
    await expect(dialogo(page)).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/preguntas')
    await expect(dialogo(page).getByRole('tab', { name: 'Visitantes' })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')
    await expect(dialogo(page)).toBeHidden()
  })

  test('cerrar desde la autorización entrando por la URL va al mapa', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/preguntas')
    await dialogo(page).getByRole('button', { name: 'Autorización para grabar' }).click()
    await dialogo(page).getByRole('button', { name: 'Cerrar diálogo' }).click()
    await expect(dialogo(page)).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
  })

  test('/preguntas?guia=residentes abre directo en Residentes y las flechas cambian de pestaña', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/preguntas?guia=residentes')
    const d = dialogo(page)
    await expect(d.getByRole('tab', { name: 'Residentes' })).toHaveAttribute('aria-selected', 'true')
    await d.getByRole('tab', { name: 'Residentes' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(d.getByRole('tab', { name: 'Visitantes' })).toHaveAttribute('aria-selected', 'true')
    await expect(d.getByRole('tab', { name: 'Visitantes' })).toBeFocused()
    // Una guía desconocida cae en la recordada.
    await page.goto('/preguntas?guia=inventada')
    await expect(d.getByRole('tab', { name: 'Visitantes' })).toHaveAttribute('aria-selected', 'true')
  })

  test('cada guía termina con el cierre de la entrevista', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/preguntas?guia=jac')
    const cierre = dialogo(page).getByRole('button', { name: 'Cierre de la entrevista' })
    await cierre.click()
    await expect(dialogo(page)).toContainText('proponemos hacerlo en una reunión con la Junta')
  })

  test('a 320 px no hay scroll horizontal en la página ni en el diálogo', async ({ page, entrar }) => {
    await entrar()
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/preguntas?guia=tenderos')
    await pregunta(page, 'TR8.1').click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const cuerpo = dialogo(page).locator('.dialog-body')
    expect(await cuerpo.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    // La fila de pestañas se desplaza sola.
    expect(await dialogo(page).locator('.pestanas').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  })
})
