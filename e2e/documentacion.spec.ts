import { expect, test } from './soporte/fixtures'

test.describe('Documentación (/docs)', () => {
  test('se abre sin iniciar sesión y muestra el inicio con sus secciones', async ({ page }) => {
    await page.goto('/docs')
    await expect(page.getByRole('heading', { level: 1, name: 'Documentación de KIRA' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Modelo de datos Tablas, reglas/ })).toBeVisible()
  })

  test('el menú lleva a cada página y marca la actual', async ({ page }) => {
    await page.goto('/docs')
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    const menu = page.getByRole('navigation', { name: 'Páginas' })
    await menu.getByRole('link', { name: 'Producto' }).click()

    await expect(page).toHaveURL(/\/docs#\/producto$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Producto' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Producto' })).toHaveAttribute('aria-current', 'page')
    await expect(page).toHaveTitle('Producto · KIRA')
  })

  test('el índice de la página lleva a cada sección', async ({ page }) => {
    await page.goto('/docs#/contribuir')
    const pagina = page.locator('article:not([hidden])')
    await pagina.getByText('En esta página').click()
    await pagina.locator('.toc-movil').getByRole('link', { name: 'Commits' }).click()

    await expect(page).toHaveURL(/#\/contribuir\/commits$/)
    await expect(page.locator('#contribuir--commits')).toBeInViewport()
  })

  test('los enlaces entre documentos abren la página correspondiente', async ({ page }) => {
    await page.goto('/docs#/producto')
    await page.locator('#pagina-producto').getByRole('link', { name: 'decisión 0008' }).click()
    await expect(page.getByRole('heading', { level: 1, name: /0008 · Lugares/ })).toBeVisible()
  })

  test('el código se muestra con su botón de copiar', async ({ page }) => {
    await page.goto('/docs#/puesta-en-marcha')
    const bloque = page.locator('#pagina-puesta-en-marcha .codigo').first()
    await expect(bloque.getByRole('button', { name: 'Copiar' })).toBeVisible()
    await expect(bloque.locator('.mk-funcion').first()).toHaveText('npm')
  })

  test('los diagramas se incrustan como figuras accesibles y se desplazan sin desbordar la página', async ({ page }) => {
    await page.goto('/docs#/modelo-de-datos')
    await expect(page.locator('#pagina-modelo-de-datos').getByRole('img', { name: 'Modelo de datos de KIRA' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await page.goto('/docs#/arquitectura')
    await expect(page.locator('#pagina-arquitectura').getByRole('img', { name: 'Cómo se arma la app' })).toBeVisible()
    await page.goto('/docs#/contribuir')
    await expect(page.locator('#pagina-contribuir').getByRole('img', { name: 'Flujo de trabajo en GitHub' })).toBeVisible()
  })

  test('el buscador encuentra el texto en todas las páginas', async ({ page }) => {
    await page.goto('/docs')
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByLabel('Buscar en la documentación').fill('postgis')
    const resultados = page.getByRole('list', { name: 'Resultados de la búsqueda' })
    await expect(resultados.getByRole('link', { name: /Modelo de datos/ })).toBeVisible()

    await page.getByLabel('Buscar en la documentación').fill('palabra que no existe')
    await expect(resultados).toContainText('Sin resultados')
  })

  test('recuerda el tema elegido, igual que la app', async ({ page }) => {
    await page.goto('/docs')
    const tema = await page.locator('html').getAttribute('data-theme')
    const otro = tema === 'dark' ? 'light' : 'dark'
    await page.getByRole('button', { name: /Cambiar a modo/ }).click()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', otro)
  })
})
