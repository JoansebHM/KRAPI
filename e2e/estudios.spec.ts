import { expect, test, toast } from './soporte/fixtures'

const CENTRO_MANILA = [-75.57402095, 6.21293365]

test.describe('Estudios', () => {
  test.beforeEach(async ({ page, supabase }) => {
    // 30 de octubre de 2026, 2:05 p. m. en Medellín.
    await page.clock.setFixedTime(new Date('2026-10-30T14:05:00-05:00'))
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })
    supabase.db.responsables.push({ id: 'r1', nombre: 'Ana', avatar_semilla: 'ana' }, { id: 'r2', nombre: 'Beto', avatar_semilla: 'beto' })
    supabase.db.ubicaciones.push({
      id: 'p1',
      tipo: 'punto',
      nombre: 'Café Central',
      categoria_id: 'c1',
      estado: 'activa',
      geom: { type: 'Point', coordinates: [-75.576, 6.214] },
    })
    supabase.db.estudios.push(
      { id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', titulo: 'Primera visita', entrevistado: 'Tendero', descripcion: null, archivado_en: null },
      { id: 'e2', ubicacion_id: 'p1', fecha: '2026-10-22', hora_inicio: '15:00:00', hora_fin: '16:30:00', titulo: 'Segunda visita', entrevistado: null, descripcion: null, archivado_en: null },
      { id: 'e3', ubicacion_id: 'p1', fecha: '2026-10-21', hora_inicio: '08:00:00', hora_fin: '09:00:00', titulo: 'Visita archivada', entrevistado: null, descripcion: null, archivado_en: '2026-10-21T20:00:00Z' },
    )
    supabase.db.estudio_responsables.push({ estudio_id: 'e1', responsable_id: 'r1' })
  })

  test('la ficha muestra el histórico del más reciente al más antiguo, sin los archivados', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/lugares/p1')
    const historico = page.getByRole('region', { name: /Estudios/ })

    const estudios = historico.getByRole('link')
    await expect(estudios).toHaveCount(2)
    await expect(estudios.nth(0)).toContainText('Segunda visita')
    await expect(estudios.nth(1)).toContainText('Primera visita')
    await expect(estudios.nth(1)).toContainText('20 oct 2026')
    await expect(estudios.nth(1)).toContainText('Entrevista: Tendero')
    await expect(estudios.nth(1)).toContainText('Responsables: Ana')
    await expect(historico.getByText('Visita archivada')).toHaveCount(0)
  })

  test('agregar: viene con hoy, la hora actual y los últimos responsables, y valida las horas', async ({ page, entrar, supabase }) => {
    // El último estudio de este celular lo hizo Beto (y alguien que ya no existe).
    await page.addInitScript(() => localStorage.setItem('krapi-ultimos-responsables', JSON.stringify(['r2', 'borrado'])))
    await entrar()
    await page.goto('/lugares/p1')
    await page.getByRole('button', { name: 'Agregar estudio' }).click()

    const formulario = page.getByRole('dialog', { name: 'Nuevo estudio' })
    await expect(formulario).toContainText('En Café Central')
    const [fecha, inicio, fin] = [formulario.locator('input[type="date"]'), formulario.locator('input[type="time"]').first(), formulario.locator('input[type="time"]').last()]
    await expect(fecha).toHaveValue('2026-10-30')
    await expect(inicio).toHaveValue('14:05')
    await expect(fin).toHaveValue('15:05')
    await expect(formulario.getByRole('button', { name: 'Beto' })).toHaveAttribute('aria-pressed', 'true')
    await expect(formulario.getByRole('button', { name: 'Ana' })).toHaveAttribute('aria-pressed', 'false')

    await fin.fill('13:00')
    await formulario.getByRole('button', { name: 'Guardar estudio' }).click()
    await expect(formulario.getByText('Escribe un título')).toBeVisible()
    await expect(formulario.getByText('La hora de fin debe ser posterior a la de inicio.')).toBeVisible()

    await formulario.getByPlaceholder('Ej.: Entrevista al tendero').fill('Tercera visita')
    await fin.fill('15:30')
    await formulario.getByRole('button', { name: 'Ana' }).click()
    await formulario.getByPlaceholder('Ej.: Tendero, administradora').fill('Administradora')
    await formulario.getByRole('button', { name: 'Guardar estudio' }).click()

    await expect(toast(page, 'Estudio guardado')).toBeVisible()
    const nuevo = supabase.db.estudios.find((e) => e.titulo === 'Tercera visita')
    expect(nuevo).toEqual(
      expect.objectContaining({ ubicacion_id: 'p1', fecha: '2026-10-30', hora_inicio: '14:05', hora_fin: '15:30', entrevistado: 'Administradora', descripcion: null }),
    )
    expect(supabase.db.estudio_responsables.filter((r) => r.estudio_id === nuevo!.id).map((r) => r.responsable_id)).toEqual(['r2', 'r1'])
    // Se abre la página del nuevo estudio, para agregarle evidencias.
    await expect(page).toHaveURL(`/lugares/p1/estudios/${nuevo!.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tercera visita')
    expect(await page.evaluate(() => localStorage.getItem('krapi-ultimos-responsables'))).toBe('["r2","r1"]')
  })

  test('la página del estudio muestra sus datos', async ({ page, entrar, supabase }) => {
    supabase.db.estudios[0].descripcion = 'Vende desde 1990.\nAbre los domingos.'
    await entrar()
    await page.goto('/lugares/p1')
    await page.getByRole('region', { name: /Estudios/ }).getByRole('link', { name: /Primera visita/ }).click()

    await expect(page).toHaveURL('/lugares/p1/estudios/e1')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Primera visita')
    await expect(page.locator('.panel-subtitulo')).toHaveText('Café Central')
    const datos = page.locator('.ficha-datos')
    await expect(datos).toContainText('20 oct 2026')
    await expect(datos).toContainText('Ana')
    await expect(datos).toContainText('Tendero')
    await expect(datos).toContainText('Abre los domingos.')
    await expect(page.getByRole('region', { name: 'Evidencias' })).toContainText('Aún no hay evidencias')

    await page.getByRole('link', { name: 'Volver al lugar' }).click()
    await expect(page).toHaveURL('/lugares/p1')
  })

  test('editar un estudio y archivarlo, con "Deshacer"', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/lugares/p1/estudios/e1')
    const historico = page.getByRole('region', { name: /Estudios/ })

    await page.getByRole('button', { name: 'Editar estudio' }).click()
    const formulario = page.getByRole('dialog', { name: 'Editar estudio' })
    await expect(formulario.getByRole('button', { name: 'Ana' })).toHaveAttribute('aria-pressed', 'true')
    await formulario.getByPlaceholder('Ej.: Entrevista al tendero').fill('Primera visita (mañana)')
    await formulario.getByRole('button', { name: 'Ana' }).click()
    await formulario.getByRole('button', { name: 'Beto' }).click()
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(toast(page, 'Cambios guardados')).toBeVisible()
    expect(supabase.db.estudios.find((e) => e.id === 'e1')).toEqual(expect.objectContaining({ titulo: 'Primera visita (mañana)', hora_inicio: '09:00' }))
    expect(supabase.db.estudio_responsables.filter((r) => r.estudio_id === 'e1').map((r) => r.responsable_id)).toEqual(['r2'])

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Primera visita (mañana)')
    await page.getByRole('button', { name: 'Editar estudio' }).click()
    await page.getByRole('dialog', { name: 'Editar estudio' }).getByRole('button', { name: 'Archivar estudio' }).click()
    await expect(toast(page, 'Estudio archivado')).toBeVisible()
    // Vuelve a la ficha del lugar.
    await expect(page).toHaveURL('/lugares/p1')
    await expect(historico.getByText('Primera visita (mañana)')).toHaveCount(0)
    expect(supabase.db.estudios.find((e) => e.id === 'e1')?.archivado_en).toBeTruthy()

    await toast(page, 'Estudio archivado').getByRole('button', { name: 'Deshacer' }).click()
    await expect(historico.getByText('Primera visita (mañana)')).toBeVisible()
    expect(supabase.db.estudios.find((e) => e.id === 'e1')?.archivado_en).toBeNull()
  })

  test('al crear un punto, el segundo paso es su primer estudio', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.getByRole('link', { name: 'Nuevo lugar' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByPlaceholder('Ej.: Tienda Don Pepe').fill('Tienda Don Pepe')
    await page.getByRole('button', { name: 'Siguiente: el estudio' }).click()

    const estudio = page.getByRole('dialog', { name: 'Nuevo estudio' })
    await expect(estudio).toContainText('En Tienda Don Pepe')
    // Volver a los datos no los pierde.
    await estudio.getByRole('button', { name: 'Volver a los datos del lugar' }).click()
    await expect(page.getByPlaceholder('Ej.: Tienda Don Pepe')).toHaveValue('Tienda Don Pepe')
    await page.getByRole('button', { name: 'Siguiente: el estudio' }).click()

    await estudio.getByPlaceholder('Ej.: Entrevista al tendero').fill('Primera visita')
    await estudio.getByRole('button', { name: 'Guardar lugar y estudio' }).click()

    await expect(toast(page, 'Lugar y estudio guardados')).toBeVisible()
    const lugar = supabase.db.ubicaciones.find((u) => u.nombre === 'Tienda Don Pepe')
    expect(lugar).toBeTruthy()
    const estudios = supabase.db.estudios.filter((e) => e.ubicacion_id === lugar!.id)
    expect(estudios).toEqual([expect.objectContaining({ titulo: 'Primera visita', fecha: '2026-10-30', hora_inicio: '14:05', hora_fin: '15:05' })])
    await expect(page).toHaveURL(`/lugares/${lugar!.id}/estudios/${estudios[0].id}`)
    await expect(page.getByRole('button', { name: 'Agregar evidencia' })).toBeVisible()
  })

  test('si el lugar ya existe a menos de 15 m, se le agrega el estudio sin crear otro', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones.push({ id: 'p2', tipo: 'punto', nombre: 'Tienda vieja', categoria_id: null, estado: 'activa', geom: { type: 'Point', coordinates: CENTRO_MANILA } })
    await entrar()
    await page.getByRole('link', { name: 'Nuevo lugar' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('dialog', { name: '¿Es alguno de estos lugares?' }).getByRole('button', { name: /Tienda vieja/ }).click()

    const estudio = page.getByRole('dialog', { name: 'Nuevo estudio' })
    await expect(estudio).toContainText('En Tienda vieja')
    await estudio.getByPlaceholder('Ej.: Entrevista al tendero').fill('Segunda visita')
    await estudio.getByRole('button', { name: 'Guardar estudio' }).click()

    await expect(toast(page, 'Estudio guardado')).toBeVisible()
    expect(supabase.db.ubicaciones).toHaveLength(2)
    const estudios = supabase.db.estudios.filter((e) => e.ubicacion_id === 'p2')
    expect(estudios).toEqual([expect.objectContaining({ titulo: 'Segunda visita' })])
    await expect(page).toHaveURL(`/lugares/p2/estudios/${estudios[0].id}`)
  })
})
