import { expect, test, toast } from './soporte/fixtures'

const CENTRO_MANILA = [-75.57402095, 6.21293365]

test.describe('Estudios', () => {
  test.beforeEach(async ({ page, supabase }) => {
    // 30 de octubre de 2026, 2:05 p. m. en Medellín.
    await page.clock.setFixedTime(new Date('2026-10-30T14:05:00-05:00'))
    supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })
    supabase.agregarCuenta({ usuario: 'beto', nombre: 'Beto', avatar_semilla: 'beto' })
    supabase.db.ubicaciones.push({
      id: 'p1',
      tipo: 'punto',
      nombre: 'Café Central',
      categoria_id: 'c1',
      estado: 'activa',
      geom: { type: 'Point', coordinates: [-75.576, 6.214] },
    })
    supabase.db.estudios.push(
      { id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', titulo: 'Primera visita', entrevistado: 'Tendero', archivado_en: null },
      { id: 'e2', ubicacion_id: 'p1', fecha: '2026-10-22', hora_inicio: '15:00:00', hora_fin: '16:30:00', titulo: 'Segunda visita', entrevistado: null, archivado_en: null },
      { id: 'e3', ubicacion_id: 'p1', fecha: '2026-10-21', hora_inicio: '08:00:00', hora_fin: '09:00:00', titulo: 'Visita archivada', entrevistado: null, archivado_en: '2026-10-21T20:00:00Z' },
    )
    supabase.db.estudio_participantes.push({ estudio_id: 'e1', usuario_id: 'u-ana' })
  })

  test('la ficha muestra el histórico del más reciente al más antiguo, sin los archivados', async ({ page, entrar }) => {
    await entrar()
    await page.goto('/lugares/p1')
    const historico = page.getByRole('region', { name: /Estudios/ })

    const estudios = historico.getByRole('button')
    await expect(estudios).toHaveCount(2)
    await expect(estudios.nth(0)).toContainText('Segunda visita')
    await expect(estudios.nth(1)).toContainText('Primera visita')
    await expect(estudios.nth(1)).toContainText('20 oct 2026')
    await expect(estudios.nth(1)).toContainText('Entrevista: Tendero')
    await expect(estudios.nth(1)).toContainText('Participantes: Ana Gómez')
    await expect(historico.getByText('Visita archivada')).toHaveCount(0)
  })

  test('agregar: viene con hoy, la hora actual, la cuenta propia y los últimos participantes, y valida las horas', async ({ page, entrar, supabase }) => {
    // El último estudio de este celular lo hizo Beto (y alguien que ya no existe).
    await page.addInitScript(() => localStorage.setItem('krapi-ultimos-participantes', JSON.stringify(['u-beto', 'borrado'])))
    await entrar()
    await page.goto('/lugares/p1')
    await page.getByRole('button', { name: 'Agregar estudio' }).click()

    const formulario = page.getByRole('dialog', { name: 'Nuevo estudio' })
    await expect(formulario).toContainText('En Café Central')
    const [fecha, inicio, fin] = [formulario.locator('input[type="date"]'), formulario.locator('input[type="time"]').first(), formulario.locator('input[type="time"]').last()]
    await expect(fecha).toHaveValue('2026-10-30')
    await expect(inicio).toHaveValue('14:05')
    await expect(fin).toHaveValue('15:05')
    await expect(formulario.getByRole('button', { name: 'Admin Kratos' })).toHaveAttribute('aria-pressed', 'true')
    await expect(formulario.getByRole('button', { name: 'Beto' })).toHaveAttribute('aria-pressed', 'true')
    await expect(formulario.getByRole('button', { name: 'Ana Gómez' })).toHaveAttribute('aria-pressed', 'false')
    // Una cuenta pendiente no se puede elegir.
    await expect(formulario.getByRole('button', { name: 'Pepe Pérez' })).toHaveCount(0)

    await fin.fill('13:00')
    await formulario.getByRole('button', { name: 'Guardar estudio' }).click()
    await expect(formulario.getByText('Escribe un título')).toBeVisible()
    await expect(formulario.getByText('La hora de fin debe ser posterior a la de inicio.')).toBeVisible()

    await formulario.getByPlaceholder('Ej.: Entrevista al tendero').fill('Tercera visita')
    await fin.fill('15:30')
    await formulario.getByRole('button', { name: 'Ana Gómez' }).click()
    await formulario.getByPlaceholder('Ej.: Tendero, administradora').fill('Administradora')
    await formulario.getByRole('button', { name: 'Guardar estudio' }).click()

    await expect(toast(page, 'Estudio guardado')).toBeVisible()
    const nuevo = supabase.db.estudios.find((e) => e.titulo === 'Tercera visita')
    expect(nuevo).toEqual(
      expect.objectContaining({ ubicacion_id: 'p1', fecha: '2026-10-30', hora_inicio: '14:05', hora_fin: '15:30', entrevistado: 'Administradora', notas: [] }),
    )
    expect(supabase.db.estudio_participantes.filter((p) => p.estudio_id === nuevo!.id).map((p) => p.usuario_id)).toEqual(['u-admin', 'u-beto', 'u-ana'])
    // Se abre la página del nuevo estudio, para agregarle evidencias.
    await expect(page).toHaveURL(`/lugares/p1/estudios/${nuevo!.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tercera visita')
    expect(await page.evaluate(() => localStorage.getItem('krapi-ultimos-participantes'))).toBe('["u-admin","u-beto","u-ana"]')
  })

  test('los participantes de antes que no tenían cuenta se muestran por su nombre', async ({ page, entrar, supabase }) => {
    supabase.db.estudios[0].participantes_anteriores = ['Beto (sin cuenta)', 'Caro']
    await entrar()
    await page.goto('/lugares/p1')
    await page.getByRole('region', { name: /Estudios/ }).getByRole('button', { name: /Primera visita/ }).click()
    const datos = page.getByRole('dialog', { name: 'Primera visita' }).locator('.estudio-presentacion-datos')
    await expect(datos).toContainText('Ana Gómez')
    await expect(datos).toContainText('También participó: Beto (sin cuenta), Caro')
  })

  test('la presentación muestra los datos del estudio en un modal', async ({ page, entrar, supabase }) => {
    supabase.db.estudios[0].notas = ['Vende desde 1990.\nAbre los domingos.']
    await entrar()
    await page.goto('/lugares/p1')
    await page.getByRole('region', { name: /Estudios/ }).getByRole('button', { name: /Primera visita/ }).click()

    const presentacion = page.getByRole('dialog', { name: 'Primera visita' })
    await expect(page).toHaveURL('/lugares/p1')
    await expect(presentacion).toContainText('Café Central')
    const datos = presentacion.locator('.estudio-presentacion-datos')
    await expect(datos).toContainText('20 oct 2026')
    await expect(datos).toContainText('Ana')
    await expect(datos).toContainText('Tendero')
    await expect(presentacion.locator('.estudio-notas')).toContainText('Notas1')
    await expect(presentacion).toContainText('Este estudio todavía no tiene fotos.')
    await expect(presentacion.getByRole('button', { name: 'Editar estudio' })).toBeVisible()
    await expect(presentacion.getByRole('button', { name: 'Agregar evidencia' })).toBeVisible()
    const cerrarDialogo = presentacion.getByRole('button', { name: 'Cerrar diálogo' })
    await expect(cerrarDialogo).toBeVisible()
    await expect(cerrarDialogo).toHaveCSS('width', '44px')
    await expect(presentacion.locator('.dialog-actions')).toContainText('Cerrar')

    await cerrarDialogo.click()
    await expect(presentacion).toBeHidden()
  })

  test('presenta el carrusel y otras evidencias, y permite editar desde el modal', async ({ page, entrar, supabase }) => {
    supabase.db.evidencias.push(
      {
        id: 'foto1',
        estudio_id: 'e1',
        tipo: 'foto',
        titulo: 'Fachada',
        archivo_path: 'e1/fachada.jpg',
        archivo_nombre: 'fachada.jpg',
        archivo_mime: 'image/jpeg',
        archivo_bytes: 1500,
        proveedor: 'supabase',
        created_at: '2026-10-20T10:00:00Z',
      },
      {
        id: 'foto2',
        estudio_id: 'e1',
        tipo: 'foto',
        titulo: 'Interior',
        archivo_path: 'e1/interior.jpg',
        archivo_nombre: 'interior.jpg',
        archivo_mime: 'image/jpeg',
        archivo_bytes: 1800,
        proveedor: 'supabase',
        created_at: '2026-10-20T09:30:00Z',
      },
      {
        id: 'audio1',
        estudio_id: 'e1',
        tipo: 'audio',
        titulo: 'Entrevista',
        archivo_path: 'e1/entrevista.webm',
        archivo_nombre: 'entrevista.webm',
        archivo_mime: 'audio/webm',
        archivo_bytes: 2300,
        proveedor: 'supabase',
        created_at: '2026-10-20T09:00:00Z',
      },
      {
        id: 'documento1',
        estudio_id: 'e1',
        tipo: 'documento',
        titulo: null,
        archivo_path: 'e1/informe.pdf',
        archivo_nombre: 'informe.pdf',
        archivo_mime: 'application/pdf',
        archivo_bytes: 3200,
        proveedor: 'supabase',
        created_at: '2026-10-20T08:30:00Z',
      },
      {
        id: 'texto1',
        estudio_id: 'e1',
        tipo: 'texto',
        titulo: 'Observación',
        texto: 'El local tiene una entrada lateral.',
        url_externa: null,
        archivo_path: null,
        archivo_nombre: null,
        archivo_mime: null,
        archivo_bytes: null,
        proveedor: null,
        created_at: '2026-10-20T08:00:00Z',
      },
      {
        id: 'video1',
        estudio_id: 'e1',
        tipo: 'video',
        titulo: 'Recorrido',
        texto: null,
        url_externa: 'https://sharepoint.test/recorrido',
        archivo_path: null,
        archivo_nombre: null,
        archivo_mime: null,
        archivo_bytes: null,
        proveedor: 'sharepoint',
        created_at: '2026-10-19T23:00:00Z',
      },
    )
    supabase.archivos.set('e1/fachada.jpg', { tipo: 'image/jpeg', bytes: 1500 })
    supabase.archivos.set('e1/interior.jpg', { tipo: 'image/jpeg', bytes: 1800 })
    supabase.archivos.set('e1/entrevista.webm', { tipo: 'audio/webm', bytes: 2300 })
    supabase.archivos.set('e1/informe.pdf', { tipo: 'application/pdf', bytes: 3200 })

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await entrar()
    await page.goto('/lugares/p1')
    await page.getByRole('region', { name: /Estudios/ }).getByRole('button', { name: /Primera visita/ }).click()

    const presentacion = page.getByRole('dialog', { name: 'Primera visita' })
    await page.setViewportSize({ width: 320, height: 740 })
    await expect(presentacion).toHaveJSProperty('scrollWidth', await presentacion.evaluate((dialog) => dialog.clientWidth))
    await expect.poll(() => presentacion.evaluate((dialog) => dialog.getBoundingClientRect().top)).toBeGreaterThanOrEqual(16)
    await page.setViewportSize({ width: 390, height: 800 })
    await expect.poll(() => presentacion.evaluate((dialog) => dialog.getBoundingClientRect().top)).toBeGreaterThanOrEqual(16)
    await expect(presentacion.locator('.dialog-actions')).toHaveCSS('position', 'static')
    await expect(presentacion.locator('.dialog-body')).toHaveCSS('overflow-y', 'visible')
    await expect(presentacion.getByRole('img', { name: 'Fachada' })).toBeVisible()
    await expect(presentacion.getByRole('heading', { name: 'Fotos' })).toBeVisible()
    await expect(presentacion.getByText('1 de 2')).toBeVisible()
    await presentacion.getByRole('button', { name: 'Foto siguiente' }).click()
    await expect(presentacion.getByRole('img', { name: 'Interior' })).toBeVisible()
    await expect(presentacion.getByText('2 de 2')).toBeVisible()
    const audio = presentacion.locator('audio')
    const reproductor = presentacion.locator('.estudio-audio')
    const avance = reproductor.getByRole('slider', { name: 'Avance de Entrevista' })
    await expect(reproductor.getByRole('button', { name: 'Reproducir Entrevista' })).toBeVisible()
    await audio.evaluate((element) => {
      Object.defineProperty(element, 'duration', { configurable: true, value: 120 })
      element.dispatchEvent(new Event('loadedmetadata'))
    })
    await expect(avance).toBeEnabled()
    await avance.focus()
    await avance.press('End')
    await expect(audio).toHaveJSProperty('currentTime', 120)
    await expect(avance).toHaveAttribute('aria-valuetext', '2:00 de 2:00')
    await expect(reproductor).toContainText('2:00')
    const velocidadAudio = presentacion.getByRole('group', { name: 'Velocidad de reproducción de Entrevista' })
    async function comprobarEtiquetaEncima() {
      await expect(velocidadAudio).toHaveCSS('flex-direction', 'column')
      await expect
        .poll(() => velocidadAudio.evaluate((grupo) => {
        const etiqueta = grupo.querySelector('span')!.getBoundingClientRect()
        const botones = grupo.querySelector('.estudio-audio-opciones')!.getBoundingClientRect()
        return etiqueta.bottom <= botones.top
        }))
        .toBe(true)
    }
    await comprobarEtiquetaEncima()
    await page.setViewportSize({ width: 1280, height: 900 })
    await comprobarEtiquetaEncima()
    await page.setViewportSize({ width: 390, height: 800 })
    await expect(velocidadAudio.getByRole('button', { name: 'Velocidad 1×' })).toHaveAttribute('aria-pressed', 'true')
    await velocidadAudio.getByRole('button', { name: 'Velocidad 2×' }).click()
    await expect(presentacion.locator('audio')).toHaveJSProperty('playbackRate', 2)
    await expect(velocidadAudio.getByRole('button', { name: 'Velocidad 2×' })).toHaveAttribute('aria-pressed', 'true')
    await velocidadAudio.getByRole('button', { name: 'Velocidad 3×' }).click()
    await expect(presentacion.locator('audio')).toHaveJSProperty('playbackRate', 3)
    await expect(presentacion.getByRole('heading', { name: 'Audio 1' })).toBeVisible()
    await expect(presentacion.getByRole('heading', { name: 'Documento 1' })).toBeVisible()
    await expect(presentacion.getByRole('heading', { name: 'Texto 1' })).toBeVisible()
    await expect(presentacion.getByRole('heading', { name: 'Video 1' })).toBeVisible()
    await expect(reproductor.locator('.icono-evidencia')).toHaveCount(0)

    await presentacion.getByRole('button', { name: 'Acciones de «informe.pdf»' }).click()
    const menuInforme = presentacion.getByRole('menu', { name: 'Acciones de informe.pdf' })
    await expect(menuInforme.getByRole('menuitem', { name: 'Descargar' })).toHaveAttribute('href', /download=informe\.pdf/)
    await page.keyboard.press('Escape')
    await expect(menuInforme).toBeHidden()
    await expect(presentacion).toBeVisible()
    await presentacion.getByRole('button', { name: 'Acciones de «informe.pdf»' }).click()
    await menuInforme.getByRole('menuitem', { name: 'Copiar enlace' }).click()
    await expect(page.getByText('Enlace copiado')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('e1/informe.pdf')

    await presentacion.getByRole('button', { name: 'Acciones de «Interior»' }).click()
    await presentacion.getByRole('menu', { name: 'Acciones de Interior' }).getByRole('menuitem', { name: 'Copiar enlace' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('e1/interior.jpg')

    await presentacion.getByRole('button', { name: 'Acciones de «Observación»' }).click()
    await presentacion.getByRole('menu', { name: 'Acciones de Observación' }).getByRole('menuitem', { name: 'Copiar texto' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('El local tiene una entrada lateral.')

    await presentacion.getByRole('button', { name: 'Acciones de «Recorrido»' }).click()
    await presentacion.getByRole('menu', { name: 'Acciones de Recorrido' }).getByRole('menuitem', { name: 'Copiar enlace' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://sharepoint.test/recorrido')
    await expect(presentacion).toContainText('El local tiene una entrada lateral.')

    await presentacion.getByRole('button', { name: 'Ampliar foto' }).click()
    const visor = page.getByRole('dialog', { name: 'Interior' })
    await expect(visor).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(visor).toBeHidden()
    await expect(presentacion).toBeVisible()

    await presentacion.getByRole('button', { name: 'Editar estudio' }).click()
    const formulario = page.getByRole('dialog', { name: 'Editar estudio' })
    await formulario.getByPlaceholder('Ej.: Entrevista al tendero').fill('Primera visita editada')
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Cambios guardados')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Primera visita editada' })).toBeVisible()
    expect(supabase.db.estudios.find((estudio) => estudio.id === 'e1')?.titulo).toBe('Primera visita editada')
  })

  test('editar un estudio y archivarlo, con "Deshacer"', async ({ page, entrar, supabase }) => {
    await entrar()
    await page.goto('/lugares/p1/estudios/e1')
    const historico = page.getByRole('region', { name: /Estudios/ })

    await page.getByRole('button', { name: 'Editar estudio' }).click()
    const formulario = page.getByRole('dialog', { name: 'Editar estudio' })
    await expect(formulario.getByRole('button', { name: 'Ana Gómez' })).toHaveAttribute('aria-pressed', 'true')
    await formulario.getByPlaceholder('Ej.: Entrevista al tendero').fill('Primera visita (mañana)')
    await formulario.getByRole('button', { name: 'Ana Gómez' }).click()
    await formulario.getByRole('button', { name: 'Beto' }).click()
    await formulario.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(toast(page, 'Cambios guardados')).toBeVisible()
    expect(supabase.db.estudios.find((e) => e.id === 'e1')).toEqual(expect.objectContaining({ titulo: 'Primera visita (mañana)', hora_inicio: '09:00' }))
    expect(supabase.db.estudio_participantes.filter((p) => p.estudio_id === 'e1').map((p) => p.usuario_id)).toEqual(['u-beto'])

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
