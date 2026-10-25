import { useMemo } from 'react'
import { dibujarAvatar } from './dibujoAvatar'
import './Avatar.css'

interface AvatarProps {
  semilla: string
  /** Tamaño en píxeles. */
  tamano?: number
}

/** Avatar dibujado de una cuenta (ver ./dibujoAvatar.ts). */
export function Avatar({ semilla, tamano = 44 }: AvatarProps) {
  const src = useMemo(() => dibujarAvatar(semilla), [semilla])
  return (
    <span className="avatar" style={{ width: tamano, height: tamano }} aria-hidden="true">
      <img src={src} alt="" width={tamano} height={tamano} draggable={false} />
    </span>
  )
}
