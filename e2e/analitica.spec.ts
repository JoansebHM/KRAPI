import { expect, test } from './soporte/fixtures'

const punto = (lng: number, lat: number) => ({ type: 'Point', coordinates: [lng, lat] })

test.describe('Analítica', () => {
  test.beforeEach(async ({ page, supabase }) => {
    // Viernes 30 de octubre de 2026: la semana actual empieza el lunes 26.
    await page.clock.setFixedTime(new Date('2026-10-30T14:00:00-05:00'))
    supabase.db.categorias.push(
      { id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe', aplica_a: 'lugares' },
      { id: 'c2', nombre: 'Tienda', color: '#0478FB', icono: 'tienda', aplica_a: 'lugares' },
      { id: 'c3', nombre: 'Caneca', color: '#12B76A', icono: 'tienda', aplica_a: 'elementos' },
    )
    supabase.db.ubicaciones.push(
      { id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: 'c1', estado: 'activa', geom: punto(-75.576, 6.214) },
      { id: 'p2', tipo: 'punto', nombre: 'Tienda Don Pepe', categoria_id: 'c2', estado: 'activa', geom: punto(-75.572, 6.212) },
      { id: 'p3', tipo: 'punto', nombre: 'Local sin visitar', estado: 'activa', geom: punto(-75.574, 6.213) },
      { id: 'el1', tipo: 'elemento', nombre: null, categoria_id: 'c3', estado: 'activa', geom: punto(-75.5735, 6.2125) },
      // Un recorrido de zona no cuenta en el dashboard.
      { id: 'z1', tipo: 'zona', nombre: 'Manzana', estado: 'activa', geom: { type: 'Polygon', coordinates: [[[-75.5755, 6.2125], [-75.5745, 6.2125], [-75.5745, 6.2135], [-75.5755, 6.2125]]] } },
    )
    supabase.db.estudios.push(
      { id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-05', hora_inicio: '08:00:00', hora_fin: '09:00:00', notas: [], entrevistado: 'Tendero', archivado_en: null },
      { id: 'e2', ubicacion_id: 'p1', fecha: '2026-10-28', hora_inicio: '15:00:00', hora_fin: '16:00:00', notas: ['Mucha gente'], entrevistado: null, archivado_en: null },
      { id: 'e3', ubicacion_id: 'p2', fecha: '2026-10-30', hora_inicio: '19:00:00', hora_fin: '20:00:00', notas: [], entrevistado: null, archivado_en: null },
      { id: 'ez', ubicacion_id: 'z1', fecha: '2026-10-29', hora_inicio: '10:00:00', hora_fin: '11:00:00', notas: [], entrevistado: null, archivado_en: null },
      // Archivado: no cuenta.
      { id: 'ea', ubicacion_id: 'p2', fecha: '2026-10-29', hora_inicio: '10:00:00', hora_fin: '11:00:00', notas: [], entrevistado: 'Otro', archivado_en: '2026-10-29T20:00:00Z' },
    )
    supabase.db.estudio_participantes.push(
      { estudio_id: 'e1', usuario_id: 'u-ana' },
      { estudio_id: 'e2', usuario_id: 'u-ana' },
      { estudio_id: 'e2', usuario_id: 'u-admin' },
      { estudio_id: 'e3', usuario_id: 'u-admin' },
    )
    supabase.db.evidencias.push(
      { id: 'ev1', estudio_id: 'e1', tipo: 'foto', archivo_path: 'e1/f.jpg', archivo_nombre: 'f.jpg', archivo_mime: 'image/jpeg', archivo_bytes: 2 * 1024 * 1024, proveedor: 'supabase', creado_por: 'u-ana' },
      { id: 'ev2', estudio_id: 'e2', tipo: 'audio', archivo_path: 'e2/a.m4a', archivo_nombre: 'a.m4a', archivo_mime: 'audio/mp4', archivo_bytes: 1024 * 1024, proveedor: 'supabase', creado_por: 'u-admin' },
      { id: 'ev3', ubicacion_id: 'el1', tipo: 'foto', archivo_path: 'el1/f.jpg', archivo_nombre: 'f.jpg', archivo_mime: 'image/jpeg', archivo_bytes: 1024 * 1024, proveedor: 'supabase', creado_por: 'u-ana' },
    )
  })

  test('el menú lleva a la analítica y muestra las cifras de locales, estudios y evidencias', async ({ page, entrar }) => {
    await entrar()
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: 'Analítica' }).click()
    await expect(page).toHaveURL(/\/analitica$/)

    const cifras = page.locator('.analitica-cifras')
    const cifra = (nombre: string) => cifras.locator('.analitica-cifra').filter({ has: page.getByText(nombre, { exact: true }) })
    // 3 locales (más 1 elemento); 3 estudios (sin el archivado ni el de la zona), 2 de esta semana.
    await expect(cifra('Locales')).toContainText('3')
    await expect(cifra('Locales')).toContainText('y 1 elemento')
    await expect(cifra('Estudios')).toContainText('3')
    await expect(cifra('Estudios')).toContainText('2 esta semana')
    await expect(cifra('Entrevistas')).toContainText('1')
    await expect(cifra('Evidencias')).toContainText('3')
    await expect(cifra('Evidencias')).toContainText('4 MB')
  })

  test('cobertura, ritmo, categorías y equipo', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/analitica')

    // Cobertura: 2 de 3 locales tienen estudio.
    await expect(page.getByRole('meter', { name: 'Locales con estudio' })).toHaveAttribute('aria-valuetext', '2 de 3')
    await expect(page.getByText('faltan 1 local')).toBeVisible()

    // Ritmo: al abrir se lee la semana actual; tocar otra columna cambia la lectura.
    const semanas = page.getByRole('group', { name: 'Estudios por semana' })
    await expect(page.locator('.analitica-lectura').first()).toHaveText('Esta semana: 2 estudios')
    await semanas.getByRole('button', { name: 'Semana del 5 oct 2026: 1 estudio' }).click()
    await expect(page.locator('.analitica-lectura').first()).toHaveText('Semana del 5 oct 2026: 1 estudio')

    // Por día: el miércoles tiene uno (e2).
    await expect(page.getByRole('group', { name: 'Estudios por día de la semana' }).getByRole('button', { name: 'Miércoles: 1 estudio' })).toBeVisible()

    // Categorías con el nombre de cada una y "Sin categoría" al final.
    const categorias = page.locator('.analitica-seccion', { hasText: 'Locales por categoría' })
    await expect(categorias.locator('.analitica-barra-etiqueta').first()).toHaveText('Café')
    await expect(categorias.locator('.analitica-barra-etiqueta').filter({ hasText: 'Sin categoría' })).toBeVisible()
    await expect(categorias.getByText('Caneca')).toBeVisible()

    // Equipo: los nombres de las cuentas.
    const equipo = page.locator('.analitica-seccion', { hasText: 'Equipo' })
    await expect(equipo.getByText('Ana Gómez').first()).toBeVisible()
    await expect(equipo.getByText('Admin Kratos').first()).toBeVisible()
  })

  test('no se desborda a 320 px y se ve en modo oscuro', async ({ page, entrar }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await entrar()
    await page.goto('/analitica')
    await expect(page.locator('.analitica-cifras')).toBeVisible()
    const desborde = await page.locator('.panel-contenido').evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(desborde).toBeLessThanOrEqual(0)

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('.analitica-cifras')).toBeVisible()
  })
})

test('sin datos explica qué hacer', async ({ page, entrar }) => {
  await entrar()
  await page.goto('/analitica')
  await expect(page.getByText('Aún no hay cifras')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir al mapa' })).toBeVisible()
})
