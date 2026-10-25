import type { CamposPunto } from './api'

/** La misma regla que ubicaciones_telefono_valido en la base de datos. */
const TELEFONO_VALIDO = /^\+?[0-9 ()-]{7,20}$/

/** Errores de los campos de un punto (null si el campo está bien). */
export function erroresDePunto(campos: CamposPunto) {
  const telefono = campos.contactoTelefono.trim()
  return {
    nombre: campos.nombre.trim() ? null : 'Escribe el nombre del lugar.',
    telefono: !telefono || TELEFONO_VALIDO.test(telefono) ? null : 'Escribe solo números, espacios, paréntesis o guiones (7 a 20).',
  }
}

export const hayErroresDePunto = (campos: CamposPunto) => Object.values(erroresDePunto(campos)).some(Boolean)
