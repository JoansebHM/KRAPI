import './Avatar.css'

/**
 * Tonos oscuros derivados de la paleta de Kratos, para que las iniciales en blanco
 * siempre tengan buen contraste (todos superan 5:1).
 */
const COLORES_AVATAR = ['#0D34E9', '#6100DF', '#0461CC', '#067647', '#0E7090', '#C11574', '#B54708', '#475467']

function colorPara(nombre: string) {
  let hash = 0
  for (const caracter of nombre) hash = (hash * 31 + caracter.charCodeAt(0)) >>> 0
  return COLORES_AVATAR[hash % COLORES_AVATAR.length]
}

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : (partes[0] ?? '?').slice(0, 2)
  return letras.toUpperCase()
}

/** Círculo con las iniciales de la persona. El color sale del nombre, así que siempre es el mismo. */
export function Avatar({ nombre }: { nombre: string }) {
  return (
    <span className="avatar" style={{ background: colorPara(nombre) }} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  )
}
