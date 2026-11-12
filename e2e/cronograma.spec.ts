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
    expect(supabase.db.cronograma_tareas[0]).toMatchObject({ fragmento_id: 'f1' })
    expect(supabase.db.cronograma_tarea_responsables).toHaveLength(0)

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

  test('los responsables son opcionales y se eligen como los participantes: varias cuentas con su carita', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push({ id: 'f1', titulo: 'Semana 1', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' })
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'Entrevistar a los comerciantes', hecha_en: null })
    await entrar()
    await page.goto('/cronograma')
    await expect(page.getByText(/Responsables?:/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Editar la tarea «Entrevistar a los comerciantes»' }).click()
    const formulario = page.getByRole('dialog', { name: 'Editar tarea' })
    // Cada cuenta activa es un botón con su avatar; una cuenta pendiente no se ofrece.
    await expect(formulario.getByRole('button', { name: 'Ana Gómez' })).toHaveAttribute('aria-pressed', 'false')
    await expect(formulario.getByRole('button', { name: 'Pepe Pérez' })).toHaveCount(0)
    await expect(formulario.locator('.chip .avatar')).toHaveCount(2)
    await formulario.getByRole('button', { name: 'Ana Gómez' }).click()
    await formulario.getByRole('button', { name: 'Admin Kratos' }).click()
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Cambios guardados')).toBeVisible()
    expect(supabase.db.cronograma_tarea_responsables.map((r) => r.usuario_id)).toEqual([CUENTAS.miembro.id, CUENTAS.admin.id])
    await expect(page.getByText('Responsables: Ana Gómez, Admin Kratos')).toBeVisible()
    await expect(page.locator('.cronograma-avatares .avatar')).toHaveCount(2)

    // Se quita una y se conserva la otra.
    await page.getByRole('button', { name: 'Editar la tarea «Entrevistar a los comerciantes»' }).click()
    await expect(formulario.getByRole('button', { name: 'Ana Gómez' })).toHaveAttribute('aria-pressed', 'true')
    await formulario.getByRole('button', { name: 'Ana Gómez' }).click()
    await formulario.getByLabel('Tarea').fill('Entrevistar a 5 comerciantes')
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Responsable: Admin Kratos')).toBeVisible()
    expect(supabase.db.cronograma_tareas[0].texto).toBe('Entrevistar a 5 comerciantes')
    expect(supabase.db.cronograma_tarea_responsables.map((r) => r.usuario_id)).toEqual([CUENTAS.admin.id])

    // Y se puede quedar sin ninguna.
    await page.getByRole('button', { name: 'Editar la tarea «Entrevistar a 5 comerciantes»' }).click()
    await formulario.getByRole('button', { name: 'Admin Kratos' }).click()
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText(/Responsables?:/)).toHaveCount(0)
    expect(supabase.db.cronograma_tarea_responsables).toHaveLength(0)
  })

  test('una tarea sin texto no se guarda y se puede borrar', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push({ id: 'f1', titulo: 'Semana 1', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' })
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'Tarea de prueba', hecha_en: null })
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
    await expect(page.getByRole('region', { name: 'En curso' }).getByText('Sin tareas')).toBeVisible()
  })

  test('edita las fechas de un fragmento y lo borra con confirmación, junto con sus tareas', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push({ id: 'f1', titulo: 'Semana 1', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' })
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'Una', hecha_en: null })
    supabase.db.cronograma_tarea_responsables.push({ tarea_id: 't1', usuario_id: CUENTAS.miembro.id })
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
    expect(supabase.db.cronograma_tarea_responsables).toHaveLength(0)
    await expect(page.getByText('Aún no hay fragmentos')).toBeVisible()
  })

  test('agrupa en curso, próximos y anteriores; los anteriores quedan recogidos', async ({ page, entrar, supabase }) => {
    supabase.db.cronograma_fragmentos.push(
      { id: 'f-pasado', titulo: 'Octubre', fecha_inicio: '2026-10-01', fecha_fin: '2026-10-07' },
      { id: 'f-hoy', titulo: 'Esta semana', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' },
      { id: 'f-lejano', titulo: 'Diciembre', fecha_inicio: '2026-12-07', fecha_fin: '2026-12-13' },
      { id: 'f-cercano', titulo: 'Próxima semana', fecha_inicio: '2026-11-16', fecha_fin: '2026-11-22' },
    )
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f-pasado', texto: 'Cerrar octubre', hecha_en: null })
    supabase.db.cronograma_tareas.push({ id: 't2', fragmento_id: 'f-hoy', texto: 'Trabajo de hoy', hecha_en: null })
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
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'De otra persona', hecha_en: null, creado_por: CUENTAS.admin.id })
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
    supabase.db.cronograma_tareas.push({ id: 't1', fragmento_id: 'f1', texto: 'Una_tarea_con_una_palabra_larguísima_'.repeat(4), hecha_en: null })
    supabase.db.cronograma_tarea_responsables.push({ tarea_id: 't1', usuario_id: CUENTAS.miembro.id }, { tarea_id: 't1', usuario_id: CUENTAS.admin.id })
    await entrar()
    await page.goto('/cronograma')
    await expect(page.getByRole('checkbox')).toBeVisible()
    const sinDesborde = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(sinDesborde).toBe(true)
  })

  test.describe('Resumen de arriba', () => {
    const resumen = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Cómo va el cronograma' })
    const cifra = (page: import('@playwright/test').Page, etiqueta: string) => resumen(page).locator('.analitica-cifra', { hasText: etiqueta })

    /** Octubre ya venció; esta semana va en el día 4 de 7; diciembre no ha empezado. */
    function preparar(supabase: import('./soporte/supabase-falso').SupabaseFalso) {
      supabase.db.cronograma_fragmentos.push(
        { id: 'f-oct', titulo: 'Octubre', fecha_inicio: '2026-10-01', fecha_fin: '2026-10-07' },
        { id: 'f-hoy', titulo: 'Esta semana', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' },
        { id: 'f-dic', titulo: 'Diciembre', fecha_inicio: '2026-12-07', fecha_fin: '2026-12-13' },
      )
      supabase.db.cronograma_tareas.push(
        { id: 'o1', fragmento_id: 'f-oct', texto: 'Octubre a tiempo', hecha_en: '2026-10-05T15:00:00-05:00' },
        // Las 11:30 p. m. del último día en Colombia ya son el día siguiente en UTC: sigue siendo a tiempo.
        { id: 'o2', fragmento_id: 'f-oct', texto: 'Octubre en el último minuto', hecha_en: '2026-10-07T23:30:00-05:00' },
        { id: 'o3', fragmento_id: 'f-oct', texto: 'Octubre tarde', hecha_en: '2026-10-09T15:00:00-05:00' },
        { id: 'o4', fragmento_id: 'f-oct', texto: 'Octubre pendiente', hecha_en: null },
        { id: 'h1', fragmento_id: 'f-hoy', texto: 'Hoy hecha', hecha_en: '2026-11-10T10:00:00-05:00' },
        { id: 'h2', fragmento_id: 'f-hoy', texto: 'Hoy pendiente uno', hecha_en: null },
        { id: 'h3', fragmento_id: 'f-hoy', texto: 'Hoy pendiente dos', hecha_en: null },
        { id: 'h4', fragmento_id: 'f-hoy', texto: 'Hoy pendiente tres', hecha_en: null },
        { id: 'd1', fragmento_id: 'f-dic', texto: 'Diciembre pendiente', hecha_en: null },
      )
    }

    test('muestra cómo vamos con las tareas y con las entregas', async ({ page, entrar, supabase }) => {
      preparar(supabase)
      await entrar()
      await page.goto('/cronograma')

      // 4 de 9 tareas hechas.
      await expect(cifra(page, 'Avance')).toContainText('44 %')
      await expect(cifra(page, 'Avance')).toContainText('4 de 9 tareas')
      // Octubre ya se entregó y le queda una pendiente.
      await expect(cifra(page, 'Vencidas sin hacer')).toContainText('1')
      await expect(cifra(page, 'Vencidas sin hacer')).toContainText('en 1 fragmento ya entregado')
      // De las 4 hechas, 3 llegaron hasta el día de fin de su fragmento y 1 después.
      await expect(cifra(page, 'Hechas a tiempo')).toContainText('75 %')
      await expect(cifra(page, 'Hechas a tiempo')).toContainText('3 a tiempo · 1 tarde')
      // Esta semana termina el 15: quedan 3 días; 1 de 4 tareas (25 %) frente al 57 % del tiempo.
      await expect(cifra(page, 'Entrega en curso')).toContainText('3 días')
      await expect(cifra(page, 'Entrega en curso')).toContainText('25 % de las tareas · 57 % del tiempo')
    })

    test('la gráfica compara las tareas con el tiempo de cada fragmento', async ({ page, entrar, supabase }) => {
      preparar(supabase)
      await entrar()
      await page.goto('/cronograma')

      const fila = (titulo: string) => resumen(page).locator('.cronograma-grafica-fila', { hasText: titulo })
      await expect(resumen(page).locator('.cronograma-grafica-fila')).toHaveCount(3)

      await expect(fila('Octubre')).toContainText('Vencido con pendientes')
      await expect(fila('Octubre')).toContainText('Entrega: 7 oct 2026')
      await expect(fila('Octubre').locator('.cronograma-grafica-barra', { hasText: 'Tareas' })).toContainText('75 %')
      await expect(fila('Octubre').locator('.cronograma-grafica-barra', { hasText: 'Tiempo' })).toContainText('100 %')

      await expect(fila('Esta semana')).toContainText('Atrasado')
      await expect(fila('Esta semana').locator('.cronograma-grafica-barra', { hasText: 'Tareas' })).toContainText('25 %')
      await expect(fila('Esta semana').locator('.cronograma-grafica-barra', { hasText: 'Tiempo' })).toContainText('57 %')

      await expect(fila('Diciembre')).toContainText('Por empezar')
      await expect(fila('Diciembre').locator('.cronograma-grafica-barra', { hasText: 'Tiempo' })).toContainText('0 %')
    })

    test('marcar una tarea mueve las cifras y el estado del fragmento', async ({ page, entrar, supabase }) => {
      preparar(supabase)
      await entrar()
      await page.goto('/cronograma')
      const fila = resumen(page).locator('.cronograma-grafica-fila', { hasText: 'Esta semana' })
      await expect(fila).toContainText('Atrasado')

      await page.getByRole('checkbox', { name: 'Hoy pendiente uno' }).check()
      // Ahora van 2 de 4 (50 %), por encima del 42 % que se pide a esta altura: al día.
      await expect(fila).toContainText('Al día')
      await expect(cifra(page, 'Avance')).toContainText('5 de 9 tareas')
      // Se marcó dentro de la semana: cuenta como a tiempo.
      await expect(cifra(page, 'Hechas a tiempo')).toContainText('4 a tiempo · 1 tarde')
    })

    test('sin tareas no inventa porcentajes, y sin fragmentos no aparece', async ({ page, entrar, supabase }) => {
      await entrar()
      await page.goto('/cronograma')
      await expect(resumen(page)).toHaveCount(0)

      supabase.db.cronograma_fragmentos.push({ id: 'f1', titulo: 'Vacío', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' })
      await page.reload()
      await expect(cifra(page, 'Avance')).toContainText('—')
      await expect(cifra(page, 'Avance')).toContainText('Aún no hay tareas')
      await expect(cifra(page, 'Hechas a tiempo')).toContainText('Aún no hay tareas hechas')
      await expect(cifra(page, 'Vencidas sin hacer')).toContainText('Nada vencido')
      await expect(resumen(page).locator('.cronograma-grafica-fila')).toContainText('Sin tareas')
    })

    test('cabe en 320 px', async ({ page, entrar, supabase }) => {
      await page.setViewportSize({ width: 320, height: 700 })
      preparar(supabase)
      await entrar()
      await page.goto('/cronograma')
      await expect(resumen(page)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  })
})
