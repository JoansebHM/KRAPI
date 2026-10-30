import { useState, type ImgHTMLAttributes } from 'react'
import './ImagenConCarga.css'

/**
 * Imagen que muestra un indicador de carga hasta que termina de descargar. Si falla, lo dice en vez de
 * dejar el recuadro vacío. Se reinicia sola cuando cambia `src` (el padre le pone `key={src}`).
 */
export function ImagenConCarga({ className, onLoad, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando')

  return (
    <>
      {estado === 'cargando' && <span className="imagen-cargando" role="status" aria-label="Cargando foto" />}
      {estado === 'error' && (
        <p className="imagen-error" role="status">
          No se pudo cargar esta foto.
        </p>
      )}
      <img
        {...props}
        className={className}
        draggable={false}
        style={{ ...props.style, opacity: estado === 'lista' ? 1 : 0 }}
        onLoad={(evento) => {
          setEstado('lista')
          onLoad?.(evento)
        }}
        onError={(evento) => {
          setEstado('error')
          onError?.(evento)
        }}
      />
    </>
  )
}
