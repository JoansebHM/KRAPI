const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

/** Ordena alfabéticamente en español (sin importar mayúsculas ni tildes). */
export function compararTexto(a: string, b: string) {
  return collator.compare(a, b)
}

/** Para buscar sin importar mayúsculas, tildes ni espacios sobrantes. */
export function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/** "1 ubicación", "3 ubicaciones". */
export function plural(cantidad: number, singular: string, pluralTexto = `${singular}s`) {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`
}
