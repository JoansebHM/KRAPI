import { expect, test } from './soporte/fixtures'

const CENTRO = [-75.57402, 6.21293] as const
const punto = (lng: number, lat: number) => ({ type: 'Point', coordinates: [lng, lat] })
// Una manzana centrada en el mapa, para poder tocarla siempre en el mismo punto de la pantalla.
const MANZANA = [
  [CENTRO[0] - 0.0006, CENTRO[1] - 0.0006],
  [CENTRO[0] + 0.0006, CENTRO[1] - 0.0006],
  [CENTRO[0] + 0.0006, CENTRO[1] + 0.0006],
  [CENTRO[0] - 0.0006, CENTRO[1] + 0.0006],
  [CENTRO[0] - 0.0006, CENTRO[1] - 0.0006],
]

test.describe('Filtros del mapa', () => {
  test.beforeEach(async ({ page, supabase }) => {
    await page.clock.setFixedTime(new Date('2026-10-30T14:00:00-05:00'))
    supabase.agregarCuenta({ usuario: 'beto', nombre: 'Beto Ruiz' })
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' }, { id: 'c2', nombre: 'Tienda', color: '#0478FB', icono: 'tienda' })
    supabase.db.ubicaciones.push(
      { id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: 'c1', estado: 'activa', geom: punto(-75.576, 6.214) },
      { id: 'p2', tipo: 'punto', nombre: 'Tienda Don Pepe', categoria_id: 'c2', estado: 'activa', geom: punto(-75.572, 6.212) },
      { id: 'z1', tipo: 'zona', nombre: 'Manzana del parque', estado: 'activa', geom: { type: 'Polygon', coordinates: [MANZANA] } },
    )
    supabase.db.estudios.push(
      { id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-05', hora_inicio: '08:00:00', hora_fin: '09:00:00', titulo: 'Visita a Café Central', archivado_en: null },
      { id: 'e2', ubicacion_id: 'p2', fecha: '2026-10-20', hora_inicio: '15:00:00', hora_fin: '16:00:00', titulo: 'Visita a Tienda Don Pepe', archivado_en: null },
    )
    supabase.db.estudio_participantes.push({ estudio_id: 'e1', usuario_id: 'u-ana' }, { estudio_id: 'e2', usuario_id: 'u-beto' })
    supabase.db.evidencias.push(
      { id: 'ev1', estudio_id: 'e1', tipo: 'foto', archivo_path: 'e1/foto.jpg', archivo_nombre: 'foto.jpg', archivo_mime: 'image/jpeg', archivo_bytes: 1000, proveedor: 'supabase' },
      { id: 'ev2', estudio_id: 'e2', tipo: 'audio', archivo_path: 'e2/audio.m4a', archivo_nombre: 'audio.m4a', archivo_mime: 'audio/mp4', archivo_bytes: 1000, proveedor: 'supabase' },
    )
  })

  test('el botón abre un panel sin tapar el mapa, y el contador cuenta los grupos activos', async ({ page, entrar }) => {
    await entrar()
    await expect(page.getByRole('button', { name: 'Café Central (Café)' })).toBeVisible()

    const boton = page.locator('.boton-filtros')
    await boton.click()
    const panel = page.getByRole('dialog', { name: 'Filtros' })
    await expect(panel).toBeVisible()
    // El mapa sigue ahí detrás: el panel no es de pantalla completa.
    await expect(page.getByRole('button', { name: 'Café Central (Café)' })).toBeVisible()

    await panel.getByRole('button', { name: 'Café' }).click()
    await expect(boton.locator('.boton-filtros-contador')).toHaveText('1')
    await panel.getByRole('button', { name: 'Audio' }).click()
    await expect(boton.locator('.boton-filtros-contador')).toHaveText('2')

    await panel.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(boton.locator('.boton-filtros-contador')).toHaveCount(0)
  })

  test('filtrar por categoría solo afecta a los puntos, no a las zonas', async ({ page, entrar }) => {
    await entrar()
    await page.locator('.boton-filtros').click()
    await page.getByRole('dialog', { name: 'Filtros' }).getByRole('button', { name: 'Café' }).click()
    await page.getByRole('dialog', { name: 'Filtros' }).getByRole('button', { name: 'Ver en el mapa' }).click()

    await expect(page.getByRole('button', { name: 'Café Central (Café)' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tienda Don Pepe/ })).toHaveCount(0)

    // La zona no tiene categoría: sigue en el mapa y se puede tocar.
    const mapa = await page.locator('.map-view').boundingBox()
    await expect(async () => {
      await page.mouse.click(mapa!.x + mapa!.width / 2, mapa!.y + mapa!.height / 2)
      await expect(page).toHaveURL(/\/lugares\/z1$/, { timeout: 500 })
    }).toPass()
  })

  test('filtrar por rango de fechas y por tipo de evidencia', async ({ page, entrar }) => {
    await entrar()
    await page.locator('.boton-filtros').click()
    const panel = page.getByRole('dialog', { name: 'Filtros' })

    // Solo octubre 1-10: deja a Café Central (5 de octubre) y oculta Tienda Don Pepe (20 de octubre).
    await panel.getByLabel('Desde').first().fill('2026-10-01')
    await panel.getByLabel('Hasta').first().fill('2026-10-10')
    await panel.getByRole('button', { name: 'Ver en el mapa' }).click()
    await expect(page.getByRole('button', { name: 'Café Central (Café)' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tienda Don Pepe/ })).toHaveCount(0)

    // Se limpia y se filtra por evidencia de audio: ahora solo queda Tienda Don Pepe.
    await page.locator('.boton-filtros').click()
    await panel.getByRole('button', { name: 'Limpiar filtros' }).click()
    await panel.getByRole('button', { name: 'Audio' }).click()
    await panel.getByRole('button', { name: 'Ver en el mapa' }).click()
    await expect(page.getByRole('button', { name: /Tienda Don Pepe/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Café Central (Café)' })).toHaveCount(0)
  })

  test('filtrar por responsable', async ({ page, entrar }) => {
    await entrar()
    await page.locator('.boton-filtros').click()
    const panel = page.getByRole('dialog', { name: 'Filtros' })
    await panel.getByRole('button', { name: 'Beto Ruiz' }).click()
    await panel.getByRole('button', { name: 'Ver en el mapa' }).click()

    await expect(page.getByRole('button', { name: /Tienda Don Pepe/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Café Central (Café)' })).toHaveCount(0)
  })
})
