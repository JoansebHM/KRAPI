/** Lado mayor de las fotos subidas: suficiente para leer un letrero o ver una fachada en detalle. */
const LADO_MAXIMO = 2048
const CALIDAD_JPEG = 0.82

/**
 * Reduce y comprime una foto a JPEG antes de subirla. Devuelve la original si el navegador no
 * puede leerla (por ejemplo, HEIC fuera de Safari) o si ya era pequeña y comprimirla no la aliviana.
 */
export async function comprimirFoto(foto: File): Promise<File> {
  let imagen: ImageBitmap
  try {
    imagen = await createImageBitmap(foto, { imageOrientation: 'from-image' })
  } catch {
    return foto
  }

  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height))
    const ancho = Math.round(imagen.width * escala)
    const alto = Math.round(imagen.height * escala)
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const contexto = lienzo.getContext('2d')
    if (!contexto) return foto
    // Fondo blanco para las PNG con transparencia, que en JPEG quedarían negras.
    contexto.fillStyle = '#ffffff'
    contexto.fillRect(0, 0, ancho, alto)
    contexto.drawImage(imagen, 0, 0, ancho, alto)

    const comprimida = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', CALIDAD_JPEG))
    if (!comprimida || (escala === 1 && comprimida.size >= foto.size)) return foto
    const nombre = foto.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([comprimida], nombre, { type: 'image/jpeg', lastModified: foto.lastModified })
  } finally {
    imagen.close()
  }
}
