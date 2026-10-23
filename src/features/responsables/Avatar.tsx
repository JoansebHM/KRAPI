import { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import * as croodles from '@dicebear/croodles'
import './Avatar.css'

/**
 * Avatar dibujado (DiceBear, estilo Croodles de vijay verma, licencia CC0).
 * Se genera en el dispositivo a partir de una semilla: la misma semilla siempre da el mismo dibujo.
 * Pelo en negro para que todo quede en blanco y negro.
 */
export function dibujarAvatar(semilla: string) {
  return createAvatar(croodles, { seed: semilla, topColor: ['000000'], baseColor: ['ffffff'] }).toDataUri()
}

/** Semilla nueva al azar, para proponer otro avatar. */
export function semillaAleatoria() {
  return Math.random().toString(36).slice(2, 10)
}

interface AvatarProps {
  semilla: string
  /** Tamaño en píxeles. */
  tamano?: number
}

export function Avatar({ semilla, tamano = 44 }: AvatarProps) {
  const src = useMemo(() => dibujarAvatar(semilla), [semilla])
  return (
    <span className="avatar" style={{ width: tamano, height: tamano }} aria-hidden="true">
      <img src={src} alt="" width={tamano} height={tamano} draggable={false} />
    </span>
  )
}
