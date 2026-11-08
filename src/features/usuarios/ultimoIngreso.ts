import { plural } from '../../lib/texto'
import { mostrarFechaDe } from '../estudios/campos'

/**
 * Cómo se muestra el último ingreso de una cuenta (decisión 0037). Es la última vez que la persona
 * inició sesión, no su última actividad: con sesiones de hasta 7 días, quien usa la app a diario
 * puede haber iniciado sesión hace días.
 */

const MINUTO = 60 * 1000
const HORA = 60 * MINUTO
const DIA = 24 * HORA

const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })

/** "hace 3 h", "hace 2 días"; pasada una semana, la fecha ("30 oct 2026"). */
export function haceCuanto(momento: string, ahora = Date.now()): string {
  const diferencia = Math.max(0, ahora - new Date(momento).getTime())
  if (diferencia < MINUTO) return 'hace un momento'
  if (diferencia < HORA) return `hace ${Math.floor(diferencia / MINUTO)} min`
  if (diferencia < DIA) return `hace ${Math.floor(diferencia / HORA)} h`
  if (diferencia < 7 * DIA) return `hace ${plural(Math.floor(diferencia / DIA), 'día', 'días')}`
  return mostrarFechaDe(momento)
}

/** "7 nov 2026 · 6:30 p. m." en la hora local. */
export function fechaYHora(momento: string): string {
  return `${mostrarFechaDe(momento)} · ${formatoHora.format(new Date(momento))}`
}

/** Para la lista: "ingresó hace 3 h" o "nunca ha ingresado". */
export function textoDeIngreso(momento: string | null | undefined): string {
  return momento ? `ingresó ${haceCuanto(momento)}` : 'nunca ha ingresado'
}
