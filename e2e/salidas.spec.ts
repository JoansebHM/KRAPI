import type { Page } from '@playwright/test'
import { expect, test, toast } from './soporte/fixtures'

const CENTRO = [-75.57402, 6.21293]
// Una manzana de unos 60 × 60 m alrededor del centro de Manila.
const MANZANA = [
  [CENTRO[0] - 0.0003, CENTRO[1] - 0.0003],
  [CENTRO[0] + 0.0003, CENTRO[1] - 0.0003],
  [CENTRO[0] + 0.0003, CENTRO[1] + 0.0003],
  [CENTRO[0] - 0.0003, CENTRO[1] + 0.0003],
  [CENTRO[0] - 0.0003, CENTRO[1] - 0.0003],
]

/** Arrastra el mapa: la mira queda sobre otro punto. */
async function moverMapa(page: Page, dx: number, dy: number) {
  const caja = (await page.locator('.maplibregl-canvas').boundingBox())!
  const [x, y] = [caja.x + caja.width / 2, caja.y + caja.height / 3]
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 6 })
  await page.mouse.up()
}

test.describe('Salidas y asignaciones', () => {
  test.beforeEach(async ({ page }) => {
    // Hoy es el 30 de octubre de 2026.
    await page.clock.setFixedTime(new Date('2026-10-30T15:00:00-05:00'))
  })

  test('un admin crea una salida, dibuja una zona y se la asigna a dos personas', async ({ page, entrar, supabase }) => {
    supabase.agregarCuenta({ usuario: 'beto', nombre: 'Beto Ruiz' })
    await entrar()
    await page.goto('/salidas')
    await expect(page.getByText('Aún no hay salidas')).toBeVisible()

    await page.getByRole('button', { name: 'Nueva salida' }).click()
    const formulario = page.getByRole('dialog', { name: 'Nueva salida' })
    await formulario.getByRole('button', { name: 'Crear salida' }).click()
    await expect(formulario.getByText(/Escribe un nombre/)).toBeVisible()
    await formulario.getByPlaceholder('Ej.: Salida del sábado').fill('Salida de octubre')
    await formulario.getByLabel('Hora de inicio').fill('14:00')
    await formulario.getByRole('button', { name: 'Crear salida' }).click()

    await expect(toast(page, 'Salida creada')).toBeVisible()
    const salida = supabase.db.salidas[0]
    expect(salida).toMatchObject({ nombre: 'Salida de octubre', fecha: '2026-10-30', hora_inicio: '14:00' })
    await expect(page).toHaveURL(new RegExp(`/salidas/${salida.id}$`))

    await page.getByRole('link', { name: 'Agregar zona' }).click()
    const agregar = page.getByRole('button', { name: 'Agregar esquina' })
    await agregar.click()
    await moverMapa(page, -80, 0)
    await agregar.click()
    await moverMapa(page, 0, -80)
    await agregar.click()
    await page.getByRole('button', { name: 'Terminar' }).click()

    const zona = page.getByRole('dialog', { name: 'Zona asignada' })
    await zona.getByPlaceholder('Ej.: Cuadrante norte').fill('Cuadrante norte')
    await zona.getByRole('button', { name: 'Asignar zona' }).click()
    await expect(zona.locator('.field-error')).toBeVisible()
    await zona.getByRole('button', { name: 'Ana Gómez' }).click()
    await zona.getByRole('button', { name: 'Beto Ruiz' }).click()
    await zona.getByRole('button', { name: 'Asignar zona' }).click()

    await expect(toast(page, 'Zona asignada')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/salidas/${salida.id}$`))
    const asignacion = supabase.db.asignaciones[0]
    expect(asignacion).toMatchObject({ salida_id: salida.id, nombre: 'Cuadrante norte' })
    expect((asignacion.forma as { coordinates: number[][][] }).coordinates[0]).toHaveLength(4)
    expect(supabase.db.asignacion_participantes.map((p) => p.usuario_id).sort()).toEqual(['u-ana', 'u-beto'])

    const tarjeta = page.locator('.salida-zona', { hasText: 'Cuadrante norte' })
    await expect(tarjeta.locator('.salida-persona')).toHaveCount(2)
    await expect(tarjeta).toContainText('Sin reportar')
  })

  test.describe('con una salida armada', () => {
    test.beforeEach(async ({ supabase }) => {
      supabase.agregarCuenta({ usuario: 'beto', nombre: 'Beto Ruiz' })
      supabase.db.salidas.push(
        { id: 's1', nombre: 'Salida de octubre', fecha: '2026-10-30', hora_inicio: '14:00:00', cancelada_en: null },
        { id: 's2', nombre: 'Salida de noviembre', fecha: '2026-11-06', hora_inicio: '09:00:00', cancelada_en: null },
      )
      supabase.db.asignaciones.push(
        { id: 'a1', salida_id: 's1', nombre: 'Cuadrante norte', forma: { type: 'Polygon', coordinates: [MANZANA] } },
        { id: 'a2', salida_id: 's2', nombre: 'Cuadrante sur', forma: { type: 'Polygon', coordinates: [MANZANA] } },
      )
      supabase.db.asignacion_participantes.push(
        { asignacion_id: 'a1', usuario_id: 'u-ana', hora_fin: null, porcentaje: null },
        { asignacion_id: 'a1', usuario_id: 'u-beto', hora_fin: null, porcentaje: null },
        { asignacion_id: 'a2', usuario_id: 'u-ana', hora_fin: null, porcentaje: null },
      )
    })

    test('cada persona ve sus zonas, reporta su hora de fin y su porcentaje, y no lo de otros', async ({ page, entrar, supabase }) => {
      await entrar('miembro')
      // El menú cuenta las zonas de hoy o de antes que faltan por reportar.
      await page.getByRole('button', { name: 'Abrir menú' }).click()
      await expect(page.getByRole('link', { name: /Mis asignaciones/ })).toContainText('1')
      await page.getByRole('link', { name: /Mis asignaciones/ }).click()

      const norte = page.locator('.salida-zona', { hasText: 'Cuadrante norte' })
      const sur = page.locator('.salida-zona', { hasText: 'Cuadrante sur' })
      await expect(norte).toContainText('Sin reportar')
      // La de la próxima semana todavía no se reporta.
      await expect(sur).toContainText('Programada')
      await expect(sur.getByRole('button', { name: 'Reportar' })).toHaveCount(0)

      await norte.getByRole('button', { name: 'Reportar' }).click()
      const reporte = page.getByRole('dialog', { name: 'Reportar: Cuadrante norte' })
      await reporte.getByRole('button', { name: 'Guardar reporte' }).click()
      await expect(reporte.getByText('Elige un porcentaje.')).toBeVisible()
      await reporte.getByLabel('¿A qué hora terminaste?').fill('16:30')
      await reporte.getByRole('button', { name: '75 %' }).click()
      await reporte.getByRole('button', { name: 'Guardar reporte' }).click()

      await expect(toast(page, 'Reporte guardado')).toBeVisible()
      expect(supabase.db.asignacion_participantes.find((p) => p.asignacion_id === 'a1' && p.usuario_id === 'u-ana')).toMatchObject({ hora_fin: '16:30', porcentaje: 75 })
      expect(supabase.db.asignacion_participantes.find((p) => p.usuario_id === 'u-beto')).toMatchObject({ porcentaje: null })
      await expect(norte).toContainText('75 % · terminó')
      await expect(norte.getByRole('button', { name: 'Corregir reporte' })).toBeVisible()

      // En la salida solo puede reportar lo suyo y no la arma.
      await norte.getByRole('link', { name: 'Ver la salida completa' }).click()
      const beto = page.locator('.salida-persona', { hasText: 'Beto Ruiz' })
      await expect(beto).toContainText('Sin reportar')
      await expect(beto.getByRole('button')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Editar salida' })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Agregar zona' })).toHaveCount(0)
    })

    test('"Ver en el mapa" encuadra la zona y muestra quiénes la cubren', async ({ page, entrar }) => {
      await entrar('miembro')
      await page.goto('/salidas/s1')
      await page.locator('.salida-zona', { hasText: 'Cuadrante norte' }).getByRole('link', { name: 'Ver en el mapa' }).click()
      await expect(page).toHaveURL(/\/salidas\/s1\/zonas\/a1$/)
      const tarjeta = page.locator('.ver-asignacion')
      await expect(tarjeta).toContainText('Cuadrante norte')
      await expect(tarjeta).toContainText('Ana Gómez')
      await expect(tarjeta).toContainText('Beto Ruiz')
    })

    test('tocar la zona asignada en el mapa abre su información', async ({ page, entrar }) => {
      // Desde el mapa (sin un panel encima), se ven las zonas de las salidas de hoy.
      await entrar('miembro')
      const mapa = (await page.locator('.map-view').boundingBox())!
      // La zona está en el centro del mapa. Se reintenta hasta que el mapa termine de dibujarla.
      await expect(async () => {
        await page.mouse.click(mapa.x + mapa.width / 2, mapa.y + mapa.height / 2)
        await expect(page).toHaveURL(/\/salidas\/s1\/zonas\/a1$/, { timeout: 500 })
      }).toPass()
      await expect(page.locator('.ver-asignacion')).toContainText('Cuadrante norte')
    })

    test('un admin cancela y reactiva la salida, y quita una zona con sus asignaciones', async ({ page, entrar, supabase }) => {
      await entrar()
      await page.goto('/salidas')
      await expect(page.getByRole('region', { name: 'Próximas' })).toContainText('Salida de octubre')
      await page.getByRole('link', { name: /Salida de octubre/ }).click()

      await page.getByRole('button', { name: 'Cancelar salida' }).click()
      await page.getByRole('dialog', { name: '¿Cancelar «Salida de octubre»?' }).getByRole('button', { name: 'Cancelar salida' }).click()
      await expect(toast(page, 'Salida cancelada')).toBeVisible()
      expect(supabase.db.salidas.find((s) => s.id === 's1')!.cancelada_en).not.toBeNull()
      await expect(page.getByText('Esta salida se canceló.')).toBeVisible()
      await expect(page.locator('.salida-zona').first()).toContainText('Salida cancelada')

      await page.getByRole('button', { name: 'Reactivar' }).click()
      await expect(toast(page, 'Salida reactivada')).toBeVisible()
      expect(supabase.db.salidas.find((s) => s.id === 's1')!.cancelada_en).toBeNull()

      await page.getByRole('button', { name: 'Quitar zona' }).click()
      await page.getByRole('dialog', { name: '¿Quitar «Cuadrante norte»?' }).getByRole('button', { name: 'Quitar zona' }).click()
      await expect(toast(page, 'Zona quitada')).toBeVisible()
      expect(supabase.db.asignaciones.map((a) => a.id)).toEqual(['a2'])
      expect(supabase.db.asignacion_participantes.map((p) => p.asignacion_id)).toEqual(['a2'])
    })

    test('un admin cambia a quiénes se asignó una zona y quien sigue conserva su reporte', async ({ page, entrar, supabase }) => {
      supabase.db.asignacion_participantes[0].porcentaje = 50
      supabase.db.asignacion_participantes[0].hora_fin = '16:00:00'
      await entrar()
      await page.goto('/salidas/s1')
      await page.getByRole('button', { name: 'Editar zona' }).click()
      const formulario = page.getByRole('dialog', { name: 'Editar zona asignada' })
      await formulario.getByRole('button', { name: 'Beto Ruiz' }).click()
      await formulario.getByRole('button', { name: 'Admin Kratos' }).click()
      await formulario.getByRole('button', { name: 'Guardar cambios' }).click()

      await expect(toast(page, 'Cambios guardados')).toBeVisible()
      const enA1 = supabase.db.asignacion_participantes.filter((p) => p.asignacion_id === 'a1')
      expect(enA1.map((p) => p.usuario_id).sort()).toEqual(['u-admin', 'u-ana'])
      expect(enA1.find((p) => p.usuario_id === 'u-ana')).toMatchObject({ porcentaje: 50 })
    })

    test('el recorrido se registra como zona del mapa con la forma y el nombre de la asignación', async ({ page, entrar, supabase }) => {
      await entrar('miembro')
      await page.goto('/salidas/s1')
      await page.getByRole('link', { name: 'Registrar el recorrido como zona del mapa' }).click()

      const formulario = page.getByRole('dialog', { name: 'Nueva zona' })
      await expect(formulario.getByPlaceholder('Ej.: Manzana del parque')).toHaveValue('Cuadrante norte')
      await formulario.getByRole('button', { name: 'Guardar zona' }).click()

      await expect(toast(page, 'Zona guardada')).toBeVisible()
      const zona = supabase.db.ubicaciones.find((u) => u.nombre === 'Cuadrante norte')!
      expect(zona).toMatchObject({ tipo: 'zona' })
      expect((zona.geom as { coordinates: number[][][] }).coordinates[0]).toHaveLength(5)
    })

    test('un miembro no puede abrir la pantalla para dibujar zonas de una salida', async ({ page, entrar }) => {
      await entrar('miembro')
      await page.goto('/salidas/s1/zonas/nueva')
      await expect(page).toHaveURL(/\/salidas$/)
      await expect(page.getByRole('button', { name: 'Nueva salida' })).toHaveCount(0)
    })
  })

  test.describe('la evidencia de la salida son los estudios, no un sistema aparte', () => {
    test.beforeEach(async ({ supabase }) => {
      supabase.db.categorias.push({ id: 'c1', nombre: 'Café', color: '#9E7AE1', icono: 'cafe' })
      supabase.db.ubicaciones.push({
        id: 'p1',
        tipo: 'punto',
        nombre: 'Café Central',
        categoria_id: 'c1',
        estado: 'activa',
        geom: { type: 'Point', coordinates: [-75.576, 6.214] },
      })
    })

    test('con una zona asignada hoy, el formulario del estudio trae la salida elegida y queda ligado', async ({ page, entrar, supabase }) => {
      supabase.db.salidas.push({ id: 's1', nombre: 'Salida de octubre', fecha: '2026-10-30', hora_inicio: '14:00:00', cancelada_en: null })
      supabase.db.asignaciones.push({ id: 'a1', salida_id: 's1', nombre: 'Cuadrante norte', forma: { type: 'Polygon', coordinates: [MANZANA] } })
      supabase.db.asignacion_participantes.push({ asignacion_id: 'a1', usuario_id: 'u-ana', hora_fin: null, porcentaje: null })

      await entrar('miembro')
      await page.goto('/lugares/p1')
      await page.getByRole('button', { name: 'Agregar estudio' }).click()

      const formulario = page.getByRole('dialog', { name: 'Nuevo estudio' })
      await expect(formulario.getByRole('button', { name: 'Salida de octubre' })).toHaveAttribute('aria-pressed', 'true')
      await formulario.getByPlaceholder('Ej.: Entrevista al tendero').fill('Levantamiento')
      await formulario.getByRole('button', { name: 'Guardar estudio' }).click()

      await expect(toast(page, 'Estudio guardado')).toBeVisible()
      expect(supabase.db.estudios.find((e) => e.titulo === 'Levantamiento')).toMatchObject({ salida_id: 's1' })

      // Y aparece en la salida, con enlace a su página.
      await page.goto('/salidas/s1')
      const registrado = page.locator('.lista-item', { hasText: 'Levantamiento' })
      await expect(registrado).toContainText('Punto · Café Central')
      await registrado.click()
      await expect(page).toHaveURL(/\/lugares\/p1\/estudios\//)
      await expect(page.getByRole('link', { name: 'Salida de octubre' })).toBeVisible()
    })

    test('sin una zona asignada hoy, el formulario no muestra el campo de salida', async ({ page, entrar }) => {
      await entrar('miembro')
      await page.goto('/lugares/p1')
      await page.getByRole('button', { name: 'Agregar estudio' }).click()
      const formulario = page.getByRole('dialog', { name: 'Nuevo estudio' })
      await expect(formulario.getByText('Salida')).toHaveCount(0)
    })

    test('se puede quitar la salida elegida, y se puede ligar un estudio ya existente al editarlo', async ({ page, entrar, supabase }) => {
      supabase.db.salidas.push({ id: 's1', nombre: 'Salida de octubre', fecha: '2026-10-30', hora_inicio: '14:00:00', cancelada_en: null })
      supabase.db.asignaciones.push({ id: 'a1', salida_id: 's1', nombre: 'Cuadrante norte', forma: { type: 'Polygon', coordinates: [MANZANA] } })
      supabase.db.asignacion_participantes.push({ asignacion_id: 'a1', usuario_id: 'u-ana', hora_fin: null, porcentaje: null })
      supabase.db.estudios.push({ id: 'e1', ubicacion_id: 'p1', fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', titulo: 'Visita anterior', archivado_en: null })

      await entrar('miembro')
      await page.goto('/lugares/p1')
      await page.getByRole('button', { name: 'Agregar estudio' }).click()
      const nuevo = page.getByRole('dialog', { name: 'Nuevo estudio' })
      await nuevo.getByRole('button', { name: 'Ninguna' }).click()
      await nuevo.getByPlaceholder('Ej.: Entrevista al tendero').fill('Visita sin salida')
      await nuevo.getByRole('button', { name: 'Guardar estudio' }).click()
      await expect(toast(page, 'Estudio guardado')).toBeVisible()
      expect(supabase.db.estudios.find((e) => e.titulo === 'Visita sin salida')).toMatchObject({ salida_id: null })

      // Guardar un estudio nuevo lleva a su propia página; se vuelve a la ficha del lugar.
      await page.goto('/lugares/p1')
      // La visita anterior no estaba ligada a nada: se le liga la salida al editarla.
      await page.getByRole('button', { name: /Visita anterior/ }).click()
      await page.getByRole('button', { name: 'Editar estudio' }).click()
      const edicion = page.getByRole('dialog', { name: 'Editar estudio' })
      await edicion.getByRole('button', { name: 'Salida de octubre' }).click()
      await edicion.getByRole('button', { name: 'Guardar cambios' }).click()
      await expect(toast(page, 'Cambios guardados')).toBeVisible()
      expect(supabase.db.estudios.find((e) => e.id === 'e1')).toMatchObject({ salida_id: 's1' })
    })

    test('una salida cancelada no se ofrece para ligar un estudio nuevo', async ({ page, entrar, supabase }) => {
      supabase.db.salidas.push({ id: 's1', nombre: 'Salida cancelada', fecha: '2026-10-30', hora_inicio: '14:00:00', cancelada_en: '2026-10-30T10:00:00Z' })
      supabase.db.asignaciones.push({ id: 'a1', salida_id: 's1', nombre: 'Cuadrante norte', forma: { type: 'Polygon', coordinates: [MANZANA] } })
      supabase.db.asignacion_participantes.push({ asignacion_id: 'a1', usuario_id: 'u-ana', hora_fin: null, porcentaje: null })

      await entrar('miembro')
      await page.goto('/lugares/p1')
      await page.getByRole('button', { name: 'Agregar estudio' }).click()
      const formulario = page.getByRole('dialog', { name: 'Nuevo estudio' })
      await expect(formulario.getByText('Salida')).toHaveCount(0)
    })
  })

  test.describe('la misma zona cubierta en más de una salida', () => {
    test('se registra como zona del mapa una vez; la siguiente salida reusa su forma y le agrega un estudio', async ({ page, entrar, supabase }) => {
      // Dos salidas, en fechas distintas, con el mismo cuadrante asignado a la cuenta propia.
      supabase.db.salidas.push(
        { id: 's1', nombre: 'Salida del 1', fecha: '2026-10-01', hora_inicio: '14:00:00', cancelada_en: null },
        { id: 's2', nombre: 'Salida del 2', fecha: '2026-11-01', hora_inicio: '14:00:00', cancelada_en: null },
      )
      supabase.db.asignaciones.push({ id: 'a1', salida_id: 's1', nombre: 'Cuadrante norte', forma: { type: 'Polygon', coordinates: [MANZANA] } })
      supabase.db.asignacion_participantes.push({ asignacion_id: 'a1', usuario_id: 'u-admin', hora_fin: null, porcentaje: null })

      await entrar()

      // Primera vez: se registra el recorrido como zona del mapa.
      await page.goto('/salidas/s1')
      await page.getByRole('link', { name: 'Registrar el recorrido como zona del mapa' }).click()
      await page.getByRole('dialog', { name: 'Nueva zona' }).getByRole('button', { name: 'Guardar zona' }).click()
      await expect(toast(page, 'Zona guardada')).toBeVisible()
      expect(supabase.db.ubicaciones.filter((u) => u.nombre === 'Cuadrante norte')).toHaveLength(1)
      const zonaId = supabase.db.asignaciones.find((a) => a.id === 'a1')!.zona_id as string
      expect(zonaId).toBeTruthy()

      // Segunda salida: al crear su asignación, se ofrece usar la forma de la anterior.
      await page.goto('/salidas/s2/zonas/nueva')
      const elegir = page.getByRole('dialog', { name: '¿Ya se cubrió esta zona antes?' })
      await elegir.getByRole('button', { name: /Cuadrante norte/ }).click()

      const formulario = page.getByRole('dialog', { name: 'Zona asignada' })
      await expect(formulario.getByPlaceholder('Ej.: Cuadrante norte')).toHaveValue('Cuadrante norte')
      await formulario.getByRole('button', { name: 'Admin Kratos' }).click()
      await formulario.getByRole('button', { name: 'Asignar zona' }).click()
      await expect(toast(page, 'Zona asignada')).toBeVisible()

      // La nueva asignación quedó ligada a la misma zona del mapa, no a una nueva.
      const a2 = supabase.db.asignaciones.find((a) => a.salida_id === 's2')!
      expect(a2.zona_id).toBe(zonaId)
      expect(supabase.db.ubicaciones.filter((u) => u.nombre === 'Cuadrante norte')).toHaveLength(1)

      // En la salida 2, el botón ya no ofrece crear una zona: agrega un estudio a la que existe.
      await page.goto('/salidas/s2')
      const enlace = page.getByRole('link', { name: /Agregar estudio a la zona del mapa/ })
      await expect(enlace).toContainText('Cuadrante norte')
      await enlace.click()

      const estudio = page.getByRole('dialog', { name: 'Nuevo estudio' })
      await expect(estudio.getByRole('button', { name: 'Salida del 2' })).toHaveAttribute('aria-pressed', 'true')
      await estudio.getByPlaceholder('Ej.: Entrevista al tendero').fill('Recorrido de noviembre')
      await estudio.getByRole('button', { name: 'Guardar estudio' }).click()
      await expect(toast(page, 'Estudio guardado')).toBeVisible()

      const nuevoEstudio = supabase.db.estudios.find((e) => e.titulo === 'Recorrido de noviembre')!
      expect(nuevoEstudio).toMatchObject({ ubicacion_id: zonaId, salida_id: 's2' })
    })
  })
})
