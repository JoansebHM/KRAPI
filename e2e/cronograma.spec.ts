import { CUENTAS } from './soporte/supabase-falso'
import { expect, test, toast } from './soporte/fixtures'

test.describe('Cronograma', () => {
  test.beforeEach(async ({ page }) => {
    // Hoy es el 12 de noviembre de 2026.
    await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-05:00'))
  })

  test('se llega desde el menú y, sin fragmentos, invita a crear el primero', async ({ page, entrar }) => {
    await entrar()
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('link', { name: 'Cronograma' }).click()

    await expect(page).toHaveURL(/\/cronograma$/)
    await expect(page.getByRole('heading', { name: 'Cronograma' })).toBeVisible()
    await expect(page.getByText('Aún no hay fragmentos')).toBeVisible()
  })

  test('crea un fragmento con fechas libres y título opcional', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/cronograma')

    await page.getByRole('button', { name: 'Nuevo fragmento' }).click()
    const formulario = page.getByRole('dialog', { name: 'Nuevo fragmento' })
    // Por defecto: hoy y los 6 días siguientes.
    await expect(formulario.getByLabel('Desde')).toHaveValue('2026-11-12')
    await expect(formulario.getByLabel('Hasta')).toHaveValue('2026-11-18')

    // La fecha de fin no puede ser antes de la de inicio.
    await formulario.getByLabel('Desde').fill('2026-11-20')
    await formulario.getByRole('button', { name: 'Crear fragmento' }).click()
    await expect(formulario.getByText('La fecha de fin no puede ser antes de la de inicio.')).toBeVisible()
    expect(supabase.db.cronograma_fragmentos).toHaveLength(0)

    await formulario.getByLabel('Desde').fill('2026-11-03')
    await formulario.getByLabel('Hasta').fill('2026-11-14')
    await formulario.getByLabel('Título (opcional)').fill('Semana de entrevistas')
    await formulario.getByRole('button', { name: 'Crear fragmento' }).click()

    await expect(toast(page, 'Fragmento creado')).toBeVisible()
    expect(supabase.db.cronograma_fragmentos[0]).toMatchObject({ titulo: 'Semana de entrevistas', fecha_inicio: '2026-11-03', fecha_fin: '2026-11-14' })
    // Hoy cae dentro del rango: queda en curso.
    const grupo = page.getByRole('region', { name: 'En curso' })
    await expect(grupo.getByText('Semana de entrevistas')).toBeVisible()
    await expect(grupo.getByText('3 nov 2026 – 14 nov 2026')).toBeVisible()
    await expect(grupo.getByText('Sin tareas')).toBeVisible()
  })

  test('sin título se muestra el rango de fechas', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/cronograma')
    await page.getByRole('button', { name: 'Nuevo fragmento' }).click()
    await page.getByRole('dialog', { name: 'Nuevo fragmento' }).getByRole('button', { name: 'Crear fragmento' }).click()

    await expect(toast(page, 'Fragmento creado')).toBeVisible()
    expect(supabase.db.cronograma_fragmentos[0].titulo).toBeNull()
    await expect(page.getByRole('region', { name: 'En curso' }).getByText('12 nov 2026 – 18 nov 2026')).toBeVisible()
  })

  test('agrega tareas, las marca como hechas y se ve el avance', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push({ id: 'f1', titulo: 'Semana 1', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' })
    await entrar()
    await page.goto('/cronograma')

    const campo = page.getByLabel('Nueva tarea')
    await campo.fill('Visitar la calle 10')
    await campo.press('Enter')
    await expect(page.getByRole('checkbox', { name: 'Visitar la calle 10' })).toBeVisible()
    await expect(campo).toHaveValue('')
    await campo.fill('Subir las fotos')
    await page.getByRole('button', { name: 'Agregar', exact: true }).click()
    await expect(page.getByText('0 de 2 hechas')).toBeVisible()
    expect(supabase.db.cronograma_tareas.map((t) => t.texto)).toEqual(['Visitar la calle 10', 'Subir las fotos'])
    expect(supabase.db.cronograma_tareas[0]).toMatchObject({ fragmento_id: 'f1', responsable_id: null })

    await page.getByRole('checkbox', { name: 'Visitar la calle 10' }).check()
    await expect(page.getByText('1 de 2 hechas')).toBeVisible()
    await expect.poll(() => supabase.db.cronograma_tareas[0].hecha_en).not.toBeNull()
    // Queda registrado quién la marcó.
    expect(supabase.db.cronograma_tareas[0].hecha_por).toBe(CUENTAS.admin.id)

    await page.getByRole('checkbox', { name: 'Visitar la calle 10' }).uncheck()
    await expect(page.getByText('0 de 2 hechas')).toBeVisible()
    await expect.poll(() => supabase.db.cronograma_tareas[0].hecha_en).toBeNull()
    expect(supabase.db.cronograma_tareas[0].hecha_por).toBeNull()
  })

  test('el responsable es opcional: se puede poner, cambiar y quitar', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push({ id: 'f1', titulo: 'Semana 1', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' })
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'Entrevistar a los comerciantes', responsable_id: null, hecha_en: null })
    await entrar()
    await page.goto('/cronograma')
    await expect(page.getByText(/Responsable:/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Editar la tarea «Entrevistar a los comerciantes»' }).click()
    const formulario = page.getByRole('dialog', { name: 'Editar tarea' })
    await formulario.getByLabel('Responsable (opcional)').selectOption({ label: 'Ana Gómez' })
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Cambios guardados')).toBeVisible()
    expect(supabase.db.cronograma_tareas[0].responsable_id).toBe(CUENTAS.miembro.id)
    await expect(page.getByText('Responsable: Ana Gómez')).toBeVisible()

    await page.getByRole('button', { name: 'Editar la tarea «Entrevistar a los comerciantes»' }).click()
    await formulario.getByLabel('Responsable (opcional)').selectOption({ label: 'Sin responsable' })
    await formulario.getByLabel('Tarea').fill('Entrevistar a 5 comerciantes')
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Cambios guardados').first()).toBeVisible()
    expect(supabase.db.cronograma_tareas[0]).toMatchObject({ texto: 'Entrevistar a 5 comerciantes', responsable_id: null })
    await expect(page.getByText(/Responsable:/)).toHaveCount(0)
  })

  test('una tarea sin texto no se guarda y se puede borrar', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push({ id: 'f1', titulo: 'Semana 1', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' })
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'Tarea de prueba', responsable_id: null, hecha_en: null })
    await entrar()
    await page.goto('/cronograma')

    await page.getByRole('button', { name: 'Editar la tarea «Tarea de prueba»' }).click()
    const formulario = page.getByRole('dialog', { name: 'Editar tarea' })
    await formulario.getByLabel('Tarea').fill('   ')
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(formulario.getByText('Escribe qué hay que hacer.')).toBeVisible()
    expect(supabase.db.cronograma_tareas[0].texto).toBe('Tarea de prueba')

    await formulario.getByRole('button', { name: 'Borrar tarea' }).click()
    await expect(toast(page, 'Tarea borrada')).toBeVisible()
    expect(supabase.db.cronograma_tareas).toHaveLength(0)
    await expect(page.getByText('Sin tareas')).toBeVisible()
  })

  test('edita las fechas de un fragmento y lo borra con confirmación, junto con sus tareas', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push({ id: 'f1', titulo: 'Semana 1', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' })
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'Una', responsable_id: null, hecha_en: null })
    await entrar()
    await page.goto('/cronograma')

    await page.getByRole('button', { name: 'Editar fragmento' }).click()
    const formulario = page.getByRole('dialog', { name: 'Editar fragmento' })
    await formulario.getByLabel('Hasta').fill('2026-11-20')
    await formulario.getByLabel('Título (opcional)').fill('')
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Cambios guardados')).toBeVisible()
    expect(supabase.db.cronograma_fragmentos[0]).toMatchObject({ titulo: null, fecha_fin: '2026-11-20' })
    await expect(page.getByText('9 nov 2026 – 20 nov 2026').first()).toBeVisible()

    await page.getByRole('button', { name: 'Editar fragmento' }).click()
    await page.getByRole('dialog', { name: 'Editar fragmento' }).getByRole('button', { name: 'Borrar fragmento' }).click()
    const confirmacion = page.getByRole('dialog', { name: /¿Borrar/ })
    await expect(confirmacion.getByText('No se puede deshacer.')).toBeVisible()
    await confirmacion.getByRole('button', { name: 'Cancelar' }).click()
    expect(supabase.db.cronograma_fragmentos).toHaveLength(1)

    await page.getByRole('button', { name: 'Editar fragmento' }).click()
    await page.getByRole('dialog', { name: 'Editar fragmento' }).getByRole('button', { name: 'Borrar fragmento' }).click()
    await page.getByRole('dialog', { name: /¿Borrar/ }).getByRole('button', { name: 'Borrar', exact: true }).click()
    await expect(toast(page, 'Fragmento borrado')).toBeVisible()
    expect(supabase.db.cronograma_fragmentos).toHaveLength(0)
    expect(supabase.db.cronograma_tareas).toHaveLength(0)
    await expect(page.getByText('Aún no hay fragmentos')).toBeVisible()
  })

  test('agrupa en curso, próximos y anteriores; los anteriores quedan recogidos', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push(
      { id: 'f-pasado', titulo: 'Octubre', fecha_inicio: '2026-10-01', fecha_fin: '2026-10-07' },
      { id: 'f-hoy', titulo: 'Esta semana', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' },
      { id: 'f-lejano', titulo: 'Diciembre', fecha_inicio: '2026-12-07', fecha_fin: '2026-12-13' },
      { id: 'f-cercano', titulo: 'Próxima semana', fecha_inicio: '2026-11-16', fecha_fin: '2026-11-22' },
    )
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f-pasado', texto: 'Cerrar octubre', responsable_id: null, hecha_en: null })
    supabase.db.cronograma_tareas.push({ id: 't2', fragmento_id: 'f-hoy', texto: 'Trabajo de hoy', responsable_id: null, hecha_en: null })
    await entrar()
    await page.goto('/cronograma')

    await expect(page.getByRole('region', { name: 'En curso' }).getByText('Esta semana')).toBeVisible()
    await expect(page.getByRole('region', { name: 'En curso' }).getByText('En curso', { exact: true }).first()).toBeVisible()
    // Los próximos van del más cercano al más lejano.
    await expect(page.getByRole('region', { name: 'Próximos' }).locator('.cronograma-titulo')).toHaveText(['Próxima semana', 'Diciembre'])
    // Lo de hoy se ve desplegado; lo anterior, recogido hasta tocarlo.
    await expect(page.getByRole('checkbox', { name: 'Trabajo de hoy' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Cerrar octubre' })).toBeHidden()
    await page.getByRole('region', { name: 'Anteriores' }).locator('.cronograma-titulo', { hasText: 'Octubre' }).click()
    await expect(page.getByRole('checkbox', { name: 'Cerrar octubre' })).toBeVisible()
  })

  test('cualquier cuenta activa puede editar el cronograma', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push({ id: 'f1', titulo: 'Semana 1', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15', creado_por: CUENTAS.admin.id })
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'De otra persona', responsable_id: null, hecha_en: null, creado_por: CUENTAS.admin.id })
    await entrar('miembro')
    await page.goto('/cronograma')

    await page.getByRole('checkbox', { name: 'De otra persona' }).check()
    await expect(page.getByText('1 de 1 hechas')).toBeVisible()
    expect(supabase.db.cronograma_tareas[0].hecha_por).toBe(CUENTAS.miembro.id)

    await page.getByRole('button', { name: 'Editar la tarea «De otra persona»' }).click()
    await page.getByRole('dialog', { name: 'Editar tarea' }).getByRole('button', { name: 'Borrar tarea' }).click()
    await expect(toast(page, 'Tarea borrada')).toBeVisible()
    expect(supabase.db.cronograma_tareas).toHaveLength(0)
  })

  test('no se desborda a 320 px con textos largos', async ({ page, entrar, supabase }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    supabase.db.cronograma_fragmentos.push({
      id: 'f1',
      titulo: 'Un título muy largo para un fragmento del cronograma que no debería romper el diseño',
      fecha_inicio: '2026-11-09',
      fecha_fin: '2026-11-15',
    })
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'Una_tarea_con_una_palabra_larguísima_'.repeat(4), responsable_id: CUENTAS.miembro.id, hecha_en: null })
    await entrar()
    await page.goto('/cronograma')
    await expect(page.getByRole('checkbox')).toBeVisible()
    const sinDesborde = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(sinDesborde).toBe(true)
  })
})
