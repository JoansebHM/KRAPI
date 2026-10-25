import { writeFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

const PDF = { name: 'informe.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 informe') }

test.describe('Evidencias', () => {
  test.beforeEach(async ({ supabase }) => {
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: null, estado: 'activa', geom: { type: 'Point', coordinates: [-75.576, 6.214] } })
    supabase.db.estudios.push({ id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', titulo: 'Primera visita', entrevistado: null, archivado_en: null })
  })

  /** Abre "Agregar evidencia" en la página del estudio y devuelve el diálogo. */
  async function abrirAgregar(page: Page) {
    await page.goto('/lugares/p1/estudios/e1')
    await page.getByRole('button', { name: 'Agregar evidencia' }).click()
    return page.getByRole('dialog', { name: 'Agregar evidencia' })
  }

  const evidencias = (page: Page) => page.getByRole('region', { name: /Evidencias/ })

  test('una foto grande se reduce a JPEG antes de subirla', async ({ page, entrar, supabase }) => {
    await entrar()
    // Una foto de 3000 × 2000 en PNG, dibujada en el navegador.
    const foto = await page.evaluate(async () => {
      const lienzo = document.createElement('canvas')
      lienzo.width = 3000
      lienzo.height = 2000
      const contexto = lienzo.getContext('2d')!
      const degradado = contexto.createLinearGradient(0, 0, 3000, 2000)
      degradado.addColorStop(0, '#0d34e9')
      degradado.addColorStop(1, '#f5ff3c')
      contexto.fillStyle = degradado
      contexto.fillRect(0, 0, 3000, 2000)
      return lienzo.toDataURL('image/png').split(',')[1]
    })
    const dialogo = await abrirAgregar(page)
    await expect(dialogo.locator('input[capture="environment"]')).toHaveAttribute('accept', 'image/*')

    await dialogo.locator('input[type="file"][multiple]').setInputFiles({ name: 'Fachada día 1.png', mimeType: 'image/png', buffer: Buffer.from(foto, 'base64') })

    await expect(dialogo).toBeHidden()
    const enlace = evidencias(page).getByRole('link', { name: /Fachada día 1\.jpg/ })
    await expect(enlace).toBeVisible()
    await expect(enlace).toContainText('Foto ·')
    await expect(enlace).toHaveAttribute('target', '_blank')
    await expect(enlace).toHaveAttribute('href', /\/storage\/v1\/object\/sign\/evidencias\/e1\//)

    const [evidencia] = supabase.db.evidencias
    expect(evidencia).toEqual(
      expect.objectContaining({ estudio_id: 'e1', tipo: 'foto', archivo_nombre: 'Fachada día 1.jpg', archivo_mime: 'image/jpeg', proveedor: 'supabase' }),
    )
    // Ruta segura en el bucket: <estudio>/<uuid>-<nombre sin tildes ni espacios>
    expect(evidencia.archivo_path).toMatch(/^e1\/[0-9a-f-]{36}-Fachada-dia-1\.jpg$/)
    expect(supabase.archivos.get(String(evidencia.archivo_path))).toEqual(expect.objectContaining({ tipo: 'image/jpeg', bytes: evidencia.archivo_bytes }))
    // El lado mayor queda en 2048 px, sin deformarla.
    const dimensiones = await page.evaluate(async (url) => {
      const imagen = await createImageBitmap(await (await fetch(url)).blob())
      return [imagen.width, imagen.height]
    }, (await enlace.getAttribute('href'))!)
    expect(dimensiones).toEqual([2048, 1365])
  })

  test('varios archivos a la vez: se suben los permitidos y los demás muestran por qué no', async ({ page, entrar, supabase }) => {
    await entrar()
    const dialogo = await abrirAgregar(page)
    await dialogo.locator('input[type="file"][multiple]').setInputFiles([
      PDF,
      // Sin tipo informado: se reconoce por la extensión.
      { name: 'Entrevista.docx', mimeType: '', buffer: Buffer.from('docx') },
      { name: 'Tendero.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('mp3') },
      { name: 'animacion.gif', mimeType: 'image/gif', buffer: Buffer.from('gif') },
    ])

    const lista = evidencias(page)
    await expect(lista.getByRole('link')).toHaveCount(3)
    await expect(lista.getByRole('link', { name: /informe\.pdf/ })).toContainText('Documento')
    await expect(lista.getByRole('link', { name: /Entrevista\.docx/ })).toContainText('Documento')
    await expect(lista.getByRole('link', { name: /Tendero\.mp3/ })).toContainText('Audio')
    await expect(lista).toContainText('Evidencias · 3')
    expect(supabase.db.evidencias.map((e) => [e.archivo_nombre, e.tipo, e.archivo_mime])).toEqual([
      ['informe.pdf', 'documento', 'application/pdf'],
      ['Entrevista.docx', 'documento', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['Tendero.mp3', 'audio', 'audio/mpeg'],
    ])

    const subidas = page.getByRole('list', { name: 'Subidas' })
    await expect(subidas).toContainText('animacion.gif')
    await expect(subidas).toContainText('Solo se pueden subir fotos, audios, PDF, Word o Excel.')
    await expect(subidas.getByRole('button', { name: /Reintentar/ })).toHaveCount(0)
    await subidas.getByRole('button', { name: 'Descartar «animacion.gif»' }).click()
    await expect(subidas).toBeHidden()
  })

  test('no sube archivos de más de 50 MB', async ({ page, entrar, supabase }, info) => {
    const grande = info.outputPath('grande.pdf')
    await writeFile(grande, Buffer.alloc(50 * 1024 * 1024 + 1))
    await entrar()
    const dialogo = await abrirAgregar(page)
    await dialogo.locator('input[type="file"][multiple]').setInputFiles(grande)

    await expect(page.getByRole('list', { name: 'Subidas' })).toContainText('Pesa más de 50 MB, el máximo permitido.')
    expect(supabase.archivos.size).toBe(0)
    expect(supabase.db.evidencias).toHaveLength(0)
  })

  test('si la subida falla, se avisa y se puede reintentar', async ({ page, entrar, supabase }) => {
    supabase.fallarSubidas = true
    await entrar()
    const dialogo = await abrirAgregar(page)
    await dialogo.locator('input[type="file"][multiple]').setInputFiles(PDF)

    await expect(toast(page, 'No se pudo subir «informe.pdf»')).toBeVisible()
    const subidas = page.getByRole('list', { name: 'Subidas' })
    await expect(subidas).toContainText('No se pudo completar la subida. Reintenta.')
    expect(supabase.db.evidencias).toHaveLength(0)

    supabase.fallarSubidas = false
    await subidas.getByRole('button', { name: 'Reintentar «informe.pdf»' }).click()
    await expect(evidencias(page).getByRole('link', { name: /informe\.pdf/ })).toBeVisible()
    await expect(subidas).toBeHidden()
    expect(supabase.db.evidencias).toHaveLength(1)
  })

  test('si no se puede registrar la evidencia, su archivo no queda en el bucket', async ({ page, entrar, supabase }) => {
    await entrar()
    // La tabla rechaza la evidencia (por ejemplo, porque el estudio ya no existe).
    await page.route('**/rest/v1/evidencias*', (ruta) =>
      ruta.request().method() === 'POST' ? ruta.fulfill({ status: 409, json: { code: '23503', message: 'foreign key violation' } }) : ruta.fallback(),
    )
    const dialogo = await abrirAgregar(page)
    await dialogo.locator('input[type="file"][multiple]').setInputFiles(PDF)

    await expect(toast(page, 'No se pudo subir «informe.pdf»')).toBeVisible()
    await expect.poll(() => supabase.archivos.size).toBe(0)
    expect(supabase.peticiones.some((p) => p.startsWith('POST /storage/v1/object/evidencias/e1/'))).toBe(true)
  })

  test('borrar una evidencia equivocada pide confirmación y borra también su archivo', async ({ page, entrar, supabase }) => {
    supabase.archivos.set('e1/a1-fachada.jpg', { tipo: 'image/jpeg', bytes: 2_400_000 })
    supabase.db.evidencias.push({
      id: 'v1',
      estudio_id: 'e1',
      tipo: 'foto',
      titulo: null,
      archivo_path: 'e1/a1-fachada.jpg',
      archivo_nombre: 'fachada.jpg',
      archivo_mime: 'image/jpeg',
      archivo_bytes: 2_400_000,
      proveedor: 'supabase',
      created_at: '2026-10-20T15:00:00Z',
    })
    await entrar()
    await page.goto('/lugares/p1/estudios/e1')
    await expect(evidencias(page).getByRole('link', { name: /fachada\.jpg/ })).toContainText('Foto · 2,3 MB')

    await evidencias(page).getByRole('button', { name: 'Borrar «fachada.jpg»' }).click()
    const confirmacion = page.getByRole('dialog', { name: '¿Borrar esta evidencia?' })
    await expect(confirmacion).toContainText('No se puede deshacer.')
    await confirmacion.getByRole('button', { name: 'Cancelar' }).click()
    expect(supabase.db.evidencias).toHaveLength(1)

    await evidencias(page).getByRole('button', { name: 'Borrar «fachada.jpg»' }).click()
    await confirmacion.getByRole('button', { name: 'Borrar' }).click()
    await expect(toast(page, 'Evidencia borrada')).toBeVisible()
    await expect(evidencias(page)).toContainText('Aún no hay evidencias')
    expect(supabase.db.evidencias).toHaveLength(0)
    expect(supabase.archivos.size).toBe(0)
  })

  test('un miembro no puede borrar evidencias de otros: se explica y no toca el archivo', async ({ page, entrar, supabase }) => {
    supabase.archivos.set('e1/a1-informe.pdf', { tipo: 'application/pdf', bytes: 1000, dueno: 'u-admin' })
    supabase.db.evidencias.push({
      id: 'v1',
      estudio_id: 'e1',
      tipo: 'documento',
      titulo: null,
      archivo_path: 'e1/a1-informe.pdf',
      archivo_nombre: 'informe.pdf',
      archivo_mime: 'application/pdf',
      archivo_bytes: 1000,
      proveedor: 'supabase',
      created_at: '2026-10-20T15:00:00Z',
      creado_por: 'u-admin',
    })
    await entrar('miembro')
    await page.goto('/lugares/p1/estudios/e1')

    await evidencias(page).getByRole('button', { name: 'Borrar «informe.pdf»' }).click()
    await page.getByRole('dialog', { name: '¿Borrar esta evidencia?' }).getByRole('button', { name: 'Borrar' }).click()
    await expect(toast(page, 'No se pudo borrar')).toContainText('Solo quien la subió o un admin puede borrarla.')
    await expect(evidencias(page).getByRole('link', { name: /informe\.pdf/ })).toBeVisible()
    expect(supabase.db.evidencias).toHaveLength(1)
    expect(supabase.archivos.size).toBe(1)
  })
})

test.describe('Evidencias: grabar audio', () => {
  // El micrófono es simulado (ver playwright.config.ts).
  test.use({ permissions: ['microphone'] })

  test('graba un audio en la app, se escucha y se sube', async ({ page, entrar, supabase }) => {
    supabase.db.ubicaciones.push({ id: 'p1', tipo: 'punto', nombre: 'Café Central', categoria_id: null, estado: 'activa', geom: { type: 'Point', coordinates: [-75.576, 6.214] } })
    supabase.db.estudios.push({ id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', titulo: 'Primera visita', entrevistado: null, archivado_en: null })
    await entrar()
    await page.goto('/lugares/p1/estudios/e1')
    await page.getByRole('button', { name: 'Agregar evidencia' }).click()
    await page.getByRole('dialog', { name: 'Agregar evidencia' }).getByRole('button', { name: /Grabar audio/ }).click()

    const grabador = page.getByRole('dialog', { name: 'Grabar audio' })
    await grabador.getByRole('button', { name: 'Empezar a grabar' }).click()
    await expect(grabador.getByRole('status')).toContainText('Grabando')
    await expect(grabador.getByRole('status')).toContainText('0:01')
    await grabador.getByRole('button', { name: 'Detener' }).click()
    await expect(grabador.locator('audio')).toBeVisible()
    await grabador.getByRole('button', { name: 'Subir audio' }).click()

    await expect(page.getByRole('region', { name: /Evidencias/ }).getByRole('link', { name: /^Audio .*\.webm/ })).toBeVisible()
    expect(supabase.db.evidencias).toEqual([expect.objectContaining({ tipo: 'audio', archivo_mime: 'audio/webm' })])
  })
})
