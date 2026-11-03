import { expect, test } from './soporte/fixtures'

test.describe('Vistas del mapa', () => {
  test('el botón ofrece las vistas, carga la elegida y la recuerda al recargar', async ({ page, supabase, entrar }) => {
    await entrar()
    await expect.poll(() => supabase.estilosPedidos.length).toBeGreaterThan(0)
    expect(supabase.estilosPedidos.every((ruta) => !ruta.includes('/maps/'))).toBe(true)

    await page.getByRole('button', { name: 'Vista del mapa' }).click()
    const menu = page.getByRole('list', { name: 'Vista del mapa' })
    await expect(menu.getByRole('button')).toHaveText(['Calles', 'Topográfico', 'Calles simplificado'])
    await expect(menu.getByRole('button', { name: 'Calles', exact: true })).toHaveAttribute('aria-pressed', 'true')

    await menu.getByRole('button', { name: 'Topográfico' }).click()
    await expect(menu).toBeHidden()
    await expect.poll(() => supabase.estilosPedidos.at(-1)).toBe('/maps/topo-v2/style.json')

    // La elección queda guardada en el dispositivo.
    await page.reload()
    await expect(page.locator('.app-header')).toBeVisible()
    await expect.poll(() => supabase.estilosPedidos.at(-1)).toBe('/maps/topo-v2/style.json')
    await page.getByRole('button', { name: 'Vista del mapa' }).click()
    await expect(page.getByRole('button', { name: 'Topográfico' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Calles simplificado' }).click()
    await expect.poll(() => supabase.estilosPedidos.at(-1)).toBe('/maps/dataviz/style.json')
    await page.getByRole('button', { name: 'Vista del mapa' }).click()
    await page.getByRole('button', { name: 'Calles', exact: true }).click()
    // El navegador puede reusar el estilo de calles que ya tenía: se comprueba la vista elegida, no la petición.
    await page.getByRole('button', { name: 'Vista del mapa' }).click()
    await expect(page.getByRole('button', { name: 'Calles', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('en el modo oscuro cada vista usa su estilo oscuro', async ({ page, supabase, entrar }) => {
    await entrar()
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
    await page.getByRole('button', { name: 'Vista del mapa' }).click()
    await page.getByRole('button', { name: 'Topográfico' }).click()
    await expect.poll(() => supabase.estilosPedidos.at(-1)).toBe('/maps/topo-v2-dark/style.json')
  })

  test('el interruptor de locales del mapa está en los filtros, no cuenta como filtro y se recuerda', async ({ page, supabase, entrar }) => {
    await entrar()
    const boton = page.locator('.boton-filtros')
    await boton.click()
    const panel = page.getByRole('dialog', { name: 'Filtros' })
    const interruptor = panel.getByRole('button', { name: 'Mostrar locales del mapa' })
    // Por defecto los locales del mapa base están ocultos.
    await expect(interruptor).toHaveAttribute('aria-pressed', 'false')

    // Al cambiarlo se vuelve a cargar el mapa base, con o sin los locales.
    const antes = supabase.estilosPedidos.length
    await interruptor.click()
    await expect(interruptor).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => supabase.estilosPedidos.length).toBeGreaterThan(antes)

    // No es un filtro de datos: no suma al contador ni lo borra "Limpiar filtros".
    await expect(boton.locator('.boton-filtros-contador')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Limpiar filtros' })).toBeDisabled()

    await page.reload()
    await expect(page.locator('.app-header')).toBeVisible()
    await page.locator('.boton-filtros').click()
    await expect(page.getByRole('dialog', { name: 'Filtros' }).getByRole('button', { name: 'Mostrar locales del mapa' })).toHaveAttribute('aria-pressed', 'true')
  })
})
