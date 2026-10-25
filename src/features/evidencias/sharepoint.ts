/**
 * Por ahora los videos solo se aceptan de SharePoint (incluye Stream, que guarda sus videos ahí).
 * Se puede pegar el enlace o el código para insertar (<iframe src="…">): de ese se toma el src.
 * Mientras no se resuelva #22, el video se abre en otra pestaña.
 */
export function enlaceDeSharePoint(texto: string): string | null {
  const limpio = texto.trim()
  const src = limpio.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i)?.[1]
  const candidato = (src ?? limpio).replace(/&amp;/g, '&')
  try {
    const url = new URL(candidato)
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.sharepoint.com')) return null
    return url.toString()
  } catch {
    return null
  }
}
